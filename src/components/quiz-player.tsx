"use client";
/* eslint-disable @next/next/no-img-element -- User supplied external thumbnails use onError fallbacks without image proxying. */
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Quiz } from "@/lib/model";
export default function QuizPlayer({ quiz }: { quiz: Quiz }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const locked = useRef(false);
  const key = `quiz-progress:${quiz.id}`;
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const s = JSON.parse(localStorage.getItem(key) || "null");
        if (
          s &&
          Array.isArray(s.answers) &&
          s.answers.length <= 10 &&
          s.answers.every((a: unknown) => typeof a === "boolean")
        ) {
          setAnswers(s.answers);
          setIndex(
            Number.isInteger(s.index) &&
              s.index >= 0 &&
              s.index <= Math.min(s.answers.length, 9)
              ? s.index
              : Math.min(s.answers.length, 9),
          );
        }
      } catch {}
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [key]);
  async function submit(next: boolean[]) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      let requestId = localStorage.getItem(`${key}:request`);
      if (!requestId) {
        requestId = crypto.randomUUID();
        localStorage.setItem(`${key}:request`, requestId);
      }
      if (quiz.id === "demo") {
        const id = `demo-${requestId}`;
        localStorage.setItem(id, JSON.stringify({ answers: next }));
        router.push(`/result/${id}`);
        return;
      }
      const res = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, requestId, answers: next }),
      });
      const data = await res.json();
      if (!res.ok) throw Error(data.error || "저장하지 못했어요.");
      localStorage.removeItem(key);
      router.push(`/result/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "다시 시도해 주세요.");
      locked.current = false;
      setBusy(false);
    }
  }
  function answer(value: boolean) {
    if (busy) return;
    const next = [...answers];
    next[index] = value;
    setAnswers(next);
    const nextIndex = Math.min(index + 1, 9);
    localStorage.setItem(
      key,
      JSON.stringify({ answers: next, index: nextIndex }),
    );
    if (index === 9) {
      void submit(next);
      return;
    }
    setIndex(nextIndex);
    setImageFailed(false);
  }
  const q = quiz.questions[index];
  if (!ready) return <main className="narrow">테스트 불러오는 중…</main>;
  return (
    <main className="narrow">
      <div className="quiz-heading">
        <button
          className="text-button"
          disabled={index === 0 || busy}
          onClick={() => {
            setIndex(index - 1);
            setImageFailed(false);
          }}
        >
          ← 이전
        </button>
        <span>{quiz.id === "demo" ? "체험판" : "이번 주 알고리즘력"}</span>
        <strong>
          {index + 1}
          <span className="muted"> / 10</span>
        </strong>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={index + 1}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label="문제 진행률"
      >
        <div style={{ width: `${(index + 1) * 10}%` }} />
      </div>
      <section className="question" key={q.id}>
        <span className="eyebrow">
          QUESTION {String(index + 1).padStart(2, "0")} · {q.category}
        </span>
        <h1>이거 알아?</h1>
        <div className="question-art">
          {q.thumbnail_url && !imageFailed ? (
            <img
              loading="eager"
              src={q.thumbnail_url}
              alt={q.title}
              onError={() => setImageFailed(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <span>{q.emoji || "✳"}</span>
              <small>
                {quiz.id === "demo" ? "SAMPLE CONTENT" : "콘텐츠 미리보기"}
              </small>
            </>
          )}
        </div>
        <span className="badge">{q.platform}</span>
        <h2>{q.title}</h2>
        <p className="muted">{q.creator}</p>
        {q.source_url && (
          <a
            href={q.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="source"
          >
            공식 원본 보기 ↗
          </a>
        )}
        <div className="answer-buttons">
          <button
            className="button primary"
            disabled={busy}
            onClick={() => answer(true)}
          >
            알아 😎
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => answer(false)}
          >
            처음 봐 👀
          </button>
        </div>
        <p className="fine">정답은 없어요. 솔직하게 눌러주세요.</p>
        {busy && <p role="status">결과를 만드는 중…</p>}
        {error && (
          <div role="alert" className="notice">
            {error}
            <button onClick={() => submit(answers)}>다시 저장</button>
          </div>
        )}
      </section>
    </main>
  );
}
