import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: "이번 주 알고리즘력 테스트",
  description: "요즘 인터넷에서 핫한 것들, 얼마나 알고 있어? 10문제, 약 1분.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header>
          <Link href="/" className="brand">
            <span className="brand-icon">
              a<span>↗</span>
            </span>{" "}
            알고리즘력<span className="edition">WEEKLY TEST</span>
          </Link>
          <span className="header-note">매주 새롭게, 나의 인터넷 감각</span>
        </header>
        {children}
        <footer>
          <Link href="/">알고리즘력</Link>
          <span>얼마나 아는지보다, 얼마나 재밌는지.</span>
          <Link href="/admin">관리자</Link>
        </footer>
      </body>
    </html>
  );
}
