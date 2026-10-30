"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, query, requireAdmin } from "@/lib/db";
import { z } from "zod";
import { contentSchema, parseKst } from "@/lib/admin";
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
export async function saveContent(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const validId = !id || z.uuid().safeParse(id).success;
  const target =
    validId && id ? `/admin/contents/${id}` : "/admin/contents/new";
  const parsed = contentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success || !validId) redirect(`${target}?error=validation`);
  const values = {
    ...parsed.data,
    trending_at: parsed.data.trending_at || null,
  };
  try {
    const fields = Object.keys(values);
    const parameters = Object.values(values);
    if (id) {
      await query(
        `update public.contents set ${fields.map((key, i) => `"${key}"=$${i + 1}`).join(",")} where id=$${fields.length + 1}`,
        [...parameters, id],
      );
    } else {
      await query(
        `insert into public.contents (${fields.map((key) => `"${key}"`).join(",")}) values (${fields.map((_, i) => `$${i + 1}`).join(",")})`,
        parameters,
      );
    }
  } catch {
    redirect(`${target}?error=content`);
  }
  revalidatePath("/admin/contents");
  revalidatePath("/admin/exposure");
  redirect("/admin/contents?saved=1");
}
export async function setContentStatus(form: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const status = z
    .enum(["pending", "approved", "excluded", "inactive"])
    .safeParse(form.get("status"));
  if (!id.success || !status.success)
    redirect("/admin/contents?error=validation");
  try {
    await query("update public.contents set status=$1 where id=$2", [
      status.data,
      id.data,
    ]);
  } catch {
    redirect("/admin/contents?error=content");
  }
  revalidatePath("/admin/contents");
  revalidatePath("/admin/exposure");
  redirect("/admin/contents?saved=1");
}
export async function saveQuiz(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") || "");
  const validId = !id || z.uuid().safeParse(id).success;
  const target =
    validId && id ? `/admin/exposure/${id}` : "/admin/exposure/new";
  const ids = String(form.get("ordered_ids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const title = String(form.get("title") || "").trim();
  if (
    !validId ||
    !title ||
    title.length > 200 ||
    !z.array(z.uuid()).max(10).safeParse(ids).success ||
    new Set(ids).size !== ids.length
  )
    redirect(`${target}?error=validation`);
  let start: string, end: string;
  try {
    start = parseKst(String(form.get("starts_at")));
    end = parseKst(String(form.get("ends_at")));
    if (start >= end) throw Error();
  } catch {
    redirect(`${target}?error=validation`);
  }
  let savedId: string;
  try {
    const [saved] = await query<{ id: string }>(
      "select public.save_quiz($1::uuid,$2,$3::timestamptz,$4::timestamptz,$5::uuid[]) id",
      [id || null, title, start, end, ids],
    );
    savedId = saved.id;
  } catch {
    redirect(`${target}?error=quiz`);
  }
  revalidatePath("/admin/exposure");
  revalidatePath("/admin/contents");
  redirect(`/admin/exposure/${savedId}?saved=1`);
}
export async function changeQuiz(form: FormData) {
  await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const status = z.enum(["published", "ended"]).safeParse(form.get("status"));
  if (!id.success || !status.success)
    redirect("/admin/exposure?error=validation");
  const target = `/admin/exposure/${id.data}`;
  try {
    const changed = await query(
      "update public.quiz_sets set status=$1 where id=$2 and status=$3 returning id",
      [
        status.data,
        id.data,
        status.data === "published" ? "draft" : "published",
      ],
    );
    if (!changed.length) throw Error();
  } catch {
    redirect(`${target}?error=publish`);
  }
  revalidatePath("/");
  revalidatePath("/admin/exposure");
  redirect("/admin/exposure?saved=1");
}
