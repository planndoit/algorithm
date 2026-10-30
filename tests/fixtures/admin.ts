import type { AdminContent, AdminQuiz } from "../../src/lib/admin";
export const fixtureContents: AdminContent[] = Array.from(
  { length: 14 },
  (_, i) => ({
    id: `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    title: `[샘플] ${["크리에이터 소개 카드", "짧은 반응 밈", "한 줄 유행어", "동작 따라 하기 챌린지", "짧은 영상 콘텐츠"][i % 5]} ${i + 1}`,
    creator: `테스트용 크리에이터 ${i + 1}`,
    account_url: `https://example.com/accounts/${i + 1}`,
    source_url: `https://example.com/posts/${i + 1}`,
    discovered_at: "2026-10-30",
    trending_at: "2026-10-25",
    category: ["인물", "밈", "유행어", "챌린지", "화제 콘텐츠"][
      i % 5
    ] as AdminContent["category"],
    platform: ["Instagram", "TikTok", "Threads", "TikTok", "YouTube"][
      i % 5
    ] as AdminContent["platform"],
    difficulty: "보통",
    description: "기능 확인용 샘플입니다. 실제 트렌드 정보가 아닙니다.",
    admin_notes: "검토용 메모",
    status: i < 10 ? "approved" : i < 13 ? "pending" : "excluded",
    thumbnail_url: "",
    collection_method: "sample",
    use_count: i < 10 ? 2 : 0,
  }),
);
export const fixtureQuizzes: AdminQuiz[] = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    title: "[샘플] 지금 노출되는 테스트 회차",
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: "published",
    locked: true,
    is_sample: true,
    quiz_questions: fixtureContents
      .slice(0, 10)
      .map((c, i) => ({ content_id: c.id, position: i, snapshot: c })),
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    title: "[샘플] 다음 주 예약 회차",
    starts_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: "published",
    locked: true,
    is_sample: true,
    quiz_questions: fixtureContents
      .slice(0, 10)
      .map((c, i) => ({ content_id: c.id, position: i, snapshot: c })),
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    title: "[샘플] 편집해 볼 임시저장 회차",
    starts_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    ends_at: new Date(Date.now() + 21 * 86400000).toISOString(),
    status: "draft",
    locked: false,
    is_sample: true,
    quiz_questions: fixtureContents
      .slice(0, 6)
      .map((c, i) => ({ content_id: c.id, position: i, snapshot: c })),
  },
];
