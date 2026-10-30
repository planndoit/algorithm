import { notFound } from "next/navigation";
import { z } from "zod";
import { adminContents } from "@/lib/data";
import ContentForm from "@/components/content-form";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const content = (await adminContents()).find((c) => c.id === id);
  if (!content) notFound();
  return <ContentForm content={content} error={(await searchParams).error} />;
}
