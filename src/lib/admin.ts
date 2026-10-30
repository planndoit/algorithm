import { z } from "zod";
export const categories = [
  "인물",
  "밈",
  "유행어",
  "챌린지",
  "화제 콘텐츠",
] as const;
export const platforms = [
  "Instagram",
  "TikTok",
  "YouTube",
  "Threads",
  "Bluesky",
  "기타",
] as const;
export const difficulties = ["쉬움", "보통", "어려움"] as const;
export const reviewLabels = {
  pending: "검토 대기",
  approved: "승인",
  excluded: "제외",
  inactive: "비활성",
} as const;
export const methodLabels = {
  manual: "직접 등록",
  auto: "자동 수집",
  ai: "AI 수집",
  sample: "샘플",
} as const;
export const optionalUrl = z.union([
  z.literal(""),
  z
    .url()
    .refine(
      (value) => value.toLowerCase().startsWith("https://"),
      "HTTPS 주소를 입력해 주세요.",
    ),
]);
export const contentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  creator: z.string().trim().max(200),
  account_url: optionalUrl,
  source_url: z
    .url()
    .refine((value) => value.toLowerCase().startsWith("https://")),
  discovered_at: z.iso.date(),
  trending_at: z.union([z.literal(""), z.iso.date()]),
  category: z.enum(categories),
  platform: z.enum(platforms),
  difficulty: z.enum(difficulties),
  description: z.string().max(1000),
  admin_notes: z.string().max(2000),
  status: z.enum(["pending", "approved", "excluded", "inactive"]),
  thumbnail_url: optionalUrl,
});
export type AdminContent = z.infer<typeof contentSchema> & {
  id: string;
  collection_method: keyof typeof methodLabels;
  use_count: number;
};
export type Candidate = Pick<
  AdminContent,
  | "id"
  | "title"
  | "creator"
  | "category"
  | "platform"
  | "difficulty"
  | "collection_method"
  | "status"
>;
export type QuestionSnapshot = {
  id: string;
  title: string;
  category: string;
  platform: string;
  creator: string;
  source_url: string;
  description: string;
  thumbnail_url: string;
  is_sample?: boolean;
};
export type AdminQuiz = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published" | "ended";
  locked: boolean;
  is_sample: boolean;
  quiz_questions: {
    content_id: string;
    position: number;
    snapshot: QuestionSnapshot;
  }[];
};
export function exposure(
  quiz: Pick<AdminQuiz, "status" | "starts_at" | "ends_at">,
  now = Date.now(),
) {
  if (quiz.status === "draft") return { label: "임시저장", key: "draft" };
  if (quiz.status === "ended" || new Date(quiz.ends_at).getTime() <= now)
    return { label: "노출 종료", key: "ended" };
  if (new Date(quiz.starts_at).getTime() > now)
    return { label: "예약됨", key: "scheduled" };
  return { label: "노출 중", key: "live" };
}
export function formatKst(date: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}
export function kstInput(date: string) {
  return new Date(new Date(date).getTime() + 9 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function parseKst(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("한국 시간으로 입력해 주세요.");
  const date = new Date(value + ":00+09:00");
  if (!Number.isFinite(+date) || kstInput(date.toISOString()) !== value)
    throw Error("올바른 날짜가 아닙니다.");
  return date.toISOString();
}
