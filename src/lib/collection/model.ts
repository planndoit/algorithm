import { z } from "zod";
export const collectionSettingsSchema = z.object({
  enabled: z.boolean(),
  keywords: z.array(z.string().trim().min(1).max(30)).min(1).max(8),
  daily_limit: z.coerce.number().int().min(1).max(50),
  bluesky_min_engagement: z.coerce.number().int().min(1).max(10000),
  youtube_min_views: z.coerce.number().int().min(100).max(100000000),
});
export type Settings = z.infer<typeof collectionSettingsSchema>;
export type Candidate = {
  provider: "bluesky" | "youtube";
  external_id: string;
  title: string;
  creator: string;
  account_url: string;
  source_url: string;
  description: string;
  published_at: string;
  category: string;
  platform: string;
  metrics: Record<string, number>;
  score: number;
  reason: string;
};
export type SourceResult = {
  source: string;
  status: "ok" | "error" | "unconfigured";
  found: number;
  message: string;
};
export function recent(date: string, now: Date) {
  const time = Date.parse(date);
  return (
    Number.isFinite(time) &&
    time <= +now + 300000 &&
    time >= +now - 7 * 86400000
  );
}
export function kstDay(date = new Date()) {
  return new Date(+date + 9 * 3600000).toISOString().slice(0, 10);
}
export function categoryFor(text: string) {
  return /챌린지|challenge/i.test(text)
    ? "챌린지"
    : /유행어/.test(text)
      ? "유행어"
      : /밈|meme/i.test(text)
        ? "밈"
        : "화제 콘텐츠";
}
export function rankCandidates(items: Candidate[]) {
  return [
    ...new Map(items.map((item) => [item.source_url, item])).values(),
  ].sort(
    (a, b) => b.score - a.score || a.source_url.localeCompare(b.source_url),
  );
}
