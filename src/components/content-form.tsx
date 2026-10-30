import Link from "next/link";
import {
  type AdminContent,
  categories,
  platforms,
  difficulties,
  reviewLabels,
  methodLabels,
} from "@/lib/admin";
import { saveContent, setContentStatus } from "@/app/admin/actions";
import { PageHeading, Notice } from "./admin-common";
export default function ContentForm({
  content,
  error,
}: {
  content?: AdminContent;
  error?: string;
}) {
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  return (
    <>
      <PageHeading
        section="콘텐츠 관리"
        title={content ? "콘텐츠 상세 · 수정" : "새 콘텐츠 등록"}
        description="하나의 콘텐츠가 하나의 문제 후보가 됩니다. 노출 기간과 출제 순서는 회차에서 설정하세요."
        action={
          <Link className="admin-button subtle" href="/admin/contents">
            ← 목록으로
          </Link>
        }
      />
      <Notice error={error} />
      {content?.collection_method === "sample" && (
        <div className="feedback sample">
          기능 확인용 샘플입니다. 실제 인물·계정·트렌드 정보가 아닙니다.
        </div>
      )}
      <form action={saveContent} className="content-edit-form">
        <input type="hidden" name="id" value={content?.id || ""} />
        <div className="editor-columns">
          <section className="library-panel form-panel">
            <div className="panel-heading">
              <div>
                <h2>문제 기본 정보</h2>
                <p>사용자에게 보여줄 콘텐츠와 출처를 정리해 주세요.</p>
              </div>
              <span className="required-note">* 필수 항목</span>
            </div>
            <div className="form-body">
              <label>
                제목 *
                <input
                  name="title"
                  maxLength={200}
                  defaultValue={content?.title || ""}
                  placeholder="예: 콘텐츠를 알아보기 쉬운 제목"
                  required
                />
              </label>
              <div className="form-grid">
                <label>
                  계정 / 크리에이터
                  <input
                    name="creator"
                    maxLength={200}
                    defaultValue={content?.creator || ""}
                    placeholder="활동명 또는 계정명"
                  />
                </label>
                <label>
                  계정 URL
                  <input
                    name="account_url"
                    type="url"
                    pattern="https://.*"
                    defaultValue={content?.account_url || ""}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <label>
                알고리즘 콘텐츠 URL *
                <input
                  name="source_url"
                  type="url"
                  pattern="https://.*"
                  defaultValue={content?.source_url || ""}
                  placeholder="문제로 보여줄 게시물 또는 영상의 HTTPS 주소"
                  required
                />
                <small>
                  계정 주소와 구분해 실제 콘텐츠의 원본 링크를 입력하세요.
                </small>
              </label>
              <div className="form-grid">
                <label>
                  발견일 *
                  <input
                    name="discovered_at"
                    type="date"
                    defaultValue={content?.discovered_at || today}
                    required
                  />
                </label>
                <label>
                  유행 시작일
                  <input
                    name="trending_at"
                    type="date"
                    defaultValue={content?.trending_at || ""}
                  />
                </label>
              </div>
              <div className="form-grid three">
                {[
                  ["category", "유형", categories],
                  ["platform", "플랫폼", platforms],
                  ["difficulty", "난이도", difficulties],
                ].map(([name, label, options]) => (
                  <label key={String(name)}>
                    {label}
                    <select
                      name={String(name)}
                      defaultValue={
                        content?.[
                          name as "category" | "platform" | "difficulty"
                        ] || undefined
                      }
                    >
                      {(options as readonly string[]).map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label>
                설명
                <textarea
                  name="description"
                  rows={4}
                  maxLength={1000}
                  defaultValue={content?.description || ""}
                  placeholder="어떤 콘텐츠인지 짧고 명확하게 설명해 주세요."
                />
              </label>
              <details className="media-options">
                <summary>대표 이미지 URL (선택)</summary>
                <label>
                  썸네일 URL
                  <input
                    name="thumbnail_url"
                    type="url"
                    pattern="https://.*"
                    defaultValue={content?.thumbnail_url || ""}
                    placeholder="이미지가 없으면 유형별 대체 화면을 표시해요."
                  />
                </label>
              </details>
            </div>
          </section>
          <aside className="editor-side">
            <section className="library-panel form-panel">
              <div className="panel-heading">
                <h2>검토 · 운영</h2>
              </div>
              <div className="form-body">
                <label>
                  검토 상태
                  <select
                    name="status"
                    defaultValue={content?.status || "pending"}
                  >
                    {Object.entries(reviewLabels).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="field-note">
                  승인된 콘텐츠만 문제 노출 관리에서 선택할 수 있습니다.
                  승인만으로 사용자에게 노출되지는 않아요.
                </p>
                {content && (
                  <div className="content-facts">
                    <span>
                      등록 경로
                      <strong>{methodLabels[content.collection_method]}</strong>
                    </span>
                    <span>
                      회차 사용<strong>{content.use_count}개</strong>
                    </span>
                  </div>
                )}
                <label>
                  관리자 메모
                  <textarea
                    name="admin_notes"
                    rows={5}
                    maxLength={2000}
                    defaultValue={content?.admin_notes || ""}
                    placeholder="검토 근거, 확인할 내용 등 내부 메모"
                  />
                </label>
                <p className="field-note">
                  관리자 메모는 사용자에게 공개되지 않습니다.
                </p>
                <button className="admin-button primary wide">
                  {content ? "변경사항 저장" : "콘텐츠 등록"}
                </button>
                <Link
                  className="admin-button subtle wide"
                  href="/admin/contents"
                >
                  취소
                </Link>
              </div>
            </section>
            {content && (
              <div className="muted-box">
                이미 발행한 회차의 문제는 당시 내용으로 보존됩니다. 콘텐츠를
                수정해도 과거 결과는 바뀌지 않아요.
              </div>
            )}
          </aside>
        </div>
      </form>
      {content && content.status !== "inactive" && (
        <form action={setContentStatus} className="deactivate-form">
          <input type="hidden" name="id" value={content.id} />
          <input type="hidden" name="status" value="inactive" />
          <button className="danger-link">이 콘텐츠 비활성화</button>
          <span>기존 발행 기록은 유지하고, 신규 출제 후보에서 제외합니다.</span>
        </form>
      )}
    </>
  );
}
