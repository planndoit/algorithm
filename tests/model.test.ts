import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAnswers, outcome, submission } from "../src/lib/model";
test("all attainable scores and type boundaries", () => {
  const titles = [
    "현생 최강자",
    "현생 최강자",
    "현생 최강자",
    "가끔 인터넷 함",
    "가끔 인터넷 함",
    "가끔 인터넷 함",
    "알고리즘 주민",
    "알고리즘 주민",
    "알고리즘 원주민",
    "알고리즘 원주민",
    "알고리즘이 당신을 키움",
  ];
  for (let n = 0; n <= 10; n++) {
    const score = scoreAnswers(Array.from({ length: 10 }, (_, i) => i < n));
    assert.equal(score, n * 10);
    assert.equal(outcome(score).title, titles[n]);
  }
});
test("reject malformed, missing and non-boolean answers", () => {
  assert.throws(() => scoreAnswers([true]));
  for (const answers of [[], Array(11).fill(true), Array(10).fill("true")])
    assert.equal(
      submission.safeParse({
        quizId: "a",
        requestId: crypto.randomUUID(),
        answers,
      }).success,
      false,
    );
});
