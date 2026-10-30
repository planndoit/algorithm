"use client";
import { useState } from "react";
import Link from "next/link";
import { outcome, type Quiz } from "@/lib/model";
import { Ad } from "./ad";
export default function ResultCard({
  score,
  answers,
  quiz,
  isDemo = false,
}: {
  score: number;
  answers: boolean[];
  quiz: Quiz;
  isDemo?: boolean;
}) {
  const type = outcome(score);
  const [message, setMessage] = useState("");
  async function share(native: boolean) {
    try {
      if (isDemo) {
        setMessage(
          "체험 결과는 이 브라우저에만 저장돼요. 실제 회차에서는 공유 링크가 생성됩니다.",
        );
        return;
      }
      const url = new URL(location.href);
      url.searchParams.set("ref", "share");
      const text = `${quiz.is_sample ? "[샘플 회차] " : ""}나 이번 주 알고리즘력 ${score}점 나왔어ㅋㅋ 너는 몇 점?`;
      if (native && navigator.share)
        await navigator.share({
          title: "이번 주 알고리즘력 테스트",
          text,
          url: url.toString(),
        });
      else {
        await navigator.clipboard.writeText(url.toString());
        setMessage("링크를 복사했어요!");
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setMessage("공유하지 못했어요. 주소창의 링크를 복사해 주세요.");
    }
  }
  return (
    <main className="narrow result">
      <span className="pill">
        {isDemo
          ? "DEMO RESULT · 체험 결과"
          : quiz.is_sample
            ? "SAMPLE RESULT · 샘플 회차 결과"
            : "YOUR ALGORITHM REPORT"}
      </span>
      <section className="score-card">
        <span className="eyebrow">이번 주 나의 알고리즘력</span>
        <div className="score">
          {score}
          <small> / 100</small>
        </div>
        <span className="result-emoji">{type.emoji}</span>
        <h1>{type.title}</h1>
        <p>{type.description}</p>
        <div className="score-line">
          <div style={{ width: `${score}%` }} />
        </div>
        <small>정답률이 아닌, 알고 있다고 응답한 콘텐츠의 비율이에요.</small>
      </section>
      <button className="button primary" onClick={() => share(true)}>
        친구에게 결과 공유하기 ↗
      </button>
      <button className="button secondary" onClick={() => share(false)}>
        링크 복사하기
      </button>
      <p role="status" className="fine">
        {message}
      </p>
      <Link href="/" className="button dark">
        나도 테스트하기 →
      </Link>
      <section className="unknown">
        <h2>내 알고리즘 밖의 발견</h2>
        <p className="muted">몰랐던 콘텐츠, 여기서 만나봐요.</p>
        {quiz.questions
          .filter((_, i) => !answers[i])
          .map((q) => (
            <div className="unknown-item" key={q.id}>
              <span>{q.emoji || "✳"}</span>
              <div>
                <strong>{q.title}</strong>
                <p>{q.description}</p>
                {q.source_url && !q.is_sample && (
                  <a
                    href={q.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    공식 원본 보기 ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        {answers.every(Boolean) && (
          <p>모두 알고 있었네요. 당신의 알고리즘 인정! 👑</p>
        )}
      </section>
      <p className="fine">다음 테스트는 홈에서 확인해 주세요.</p>
      <Ad />
    </main>
  );
}
