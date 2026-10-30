import "../admin.css";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/db";
import AdminShell from "@/components/admin-shell";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin");
  }
  return <AdminShell>{children}</AdminShell>;
}
