import { adminQuizzes } from "@/lib/data";
import ExposureList from "@/components/exposure-list";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; saved?: string }>;
}) {
  return (
    <ExposureList quizzes={await adminQuizzes()} search={await searchParams} />
  );
}
