import Link from "next/link";
export default function NotFound() {
  return (
    <main className="narrow">
      <h1>아직 열리지 않은 페이지예요.</h1>
      <p>공개 전 테스트이거나 결과를 찾을 수 없어요.</p>
      <Link className="button primary" href="/">
        홈으로 돌아가기
      </Link>
    </main>
  );
}
