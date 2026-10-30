import Link from "next/link";
import { type AdminQuiz, exposure, formatKst } from "@/lib/admin";
import { changeQuiz } from "@/app/admin/actions";
import { PageHeading, Notice } from "./admin-common";
export default function ExposureDetail({
  quiz,
  error,
  saved,
  editor,
}: {
  quiz: AdminQuiz;
  error?: string;
  saved?: string;
  editor?: React.ReactNode;
}) {
  const state = exposure(quiz);
  return (
    <>
      <PageHeading
        section="문제 노출 관리"
        title={
          quiz.status === "draft" ? "회차 편집 · 미리보기" : "노출 회차 상세"
        }
        description="문제 구성과 노출 기간을 확인한 뒤 발행하세요."
        action={
          <Link className="admin-button subtle" href="/admin/exposure">
            ← 목록으로
          </Link>
        }
      />
      <Notice
        error={error}
        saved={
          saved
            ? "초안을 저장했어요. 문제와 기간을 확인한 뒤 발행해 주세요."
            : undefined
        }
      />
      {quiz.is_sample && (
        <div className="feedback sample">
          기능 확인용 샘플 회차입니다. 실제 트렌드 데이터가 아닙니다.
        </div>
      )}
      <section className="publication-summary library-panel">
        <div>
          <span className={`status-chip ${state.key}`}>{state.label}</span>
          <h2>{quiz.title}</h2>
          <p>
            {formatKst(quiz.starts_at)} → {formatKst(quiz.ends_at)}{" "}
            <small>KST</small>
          </p>
          <span className="field-note">
            {quiz.quiz_questions.length} / 10문제 ·{" "}
            {quiz.locked
              ? "발행된 문제와 기간은 수정할 수 없습니다."
              : "변경사항을 저장한 후 발행해 주세요."}
          </span>
        </div>
        <div className="publication-actions">
          {quiz.status === "draft" && (
            <form action={changeQuiz}>
              <input type="hidden" name="id" value={quiz.id} />
              <input type="hidden" name="status" value="published" />
              <button
                className="admin-button primary"
                disabled={quiz.quiz_questions.length !== 10}
              >
                이 회차 발행하기 ↗
              </button>
            </form>
          )}
          {quiz.status === "published" && (
            <>
              {state.key !== "scheduled" && (
                <Link
                  href={`/quiz/${quiz.id}`}
                  className="admin-button subtle"
                  target="_blank"
                >
                  사용자 화면 보기 ↗
                </Link>
              )}
              <form action={changeQuiz}>
                <input type="hidden" name="id" value={quiz.id} />
                <input type="hidden" name="status" value="ended" />
                <button className="admin-button danger">
                  {state.key === "scheduled" ? "예약 취소" : "노출 종료"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
      {editor || (
        <section className="library-panel">
          <div className="panel-heading">
            <div>
              <h2>출제된 문제</h2>
              <p>
                발행 당시의 내용을 보관합니다. 콘텐츠 저장소의 수정과
                별개입니다.
              </p>
            </div>
          </div>
          <ol className="snapshot-list">
            {quiz.quiz_questions
              .toSorted((a, b) => a.position - b.position)
              .map((q) => (
                <li key={q.content_id}>
                  <span className="question-number">
                    {String(q.position + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{q.snapshot.title}</strong>
                    <small>
                      {q.snapshot.category} · {q.snapshot.platform} ·{" "}
                      {q.snapshot.creator}
                    </small>
                    <p>{q.snapshot.description}</p>
                  </div>
                  <Link href={`/admin/contents/${q.content_id}`}>
                    콘텐츠 상세 ↗
                  </Link>
                </li>
              ))}
          </ol>
        </section>
      )}
    </>
  );
}
