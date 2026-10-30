import { redirect } from "next/navigation";
import Link from "next/link";
import { configured, authConfigured, requireAdmin } from "@/lib/db";
import { login } from "./actions";
export const dynamic = "force-dynamic";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    quiz?: string;
    category?: string;
    error?: string;
    preview?: string;
  }>;
}) {
  const search = await searchParams;
  if (!configured() || !authConfigured())
    return (
      <main className="narrow">
        <span className="eyebrow">ADMIN SETUP</span>
        <h1>운영 준비를 시작해요.</h1>
        <p>
          Neon DB와 관리자 인증을 설정하면 관리자 로그인을 사용할 수 있어요.
        </p>
        <p>설정 방법은 프로젝트의 README.md에 정리했습니다.</p>
        <Link className="button primary" href="/">
          홈으로
        </Link>
      </main>
    );
  let allowed = false;
  try {
    await requireAdmin();
    allowed = true;
  } catch {}
  if (!allowed)
    return (
      <main className="narrow">
        <h1>관리자 로그인</h1>
        <p>초대된 관리자만 접근할 수 있어요.</p>
        <form action={login}>
          <label>
            이메일
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            비밀번호
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button primary">로그인</button>
        </form>
        {search.error && <p role="alert">로그인 정보를 확인해 주세요.</p>}
        <Link className="button secondary" href="/admin/password">
          처음 로그인 / 비밀번호 재설정
        </Link>
      </main>
    );
  redirect("/admin/contents");
}
