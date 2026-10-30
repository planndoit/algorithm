"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <div className="workspace-label">
          WORKSPACE <span>✳</span>
        </div>
        <div className="workspace-name">
          알고리즘력 <span>관리자</span>
        </div>
        <p className="sidebar-group">콘텐츠 운영</p>
        <nav aria-label="관리자 메뉴">
          {[
            ["/admin/contents", "▤", "콘텐츠 관리", "문제 후보 저장소"],
            ["/admin/exposure", "◷", "문제 노출 관리", "기간별 출제 구성"],
          ].map(([href, icon, label, sub]) => (
            <Link
              key={href}
              href={href}
              className={path.startsWith(href) ? "nav-item active" : "nav-item"}
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              <span className="nav-icon">{icon}</span>
              <span>
                <strong>{label}</strong>
                <small>{sub}</small>
              </span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>수집 → 검토 → 출제</span>
          <p>
            문제 후보를 모은 뒤<br />
            노출할 회차에 담아주세요.
          </p>
        </div>
        <div className="sidebar-bottom">
          <Link href="/" target="_blank">
            사용자 사이트 ↗
          </Link>
          <form action={logout}>
            <button>로그아웃</button>
          </form>
        </div>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
