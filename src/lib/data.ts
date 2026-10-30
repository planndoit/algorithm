import "server-only";
import { z } from "zod";
import { query, configured, demo } from "./db";
import { demoQuiz, type Quiz, type Content } from "./model";
export async function getQuiz(id?: string): Promise<Quiz | null> {
  if (id === "demo") return demo() ? demoQuiz : null;
  if (id && !z.uuid().safeParse(id).success) return null;
  if (!configured()) return demo() && !id ? demoQuiz : null;
  const [quiz] = await query<Omit<Quiz, "questions">>(
    `select id,title,starts_at::text,ends_at::text from public.quiz_sets where starts_at<=now() and ${id ? "id=$1 and status in ('published','ended')" : "status='published' and ends_at>now()"} order by starts_at desc limit 1`,
    id ? [id] : [],
  );
  if (!quiz) return null;
  const questions = await query<{ snapshot: Content }>(
    "select snapshot from public.quiz_questions where quiz_id=$1 order by position",
    [quiz.id],
  );
  return { ...quiz, questions: questions.map((q) => q.snapshot) };
}
export async function nextDate() {
  if (!configured()) return null;
  const [quiz] = await query<{ starts_at: string }>(
    "select starts_at::text from public.quiz_sets where status='published' and starts_at>now() order by starts_at limit 1",
  );
  return quiz?.starts_at ?? null;
}
export async function getResult(id: string) {
  if (!configured() || !z.uuid().safeParse(id).success) return null;
  const [result] = await query<{
    id: string;
    quiz_id: string;
    score: number;
    answers: boolean[];
    created_at: string;
  }>(
    "select id,quiz_id,score,answers,created_at::text from public.quiz_results where id=$1",
    [id],
  );
  return result ?? null;
}
export type AdminContent = Record<string, string>;
export type AdminQuiz = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  quiz_questions: { content_id: string; position: number; snapshot: Content }[];
};
export async function adminData() {
  const [contents, quizzes] = await Promise.all([
    query<AdminContent>(
      "select *,discovered_at::text,trending_at::text from public.contents order by created_at desc",
    ),
    query<AdminQuiz>(
      `select s.id,s.title,s.status,s.starts_at::text,s.ends_at::text,coalesce((select jsonb_agg(jsonb_build_object('content_id',q.content_id,'position',q.position,'snapshot',q.snapshot) order by q.position) from public.quiz_questions q where q.quiz_id=s.id),'[]'::jsonb) quiz_questions from public.quiz_sets s order by starts_at desc`,
    ),
  ]);
  return { contents, quizzes };
}
