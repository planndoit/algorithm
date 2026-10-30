import "server-only";
import { randomUUID } from "node:crypto";
import { query } from "@/lib/db";
import {
  type Candidate,
  type Settings,
  type SourceResult,
  kstDay,
} from "./model";
import { collectBluesky, collectYoutube } from "./sources";
import { instagramConfig, InstagramError } from "./instagram";
import { instagramSource } from "./instagram-server";
export async function runCollection(trigger: "cron" | "manual") {
  const now = new Date();
  const [claimed] = await query<{ id: string | null }>(
    "select public.claim_collection($1,$2) id",
    [
      trigger === "cron" ? `cron:${kstDay(now)}` : `manual:${randomUUID()}`,
      trigger,
    ],
  );
  if (!claimed.id) return { status: "busy" as const };
  const id = claimed.id;
  const results: SourceResult[] = [];
  try {
    const [settings] = await query<Settings>(
      "select enabled,keywords,daily_limit,bluesky_min_engagement,youtube_min_views,instagram_hashtags,instagram_min_likes from public.collection_settings where id=true",
    );
    if (!settings?.enabled) {
      await query(
        "update public.collection_runs set status='skipped',finished_at=now(),error='관리자가 자동 수집을 일시정지했습니다.' where id=$1",
        [id],
      );
      return { status: "skipped" as const };
    }
    const sources = [
      { name: "Bluesky", run: () => collectBluesky(settings, now) },
      ...(instagramConfig(process.env)
        ? [{ name: "Instagram", run: () => instagramSource(settings, now) }]
        : []),
      ...(process.env.YOUTUBE_API_KEY
        ? [
            {
              name: "YouTube",
              run: () =>
                collectYoutube(settings, now, process.env.YOUTUBE_API_KEY!),
            },
          ]
        : []),
    ];
    if (!process.env.YOUTUBE_API_KEY)
      results.push({
        source: "YouTube",
        status: "unconfigured",
        found: 0,
        message: "YouTube Data API 키를 연결하면 수집이 시작됩니다.",
      });
    if (!instagramConfig(process.env))
      results.push({
        source: "Instagram",
        status: "unconfigured",
        found: 0,
        message: "Meta 인증 정보 연결이 필요합니다.",
      });
    const batches = await Promise.all(
      sources.map(async (source) => {
        try {
          const items = await source.run();
          results.push({
            source: source.name,
            status: "ok",
            found: items.length,
            message: "인기 조건을 통과한 후보 수입니다.",
          });
          return items;
        } catch (error) {
          const message =
            error instanceof InstagramError
              ? error.message
              : error instanceof Error &&
                  /^제공자 응답 HTTP \d{3}$/.test(error.message)
                ? error.message
                : "제공자 연결 또는 응답 검증 실패";
          results.push({
            source: source.name,
            status: "error",
            found: 0,
            message,
          });
          return [];
        }
      }),
    );
    // Alternate providers: view counts and social engagement scores are not comparable.
    const candidates: Candidate[] = [];
    for (let i = 0; i < Math.max(0, ...batches.map((b) => b.length)); i++)
      for (const batch of batches) if (batch[i]) candidates.push(batch[i]);
    const [saved] = await query<{
      counts: { inserted: number; duplicates: number };
    }>("select public.ingest_collection($1::uuid,$2::jsonb) counts", [
      id,
      JSON.stringify(candidates),
    ]);
    const good = results.filter((r) => r.status === "ok").length,
      bad = results.filter((r) => r.status === "error").length;
    const status = good === 0 ? "failed" : bad ? "partial" : "succeeded";
    await query(
      "update public.collection_runs set status=$2,finished_at=now(),found_count=$3,inserted_count=$4,duplicate_count=$5,source_results=$6::jsonb where id=$1",
      [
        id,
        status,
        candidates.length,
        saved.counts.inserted,
        saved.counts.duplicates,
        JSON.stringify(results),
      ],
    );
    return { status, inserted: saved.counts.inserted };
  } catch {
    await query(
      "update public.collection_runs set status='failed',finished_at=now(),source_results=$2::jsonb,error='저장 중 오류가 발생했습니다. 다음 실행에서 중복 없이 다시 수집합니다.' where id=$1 and status='running'",
      [id, JSON.stringify(results)],
    );
    return { status: "failed" as const };
  }
}
