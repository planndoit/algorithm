"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { demoQuiz, scoreAnswers } from "@/lib/model";
import ResultCard from "./result-card";
export default function DemoResult({ id }: { id: string }) {
  const [answers, setAnswers] = useState<boolean[] | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(id) || "null");
        scoreAnswers(saved.answers);
        setAnswers(saved.answers);
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, [id]);
  return answers ? (
    <ResultCard
      score={scoreAnswers(answers)}
      answers={answers}
      quiz={demoQuiz}
      isDemo
    />
  ) : (
    <main className="narrow">
      <h1>체험 결과</h1>
      <p>체험 결과는 테스트를 완료한 브라우저에서만 볼 수 있어요.</p>
      <Link className="button primary" href="/quiz/demo">
        체험 시작하기
      </Link>
    </main>
  );
}
