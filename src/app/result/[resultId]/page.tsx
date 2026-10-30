import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getResult, getQuiz } from "@/lib/data";
import { outcome } from "@/lib/model";
import { demo } from "@/lib/db";
import ResultCard from "@/components/result-card";
import DemoResult from "@/components/demo-result";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ resultId: string }>;
}): Promise<Metadata> {
  const { resultId } = await params;
  if (resultId.startsWith("demo-"))
    return { title: "체험 결과", robots: { index: false } };
  const result = await getResult(resultId);
  if (!result) return {};
  const type = outcome(result.score);
  const quiz = await getQuiz(result.quiz_id);
  const prefix = quiz?.is_sample ? "[샘플] " : "";
  return {
    title: `${prefix}${result.score}점 · ${type.title}`,
    description: type.description,
    openGraph: {
      title: `${prefix}나의 알고리즘력 ${result.score}점 · ${type.title}`,
      description: type.description,
      images: [`/result/${resultId}/opengraph-image`],
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  if (resultId.startsWith("demo-") && demo())
    return <DemoResult id={resultId} />;
  const r = await getResult(resultId);
  if (!r) notFound();
  const quiz = await getQuiz(r.quiz_id);
  if (!quiz) notFound();
  return <ResultCard score={r.score} answers={r.answers} quiz={quiz} />;
}
