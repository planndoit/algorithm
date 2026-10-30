import { adminContents } from "@/lib/data";
import QuizEditor from "@/components/quiz-editor";
import { PageHeading, Notice } from "@/components/admin-common";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <>
      <PageHeading
        section="문제 노출 관리"
        title="새 노출 회차 만들기"
        description="승인된 문제를 선택하고, 한국 시간으로 노출 기간을 정하세요."
      />
      <Notice error={(await searchParams).error} />
      <QuizEditor contents={await adminContents()} />
    </>
  );
}
