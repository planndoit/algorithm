"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="narrow">
      <h1>잠시 연결이 원활하지 않아요.</h1>
      <p>잠시 후 다시 시도해 주세요.</p>
      <button className="button primary" onClick={reset}>
        다시 불러오기
      </button>
    </main>
  );
}
