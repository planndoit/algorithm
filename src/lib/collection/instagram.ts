import { z } from "zod";
import {
  type Candidate,
  type Settings,
  recent,
  categoryFor,
  rankCandidates,
} from "./model";
const DEFAULT_VERSION = "v26.0";
export type InstagramConfig = {
  token: string;
  accountId: string;
  version: string;
};
export function instagramConfig(
  env: Record<string, string | undefined>,
): InstagramConfig | null {
  const token = env.INSTAGRAM_ACCESS_TOKEN?.trim(),
    accountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim(),
    version = env.META_GRAPH_API_VERSION || DEFAULT_VERSION;
  if (
    !token ||
    !accountId ||
    !/^\d+$/.test(accountId) ||
    !/^v\d+\.0$/.test(version)
  )
    return null;
  return { token, accountId, version };
}
export class InstagramError extends Error {}
async function graph(
  path: string,
  params: Record<string, string>,
  config: InstagramConfig,
): Promise<unknown> {
  const url = new URL(`https://graph.facebook.com/${config.version}/${path}`);
  url.search = new URLSearchParams(params).toString();
  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${config.token}` },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      if (attempt === 0) continue;
      throw new InstagramError(
        "Instagram 연결 실패: 잠시 후 다시 확인해 주세요.",
      );
    }
    const data: unknown = await response.json().catch(() => null);
    const error = z
      .object({
        error: z.object({
          code: z.number(),
          is_transient: z.boolean().optional(),
        }),
      })
      .safeParse(data);
    if (!response.ok || error.success) {
      const code = error.success ? error.data.error.code : 0;
      if (
        attempt === 0 &&
        (response.status === 429 ||
          response.status >= 500 ||
          (error.success && error.data.error.is_transient))
      ) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      if (code === 190)
        throw new InstagramError(
          "Instagram 인증 만료: Meta에서 액세스 토큰을 다시 발급해 연결해 주세요.",
        );
      if (code === 10 || code === 200)
        throw new InstagramError(
          "Instagram 권한 부족: instagram_basic 및 Instagram Public Content Access 승인을 확인해 주세요.",
        );
      if ([4, 17, 32, 613].includes(code) || response.status === 429)
        throw new InstagramError(
          "Instagram API 사용 한도 도달: 다음 실행에서 다시 수집합니다.",
        );
      if (code === 100)
        throw new InstagramError(
          "Instagram 설정 확인 필요: Facebook Login 방식의 계정 ID·권한·API 버전을 확인해 주세요.",
        );
      throw new InstagramError(
        `Instagram API 응답 오류 (HTTP ${response.status}, 코드 ${code}).`,
      );
    }
    return data;
  }
  throw new InstagramError("Instagram API 연결 실패");
}
const mediaSchema = z.object({
  id: z.string().regex(/^\d+$/),
  caption: z.string().optional(),
  permalink: z.url(),
  timestamp: z.string(),
  media_type: z.enum(["IMAGE", "VIDEO", "CAROUSEL_ALBUM"]),
  like_count: z.number().int().nonnegative().optional(),
  comments_count: z.number().int().nonnegative().optional(),
});
export function instagramCandidates(
  data: unknown,
  settings: Settings,
  now: Date,
  hashtag: string,
): Candidate[] {
  const parsed = z.object({ data: z.array(z.unknown()) }).parse(data);
  return parsed.data.flatMap((raw) => {
    const parsed = mediaSchema.safeParse(raw);
    if (!parsed.success) return [];
    const m = parsed.data;
    const url = new URL(m.permalink);
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname)
    )
      return [];
    const match = /^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
    if (!match) return [];
    const caption = m.caption?.trim() || "";
    if (
      !recent(m.timestamp, now) ||
      !/[가-힣]/.test(caption) ||
      m.like_count === undefined ||
      m.like_count < settings.instagram_min_likes
    )
      return [];
    const hours = Math.max(6, (+now - Date.parse(m.timestamp)) / 3600000);
    const metrics: Record<string, number> = { likes: m.like_count };
    if (m.comments_count !== undefined) metrics.comments = m.comments_count;
    return [
      {
        provider: "instagram" as const,
        external_id: m.id,
        title:
          caption
            .replace(/https?:\/\/\S+/g, "")
            .split("\n")
            .find((v) => v.trim())
            ?.slice(0, 200) || `#${hashtag} 인기 게시물`,
        creator: "",
        account_url: "",
        source_url: `https://www.instagram.com/${match[1]}/${match[2]}/`,
        description: caption.slice(0, 800),
        published_at: m.timestamp,
        category: categoryFor(caption),
        platform: "Instagram",
        metrics,
        score: Math.round((m.like_count / hours) * 100) / 100,
        reason: `#${hashtag} 공식 top_media에서 발견 · 최근 7일 한국어 게시물 · 좋아요 ${m.like_count.toLocaleString("ko-KR")}개 이상 확인 · 시간당 좋아요로 정렬. 조회수·작성자 계정은 이 API에서 제공하지 않아 추정하지 않습니다. 전체 인기 순위나 개인 추천 피드가 아닙니다.`,
      },
    ];
  });
}
export async function collectInstagram(
  settings: Settings,
  now: Date,
  config: InstagramConfig,
) {
  const batches = [];
  const started = Date.now();
  // At most eight tags, one page (50 items) each; provider pagination URLs are never followed.
  for (const tag of settings.instagram_hashtags) {
    if (Date.now() - started > 90000)
      throw new InstagramError(
        "Instagram 조회 시간 초과: 해시태그 수를 줄여 다시 실행해 주세요.",
      );
    const result = z
      .object({ data: z.array(z.object({ id: z.string().regex(/^\d+$/) })) })
      .parse(
        await graph(
          "ig_hashtag_search",
          { user_id: config.accountId, q: tag },
          config,
        ),
      );
    if (!result.data.length) continue;
    const data = await graph(
      `${result.data[0].id}/top_media`,
      {
        user_id: config.accountId,
        fields:
          "id,caption,media_type,permalink,timestamp,like_count,comments_count",
        limit: "50",
      },
      config,
    );
    batches.push(...instagramCandidates(data, settings, now, tag));
  }
  return rankCandidates(batches);
}
export async function checkInstagramAccount(config: InstagramConfig) {
  return z
    .object({ id: z.string(), username: z.string() })
    .parse(await graph(config.accountId, { fields: "id,username" }, config));
}
