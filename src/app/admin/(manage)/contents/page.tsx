import { adminContents } from "@/lib/data";
import ContentList from "@/components/content-list";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    error?: string;
    saved?: string;
  }>;
}) {
  return (
    <ContentList contents={await adminContents()} search={await searchParams} />
  );
}
