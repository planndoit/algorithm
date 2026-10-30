import { z } from "zod";
import {
  type Candidate,
  type Settings,
  categoryFor,
  recent,
  rankCandidates,
} from "./model";
// Fixed provider origins only. Neither administrator keywords nor fetched links become fetch destinations.
async function json(
  url: URL,
  headers?: Record<string, string>,
): Promise<unknown> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
        redirect: "error",
      });
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt === 0
      ) {
        await new Promise((r) => setTimeout(r, 700));
        continue;
      }
      if (!response.ok) throw Error(`제공자 응답 HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (
        attempt === 1 ||
        (error instanceof Error && error.message.startsWith("제공자 응답"))
      )
        throw error;
    }
  }
  throw Error("제공자 연결 실패");
}
const postSchema = z.object({
  uri: z.string(),
  author: z.object({
    did: z.string(),
    handle: z.string(),
    displayName: z.string().optional(),
  }),
  record: z.object({
    text: z.string(),
    createdAt: z.string(),
    langs: z.array(z.string()).optional(),
    reply: z.unknown().optional(),
  }),
  likeCount: z.number().default(0),
  repostCount: z.number().default(0),
  replyCount: z.number().default(0),
  labels: z.array(z.object({ val: z.string() })).optional(),
});
export function blueskyCandidates(
  data: unknown,
  settings: Settings,
  now: Date,
): Candidate[] {
  const parsed = z.object({ posts: z.array(z.unknown()) }).parse(data);
  return parsed.posts.flatMap((raw) => {
    const result = postSchema.safeParse(raw);
    if (!result.success) return [];
    const p = result.data;
    const parts =
      /^at:\/\/(did:[a-z0-9]+:[a-zA-Z0-9._:%-]+)\/app\.bsky\.feed\.post\/([a-zA-Z0-9]+)$/.exec(
        p.uri,
      );
    if (
      !parts ||
      parts[1] !== p.author.did ||
      !recent(p.record.createdAt, now) ||
      p.record.reply ||
      !/[가-힣]/.test(p.record.text) ||
      p.labels?.some((l) =>
        [
          "porn",
          "sexual",
          "nudity",
          "graphic-media",
          "!hide",
          "!warn",
        ].includes(l.val),
      )
    )
      return [];
    const engagement = p.likeCount + 2 * p.repostCount + p.replyCount;
    if (engagement < settings.bluesky_min_engagement) return [];
    const hours = Math.max(
      6,
      (+now - Date.parse(p.record.createdAt)) / 3600000,
    );
    const text = p.record.text.replace(/https?:\/\/\S+/g, "").trim();
    if (!text) return [];
    return [
      {
        provider: "bluesky" as const,
        external_id: p.uri,
        title: text.split("\n").find(Boolean)!.slice(0, 120),
        creator: (p.author.displayName || p.author.handle).slice(0, 200),
        account_url: `https://bsky.app/profile/${encodeURIComponent(p.author.did)}`,
        source_url: `https://bsky.app/profile/${encodeURIComponent(p.author.did)}/post/${parts[2]}`,
        description: text.slice(0, 800),
        published_at: p.record.createdAt,
        category: categoryFor(text),
        platform: "Bluesky",
        metrics: {
          likes: p.likeCount,
          reposts: p.repostCount,
          replies: p.replyCount,
        },
        score: Math.round((engagement / hours) * 100) / 100,
        reason: `최근 7일 한국어 검색 후보 · 반응 ${engagement}점(좋아요 + 공유×2 + 댓글) · 시간당 반응 순 정렬. 개인 추천 피드나 전체 플랫폼 순위가 아닙니다.`,
      },
    ];
  });
}
export async function collectBluesky(settings: Settings, now: Date) {
  // All keyword requests must succeed; an upstream outage must not look like a successful empty result.
  const batches = await Promise.all(
    settings.keywords.map(async (keyword) => {
      const url = new URL(
        "https://api.bsky.app/xrpc/app.bsky.feed.searchPosts",
      );
      url.search = new URLSearchParams({
        q: keyword,
        sort: "top",
        lang: "ko",
        limit: "50",
        since: new Date(+now - 7 * 86400000).toISOString(),
      }).toString();
      return blueskyCandidates(await json(url), settings, now);
    }),
  );
  return rankCandidates(batches.flat());
}
const videoSchema = z.object({
  id: z.string().regex(/^[\w-]{11}$/),
  snippet: z.object({
    title: z.string(),
    channelId: z.string().regex(/^[\w-]+$/),
    channelTitle: z.string(),
    description: z.string().default(""),
    publishedAt: z.string(),
  }),
  statistics: z.object({
    viewCount: z.string().default("0"),
    likeCount: z.string().default("0"),
    commentCount: z.string().default("0"),
  }),
});
export function youtubeCandidates(
  data: unknown,
  settings: Settings,
  now: Date,
): Candidate[] {
  const parsed = z.object({ items: z.array(z.unknown()) }).parse(data);
  return parsed.items.flatMap((raw) => {
    const parsed = videoSchema.safeParse(raw);
    if (!parsed.success) return [];
    const v = parsed.data,
      s = v.snippet;
    const views = Number(v.statistics.viewCount);
    if (
      !Number.isFinite(views) ||
      views < settings.youtube_min_views ||
      !recent(s.publishedAt, now) ||
      !/[가-힣]/.test(s.title + " " + s.description)
    )
      return [];
    const hours = Math.max(6, (+now - Date.parse(s.publishedAt)) / 3600000);
    return [
      {
        provider: "youtube" as const,
        external_id: v.id,
        title: s.title.slice(0, 200),
        creator: s.channelTitle.slice(0, 200),
        account_url: `https://www.youtube.com/channel/${s.channelId}`,
        source_url: `https://www.youtube.com/watch?v=${v.id}`,
        description: s.description.slice(0, 800),
        published_at: s.publishedAt,
        category: categoryFor(s.title + " " + s.description),
        platform: "YouTube",
        metrics: {
          views,
          likes: Number(v.statistics.likeCount) || 0,
          comments: Number(v.statistics.commentCount) || 0,
        },
        score: Math.round(views / hours),
        reason: `최근 7일 한국어 키워드 검색 · 4분 미만 영상 후보 · 조회수 ${views.toLocaleString("ko-KR")}회 · 시간당 조회수 순. Shorts 여부·한국 내 유행은 관리자 확인이 필요합니다.`,
      },
    ];
  });
}
export async function collectYoutube(
  settings: Settings,
  now: Date,
  key: string,
) {
  const results = await Promise.all(
    settings.keywords.map(async (keyword) => {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.search = new URLSearchParams({
        part: "snippet",
        type: "video",
        q: keyword,
        order: "viewCount",
        regionCode: "KR",
        relevanceLanguage: "ko",
        safeSearch: "strict",
        videoDuration: "short",
        publishedAfter: new Date(+now - 7 * 86400000).toISOString(),
        maxResults: "25",
      }).toString();
      return z
        .object({
          items: z.array(
            z.object({
              id: z.object({ videoId: z.string().regex(/^[\w-]{11}$/) }),
            }),
          ),
        })
        .parse(await json(url, { "X-Goog-Api-Key": key }))
        .items.map((x) => x.id.videoId);
    }),
  );
  const ids = [...new Set(results.flat())];
  const candidates: Candidate[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.search = new URLSearchParams({
      part: "snippet,statistics",
      id: ids.slice(i, i + 50).join(","),
    }).toString();
    candidates.push(
      ...youtubeCandidates(
        await json(url, { "X-Goog-Api-Key": key }),
        settings,
        now,
      ),
    );
  }
  return rankCandidates(candidates);
}
