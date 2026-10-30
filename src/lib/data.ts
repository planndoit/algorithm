import { redirect } from "next/navigation";
import "server-only";
import { z } from "zod";
import { query, configured, demo, requireAdmin } from "./db";
import { demoQuiz, type Quiz, type Content } from "./model";
export async function getQuiz(id?: string): Promise<Quiz | null> {
  if (id === "demo") return demo() ? demoQuiz : null;
  if (id && !z.uuid().safeParse(id).success) return null;
  if (!configured()) return demo() && !id ? demoQuiz : null;
  const [quiz] = await query<Omit<Quiz, "questions">>(
    `select id,title,is_sample,starts_at::text,ends_at::text from public.quiz_sets where starts_at<=now() and ${id ? "id=$1 and status in ('published','ended')" : "status='published' and ends_at>now()"} order by starts_at desc limit 1`,
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
export async function adminContents() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin");
  }
  return query<import("./admin").AdminContent>(
    `select c.id,c.title,c.creator,c.account_url,c.source_url,c.discovered_at::text,coalesce(c.trending_at::text,'') trending_at,c.category,c.platform,c.difficulty,c.description,c.admin_notes,c.status,c.thumbnail_url,c.collection_method,(select count(*)::int from public.quiz_questions q where q.content_id=c.id) use_count from public.contents c order by c.created_at desc,c.id`,
  );
}
export async function adminQuizzes(id?: string) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin");
  }
  return query<import("./admin").AdminQuiz>(
    `select s.id,s.title,s.status,s.locked,s.is_sample,s.starts_at::text,s.ends_at::text,coalesce((select jsonb_agg(jsonb_build_object('content_id',q.content_id,'position',q.position,'snapshot',q.snapshot) order by q.position) from public.quiz_questions q where q.quiz_id=s.id),'[]'::jsonb) quiz_questions from public.quiz_sets s ${id ? "where s.id=$1" : ""} order by case when s.status='published' and s.starts_at<=now() and s.ends_at>now() then 0 when s.status='published' and s.starts_at>now() then 1 when s.status='draft' then 2 else 3 end,s.starts_at desc`,
    id ? [id] : [],
  );
}
