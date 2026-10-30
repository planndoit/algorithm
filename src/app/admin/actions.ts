"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, query, requireAdmin } from "@/lib/db";
import { z } from "zod";
export async function login(form: FormData) {
  const client = auth();
  const { error } = await client.signIn.email({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) redirect("/admin?error=login");
  redirect("/admin");
}
export async function logout() {
  await auth().signOut();
  redirect("/admin");
}
const safeUrl = z.union([
  z.literal(""),
  z
    .url()
    .refine((s) => new URL(s).protocol === "https:", "HTTPS URL을 입력하세요."),
]);
const contentSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.enum(["인물", "밈", "유행어", "챌린지", "화제 콘텐츠"]),
  platform: z.enum(["Instagram", "TikTok", "YouTube", "Threads", "기타"]),
  creator: z.string().max(200),
  source_url: z.url().refine((s) => new URL(s).protocol === "https:"),
  video_url: safeUrl,
  thumbnail_url: safeUrl,
  description: z.string().max(1000),
  discovered_at: z.iso.date(),
  trending_at: z.union([z.literal(""), z.iso.date()]),
  metrics: z.string().max(500),
  difficulty: z.enum(["쉬움", "보통", "어려움"]),
  status: z.enum(["pending", "approved", "excluded", "inactive"]),
  admin_notes: z.string().max(2000),
});
export async function saveContent(form: FormData) {
  await requireAdmin();
  const parsed = contentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) redirect("/admin?error=validation");
  const values = {
    ...parsed.data,
    trending_at: parsed.data.trending_at || null,
  };
  const id = String(form.get("id") || "");
  try {
    const fields = Object.keys(values);
    const params = Object.values(values);
    if (id) {
      await query(
        `update public.contents set ${fields.map((key, i) => `"${key}"=$${i + 1}`).join(",")} where id=$${fields.length + 1}`,
        [...params, id],
      );
    } else {
      await query(
        `insert into public.contents (${fields.map((key) => `"${key}"`).join(",")}) values (${fields.map((_, i) => `$${i + 1}`).join(",")})`,
        params,
      );
    }
  } catch {
    redirect("/admin?error=content");
  }
  revalidatePath("/admin");
  redirect("/admin");
}
export async function removeContent(form: FormData) {
  await requireAdmin();
  try {
    await query("update public.contents set status='inactive' where id=$1", [
      String(form.get("id")),
    ]);
  } catch {
    redirect("/admin?error=content");
  }
  revalidatePath("/admin");
}
export async function saveQuiz(form: FormData) {
  await requireAdmin();
  const ids = String(form.get("ordered_ids") || "")
    .split(/[\s,]+/)
    .filter(Boolean);
  const title = String(form.get("title") || "").trim();
  const starts = new Date(String(form.get("starts_at")));
  const ends = new Date(String(form.get("ends_at")));
  if (
    !title ||
    title.length > 200 ||
    !Number.isFinite(+starts) ||
    !Number.isFinite(+ends) ||
    starts >= ends ||
    new Set(ids).size !== ids.length ||
    ids.length > 10
  )
    redirect("/admin?error=validation");
  try {
    await query(
      "select public.save_quiz($1::uuid,$2,$3::timestamptz,$4::timestamptz,$5::uuid[])",
      [
        form.get("id") || null,
        title,
        starts.toISOString(),
        ends.toISOString(),
        ids,
      ],
    );
  } catch {
    redirect("/admin?error=quiz");
  }
  revalidatePath("/admin");
  redirect("/admin");
}
export async function changeQuiz(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  if (!["published", "ended"].includes(status)) return;
  try {
    await query("update public.quiz_sets set status=$1 where id=$2", [
      status,
      String(form.get("id")),
    ]);
  } catch {
    redirect("/admin?error=publish");
  }
  revalidatePath("/");
  revalidatePath("/admin");
}
