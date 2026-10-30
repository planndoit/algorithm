import "server-only";
import { cache } from "react";
import { neon } from "@neondatabase/serverless";
import { createNeonAuth } from "@neondatabase/auth/next/server";
export const configured = () => Boolean(process.env.DATABASE_URL);
export const authConfigured = () =>
  Boolean(
    process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
  );
export const demo = () => process.env.DEMO_MODE === "true";
export async function query<T = Record<string, unknown>>(
  sql: string,
  parameters: unknown[] = [],
): Promise<T[]> {
  if (!configured()) throw Error("Neon DB 설정이 필요합니다.");
  return (await neon(process.env.DATABASE_URL!).query(sql, parameters)) as T[];
}
export function auth() {
  if (!authConfigured()) throw Error("Neon Auth 설정이 필요합니다.");
  return createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  });
}
export const requireAdmin = cache(async function requireAdmin() {
  if (!configured()) throw Error("Neon DB 설정이 필요합니다.");
  const { data: session, error } = await auth().getSession();
  if (error || !session?.user) throw Error("관리자 로그인이 필요합니다.");
  const [member] = await query<{ id: string }>(
    "select id from public.admin_users where id=$1",
    [session.user.id],
  );
  if (!member) throw Error("관리자 권한이 없습니다.");
  return session.user;
});
