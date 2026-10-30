"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query, requireAdmin } from "@/lib/db";
import { collectionSettingsSchema } from "@/lib/collection/model";
import { verifyInstagram } from "@/lib/collection/instagram-server";
import { type Settings } from "@/lib/collection/model";
import { runCollection } from "@/lib/collection/runner";
export async function saveSettings(form: FormData) {
  await requireAdmin();
  const parsed = collectionSettingsSchema.safeParse({
    ...Object.fromEntries(form),
    enabled: form.get("enabled") === "on",
    instagram_hashtags: [
      ...new Set(
        String(form.get("instagram_hashtags") || "")
          .split(/[,\n]/)
          .map((v) => v.trim().replace(/^#+/, "").normalize("NFC"))
          .filter(Boolean),
      ),
    ],
    keywords: [
      ...new Set(
        String(form.get("keywords") || "")
          .split(/[,\n]/)
          .map((v) => v.trim())
          .filter(Boolean),
      ),
    ],
  });
  if (!parsed.success) redirect("/admin/collection?error=validation");
  const s = parsed.data;
  await query(
    "update public.collection_settings set enabled=$1,keywords=$2::text[],daily_limit=$3,bluesky_min_engagement=$4,youtube_min_views=$5,instagram_hashtags=$6::text[],instagram_min_likes=$7,updated_at=now() where id=true",
    [
      s.enabled,
      s.keywords,
      s.daily_limit,
      s.bluesky_min_engagement,
      s.youtube_min_views,
      s.instagram_hashtags,
      s.instagram_min_likes,
    ],
  );
  revalidatePath("/admin/collection");
  redirect("/admin/collection?saved=1");
}
export async function collectNow() {
  await requireAdmin();
  const result = await runCollection("manual");
  revalidatePath("/admin/collection");
  revalidatePath("/admin/contents");
  redirect(`/admin/collection?result=${result.status}`);
}

export async function checkInstagram() {
  await requireAdmin();
  const [settings] = await query<Settings>(
    "select * from public.collection_settings where id=true",
  );
  await verifyInstagram(settings);
  revalidatePath("/admin/collection");
  redirect("/admin/collection#instagram");
}
