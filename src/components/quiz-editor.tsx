"use client";
import { useState } from "react";
import Link from "next/link";
import {
  type Candidate,
  type AdminQuiz,
  categories,
  reviewLabels,
  kstInput,
} from "@/lib/admin";
import { saveQuiz } from "@/app/admin/actions";
export default function QuizEditor({
  contents,
  initial,
}: {
  contents: Candidate[];
  initial?: AdminQuiz;
}) {
  const [selected, setSelected] = useState<string[]>(
    initial?.quiz_questions
      .toSorted((a, b) => a.position - b.position)
      .map((q) => q.content_id) || [],
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const candidates = contents.filter(
    (c) =>
      c.status === "approved" &&
      (!category || c.category === category) &&
      `${c.title} ${c.creator}`.toLowerCase().includes(search.toLowerCase()),
  );
  const map = new Map(contents.map((c) => [c.id, c]));
  const now = new Date();
  const startDefault = new Date(now.getTime() + 3600000);
  const endDefault = new Date(now.getTime() + 7 * 86400000 + 3600000);
  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length < 10
          ? [...current, id]
          : current,
    );
  }
  function move(index: number, direction: number) {
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }
  return (
    <form action={saveQuiz} className="quiz-edit-form">
      <input type="hidden" name="id" value={initial?.id || ""} />
      <input type="hidden" name="ordered_ids" value={selected.join(",")} />
      <section className="library-panel form-panel">
        <div className="panel-heading">
          <div>
            <h2>노출 기간 설정</h2>
            <p>
              발행하면 시작 시각에 자동 노출되고, 종료 시각에 홈에서 내려갑니다.
            </p>
          </div>
          <span className="timezone-label">Asia/Seoul · KST</span>
        </div>
        <div className="form-body">
          <label>
            회차 제목 *
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={initial?.title || ""}
              placeholder="예: 11월 첫째 주 알고리즘력 테스트"
            />
          </label>
          <div className="form-grid">
            <label>
              노출 시작 *
              <input
                type="datetime-local"
                name="starts_at"
                required
                defaultValue={kstInput(
                  initial?.starts_at || startDefault.toISOString(),
                )}
              />
            </label>
            <label>
              노출 종료 *
              <input
                type="datetime-local"
                name="ends_at"
                required
                defaultValue={kstInput(
                  initial?.ends_at || endDefault.toISOString(),
                )}
              />
            </label>
          </div>
          <p className="field-note">
            한국 시간 기준입니다. 다른 발행 회차와 기간이 겹치면 발행할 수
            없습니다.
          </p>
        </div>
      </section>
      <div className="question-picker">
        <section className="library-panel candidate-panel">
          <div className="panel-heading">
            <div>
              <h2>
                출제 가능한 콘텐츠{" "}
                <span>
                  {contents.filter((c) => c.status === "approved").length}
                </span>
              </h2>
              <p>등록된 문제를 선택해 오른쪽 출제 목록에 담으세요.</p>
            </div>
            <Link href="/admin/contents">콘텐츠 관리 ↗</Link>
          </div>
          <div className="picker-filters">
            <label>
              <span className="sr-only">출제 콘텐츠 검색</span>
              <input
                placeholder="제목 또는 크리에이터 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">출제 콘텐츠 유형</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">모든 유형</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="candidate-list">
            {candidates.map((c) => {
              const active = selected.includes(c.id);
              return (
                <label
                  className={
                    active ? "candidate-card selected" : "candidate-card"
                  }
                  key={c.id}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={!active && selected.length >= 10}
                    onChange={() => toggle(c.id)}
                    aria-label={`${c.title} 선택`}
                  />
                  <span className="candidate-icon">
                    {(
                      {
                        인물: "☺",
                        밈: "✦",
                        유행어: "❝",
                        챌린지: "↗",
                        "화제 콘텐츠": "▷",
                      } as Record<string, string>
                    )[c.category] || "✳"}
                  </span>
                  <span className="candidate-copy">
                    <strong>{c.title}</strong>
                    <small>{c.creator || "크리에이터 미등록"}</small>
                    <span>
                      {c.category} · {c.platform} · {c.difficulty}
                      {c.collection_method === "sample" && <b>샘플</b>}
                    </span>
                  </span>
                  {active && <span className="selection-check">✓</span>}
                </label>
              );
            })}
            {!candidates.length && (
              <div className="picker-empty">
                선택할 수 있는 콘텐츠가 없어요.
                <br />
                콘텐츠 관리에서 문제를 승인해 주세요.
              </div>
            )}
          </div>
        </section>
        <aside className="library-panel selection-panel">
          <div className="panel-heading">
            <div>
              <h2>
                출제 목록{" "}
                <span
                  className={selected.length === 10 ? "count-complete" : ""}
                >
                  {selected.length} / 10
                </span>
              </h2>
              <p>위에서부터 차례대로 보여줍니다.</p>
            </div>
          </div>
          <ol className="selected-list">
            {selected.map((id, index) => {
              const c = map.get(id);
              return (
                <li key={id}>
                  <span className="question-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{c?.title || "콘텐츠를 찾을 수 없어요"}</strong>
                    <small>
                      {c?.status !== "approved"
                        ? `출제 불가 · ${c ? reviewLabels[c.status] : "삭제됨"}`
                        : c.category + " · " + c.platform}
                    </small>
                  </div>
                  <div className="reorder-actions">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`${index + 1}번 문제 위로`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === selected.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`${index + 1}번 문제 아래로`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(id)}
                      aria-label={`${index + 1}번 문제 제거`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {!selected.length && (
            <div className="picker-empty">
              <span>＋</span>
              <p>
                왼쪽 목록에서
                <br />
                이번 회차에 담을 문제를 골라주세요.
              </p>
            </div>
          )}
          <div className="selection-footer">
            <p>
              {selected.length === 10
                ? "10문제를 모두 골랐어요. 저장 후 미리보기에서 발행할 수 있어요."
                : `발행하려면 ${10 - selected.length}문제를 더 선택해 주세요.`}
            </p>
            {selected.some(
              (id) => map.get(id)?.collection_method === "sample",
            ) && (
              <div className="sample-note">
                샘플 콘텐츠가 포함된 테스트 회차입니다.
              </div>
            )}
          </div>
        </aside>
      </div>
      <div className="editor-savebar">
        <Link className="admin-button subtle" href="/admin/exposure">
          취소
        </Link>
        <span>초안은 0~10문제로 저장할 수 있습니다.</span>
        <button className="admin-button primary">초안 저장 · 미리보기</button>
      </div>
    </form>
  );
}
