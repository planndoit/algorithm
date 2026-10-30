import ContentForm from "@/components/content-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <ContentForm error={(await searchParams).error} />;
}
