import { z } from "zod";
export type Content = {
  id: string;
  title: string;
  category: string;
  platform: string;
  creator: string;
  source_url: string;
  thumbnail_url: string;
  description: string;
  emoji?: string;
};
export type Quiz = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  questions: Content[];
};
export const submission = z.object({
  quizId: z.string().min(1),
  requestId: z.uuid(),
  answers: z.array(z.boolean()).length(10),
});
export function outcome(score: number) {
  if (score <= 20)
    return {
      title: "현생 최강자",
      emoji: "🌿",
      description:
        "스크롤 대신 내 인생을 사는 중. 당신의 평화로운 알고리즘을 응원해요.",
    };
  if (score <= 50)
    return {
      title: "가끔 인터넷 함",
      emoji: "👀",
      description: "현생과 온라인 사이, 딱 좋은 거리. 재밌는 건 놓치지 않아요.",
    };
  if (score <= 70)
    return {
      title: "알고리즘 주민",
      emoji: "📱",
      description: "어쩐지 익숙하더라. 요즘 인터넷 흐름에 꽤 잘 올라타 있어요.",
    };
  if (score <= 90)
    return {
      title: "알고리즘 원주민",
      emoji: "🔥",
      description: "이거 이미 봤는데? 친구들의 트렌드 소식통은 바로 당신.",
    };
  return {
    title: "알고리즘이 당신을 키움",
    emoji: "👑",
    description: "당신의 스크롤에 경의를. 인터넷보다 한 발 앞서 있는 사람.",
  };
}
export function scoreAnswers(answers: boolean[]) {
  if (answers.length !== 10 || answers.some((a) => typeof a !== "boolean"))
    throw Error("10개의 응답이 필요합니다.");
  return answers.filter(Boolean).length * 10;
}
export const demoQuiz: Quiz = {
  id: "demo",
  title: "체험판 · 화면과 기능 미리보기",
  starts_at: "2026-10-30T00:00:00+09:00",
  ends_at: "2026-11-06T00:00:00+09:00",
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `sample-${i}`,
    title: [
      "테스트용 크리에이터 카드",
      "테스트용 밈 카드",
      "테스트용 유행어 카드",
      "테스트용 챌린지 카드",
      "테스트용 영상 카드",
    ][i % 5],
    category: ["인물", "밈", "유행어", "챌린지", "화제 콘텐츠"][i % 5],
    platform: "SAMPLE",
    creator: "실제 트렌드가 아닌 UI 샘플",
    source_url: "",
    thumbnail_url: "",
    description:
      "기능 확인용 샘플입니다. 실제 발행 전 관리자가 검증한 콘텐츠로 교체합니다.",
    emoji: ["🎧", "🫠", "💬", "🪩", "🎬"][i % 5],
  })),
};
