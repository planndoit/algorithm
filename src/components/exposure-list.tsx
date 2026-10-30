import Link from "next/link";
import { type AdminQuiz, exposure, formatKst } from "@/lib/admin";
import { PageHeading, Stats, Empty, Notice } from "./admin-common";
export default function ExposureList({
  quizzes,
  search,
}: {
  quizzes: AdminQuiz[];
  search: { status?: string; error?: string; saved?: string };
}) {
  const now = new Date().getTime();
  const filtered = quizzes.filter(
    (q) => !search.status || exposure(q, now).key === search.status,
  );
  return (
    <>
      <PageHeading
        section="문제 노출 관리"
        title="문제 노출 관리"
        description="콘텐츠 저장소에서 문제를 골라 회차를 만들고, 기간별로 노출하세요."
        action={
          <Link className="admin-button primary" href="/admin/exposure/new">
            ＋ 새 노출 회차
          </Link>
        }
      />
      <Notice
        error={search.error}
        saved={search.saved ? "회차 상태를 변경했어요." : undefined}
      />
      <Stats
        items={[
          {
            label: "노출 중",
            value: quizzes.filter((q) => exposure(q, now).key === "live")
              .length,
            note: "지금 사용자 홈에 표시",
          },
          {
            label: "예약된 회차",
            value: quizzes.filter((q) => exposure(q, now).key === "scheduled")
              .length,
            note: "시작 시각에 자동 노출",
          },
          {
            label: "임시저장",
            value: quizzes.filter((q) => q.status === "draft").length,
            note: "문제와 기간을 편집하세요",
          },
          {
            label: "전체 회차",
            value: quizzes.length,
            note: "종료된 기록도 보관",
          },
        ]}
      />
      <section className="library-panel">
        <div className="panel-heading">
          <div>
            <h2>기간별 노출 목록</h2>
            <p>회차마다 10문제 · 한국 시간 기준 · 발행 회차의 기간 중복 불가</p>
          </div>
          <span className="timezone-label">KST</span>
        </div>
        <nav className="admin-tabs" aria-label="노출 상태 필터">
          {[
            ["", "전체"],
            ["live", "노출 중"],
            ["scheduled", "예약됨"],
            ["draft", "임시저장"],
            ["ended", "종료"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={key ? `/admin/exposure?status=${key}` : "/admin/exposure"}
              className={(search.status || "") === key ? "active" : ""}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="exposure-list">
          {filtered.map((q) => {
            const state = exposure(q, now);
            return (
              <article className="exposure-card" key={q.id}>
                <div className="exposure-marker">
                  <span className={`status-dot ${state.key}`} />
                  <span>{q.status === "draft" ? "DRAFT" : "QUIZ"}</span>
                </div>
                <div className="exposure-copy">
                  <div className="exposure-title">
                    <Link href={`/admin/exposure/${q.id}`}>{q.title}</Link>
                    <span className={`status-chip ${state.key}`}>
                      {state.label}
                    </span>
                    {q.is_sample && (
                      <span className="method-chip sample">샘플</span>
                    )}
                  </div>
                  <p className="exposure-dates">
                    {formatKst(q.starts_at)} <span>→</span>{" "}
                    {formatKst(q.ends_at)}
                  </p>
                  <div className="exposure-meta">
                    <span>▤ {q.quiz_questions.length} / 10문제</span>
                    <span>
                      {q.locked
                        ? "발행한 문제 구성은 보존됩니다"
                        : "문제 선택 · 순서 · 기간 편집 가능"}
                    </span>
                  </div>
                </div>
                <Link
                  className="admin-button subtle"
                  href={`/admin/exposure/${q.id}`}
                >
                  {q.status === "draft" ? "편집 / 미리보기" : "회차 보기"} →
                </Link>
              </article>
            );
          })}
          {!filtered.length && (
            <Empty
              title="이 상태의 회차가 아직 없어요"
              description="승인된 콘텐츠를 골라 첫 노출 회차를 만들어 보세요."
              href="/admin/exposure/new"
              label="새 노출 회차 만들기"
            />
          )}
        </div>
      </section>
      <div className="workflow-guide">
        <span>초안 구성</span>
        <i>→</i>
        <span>10문제 확인 · 발행</span>
        <i>→</i>
        <span>시작 시각에 자동 노출</span>
        <i>→</i>
        <span>종료 후 기록 보존</span>
      </div>
    </>
  );
}
