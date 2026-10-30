import { notFound } from "next/navigation";
import { getQuiz } from "@/lib/data";
import QuizPlayer from "@/components/quiz-player";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);
  if (!quiz || quiz.questions.length !== 10) notFound();
  return <QuizPlayer quiz={quiz} />;
}
