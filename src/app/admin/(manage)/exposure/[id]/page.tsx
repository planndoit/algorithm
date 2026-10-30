import { notFound } from "next/navigation";
import { z } from "zod";
import { adminContents, adminQuizzes } from "@/lib/data";
import QuizEditor from "@/components/quiz-editor";
import ExposureDetail from "@/components/exposure-detail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [quiz] = await adminQuizzes(id);
  if (!quiz) notFound();
  const search = await searchParams;
  const editor =
    quiz.status === "draft" ? (
      <QuizEditor contents={await adminContents()} initial={quiz} />
    ) : undefined;
  return (
    <ExposureDetail
      quiz={quiz}
      error={search.error}
      saved={search.saved}
      editor={editor}
    />
  );
}
