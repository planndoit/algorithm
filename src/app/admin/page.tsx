import { adminData } from "@/lib/data";
import Link from "next/link";
import { configured, authConfigured, requireAdmin } from "@/lib/db";
import {
  login,
  logout,
  saveContent,
  removeContent,
  saveQuiz,
  changeQuiz,
} from "./actions";
export const dynamic = "force-dynamic";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    quiz?: string;
    category?: string;
    error?: string;
    preview?: string;
  }>;
}) {
  const search = await searchParams;
  if (!configured() || !authConfigured())
    return (
      <main className="narrow">
        <span className="eyebrow">ADMIN SETUP</span>
        <h1>운영 준비를 시작해요.</h1>
        <p>
          Neon DB와 관리자 인증을 설정하면 관리자 로그인을 사용할 수 있어요.
        </p>
        <p>설정 방법은 프로젝트의 README.md에 정리했습니다.</p>
        <Link className="button primary" href="/">
          홈으로
        </Link>
      </main>
    );
  let allowed = false;
  try {
    await requireAdmin();
    allowed = true;
  } catch {}
  if (!allowed)
    return (
      <main className="narrow">
        <h1>관리자 로그인</h1>
        <p>초대된 관리자만 접근할 수 있어요.</p>
        <form action={login}>
          <label>
            이메일
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            비밀번호
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button primary">로그인</button>
        </form>
        {search.error && <p role="alert">로그인 정보를 확인해 주세요.</p>}
        <Link className="button secondary" href="/admin/password">
          처음 로그인 / 비밀번호 재설정
        </Link>
      </main>
    );
  const { contents, quizzes } = await adminData();
  const editing = contents?.find((c) => c.id === search.edit);
  const editingQuiz = quizzes?.find(
    (q) => q.id === search.quiz && q.status === "draft",
  );
  const preview = quizzes?.find((q) => q.id === search.preview);
  return (
    <main className="admin">
      <div className="admin-title">
        <div>
          <span className="eyebrow">CONTROL ROOM</span>
          <h1>이번 주의 발견을 준비해요.</h1>
        </div>
        <form action={logout}>
          <button className="text-button">로그아웃</button>
        </form>
      </div>
      {search.error && (
        <div className="notice" role="alert">
          {(
            {
              validation: "입력값과 날짜, URL을 확인해 주세요.",
              content: "저장 실패: 중복 URL 또는 입력값을 확인해 주세요.",
              quiz: "초안 저장 실패: 승인 상태와 회차를 확인해 주세요.",
              publish:
                "발행 실패: 승인된 10문제, 공개 일정 중복 여부를 확인해 주세요.",
            } as Record<string, string>
          )[search.error] || "처리하지 못했어요."}
        </div>
      )}
      <section className="admin-panel">
        <h2>{editing ? "콘텐츠 수정" : "콘텐츠 등록"}</h2>
        <form action={saveContent}>
          <input type="hidden" name="id" value={editing?.id || ""} />
          <div className="form-grid">
            {[
              ["title", "제목", "text"],
              ["creator", "계정 / 크리에이터", "text"],
              ["source_url", "원본 URL (HTTPS)", "url"],
              ["video_url", "대표 영상 URL", "url"],
              ["thumbnail_url", "썸네일 URL", "url"],
              ["discovered_at", "발견일", "date"],
              ["trending_at", "유행 시작일", "date"],
              ["metrics", "참고 지표", "text"],
            ].map(([name, label, type]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={type}
                  defaultValue={
                    editing?.[name] ||
                    (name === "discovered_at"
                      ? new Date().toISOString().slice(0, 10)
                      : "")
                  }
                  required={["title", "source_url", "discovered_at"].includes(
                    name,
                  )}
                />
              </label>
            ))}
            {[
              [
                "category",
                "유형",
                ["인물", "밈", "유행어", "챌린지", "화제 콘텐츠"],
              ],
              [
                "platform",
                "플랫폼",
                ["Instagram", "TikTok", "YouTube", "Threads", "기타"],
              ],
              ["difficulty", "난이도", ["쉬움", "보통", "어려움"]],
              [
                "status",
                "승인 상태",
                ["pending", "approved", "excluded", "inactive"],
              ],
            ].map(([name, label, options]) => (
              <label key={String(name)}>
                {label}
                <select
                  name={String(name)}
                  defaultValue={
                    editing?.[String(name)] ||
                    (name === "status" ? "pending" : undefined)
                  }
                >
                  {(options as string[]).map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label>
            짧은 설명
            <textarea
              name="description"
              defaultValue={editing?.description || ""}
            />
          </label>
          <label>
            관리자 메모 (비공개)
            <textarea
              name="admin_notes"
              defaultValue={editing?.admin_notes || ""}
            />
          </label>
          <button className="button primary">
            {editing ? "수정 저장" : "콘텐츠 등록"}
          </button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>콘텐츠 풀 · {contents?.length || 0}</h2>
        <div className="filters">
          <Link href="/admin">전체</Link>
          {["인물", "밈", "유행어", "챌린지", "화제 콘텐츠"].map((c) => (
            <Link key={c} href={`/admin?category=${encodeURIComponent(c)}`}>
              {c}
            </Link>
          ))}
        </div>
        {contents
          ?.filter((c) => !search.category || c.category === search.category)
          .map((c) => (
            <article className="admin-row" key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <p>
                  {c.category} · {c.platform} · {c.status}
                </p>
                <code>{c.id}</code>
              </div>
              <Link href={`/admin?edit=${c.id}`}>수정 / 승인</Link>
              <form action={removeContent}>
                <input type="hidden" name="id" value={c.id} />
                <button>비활성화</button>
              </form>
            </article>
          ))}
      </section>
      <section className="admin-panel">
        <h2>{editingQuiz ? "회차 초안 수정" : "새 회차 만들기"}</h2>
        <form action={saveQuiz}>
          <input type="hidden" name="id" value={editingQuiz?.id || ""} />
          <label>
            제목
            <input
              name="title"
              defaultValue={editingQuiz?.title || ""}
              required
            />
          </label>
          <div className="form-grid">
            <label>
              시작 (시간대 포함)
              <input
                name="starts_at"
                placeholder="2026-11-06T00:00:00+09:00"
                defaultValue={editingQuiz?.starts_at || ""}
                required
              />
            </label>
            <label>
              종료 (시간대 포함)
              <input
                name="ends_at"
                placeholder="2026-11-13T00:00:00+09:00"
                defaultValue={editingQuiz?.ends_at || ""}
                required
              />
            </label>
          </div>
          <label>
            승인된 콘텐츠 ID를 출제 순서대로 입력 (쉼표 / 줄바꿈 구분)
            <textarea
              name="ordered_ids"
              rows={8}
              defaultValue={
                editingQuiz?.quiz_questions
                  .sort(
                    (a: { position: number }, b: { position: number }) =>
                      a.position - b.position,
                  )
                  .map((q: { content_id: string }) => q.content_id)
                  .join("\n") || ""
              }
            />
          </label>
          <p className="fine">
            초안은 0~10개로 저장할 수 있어요. 발행하려면 정확히 10개가 필요해요.
          </p>
          <button className="button primary">초안 저장</button>
        </form>
      </section>
      <section className="admin-panel">
        <h2>회차 관리</h2>
        {quizzes?.map((q) => (
          <article className="admin-row" key={q.id}>
            <div>
              <strong>{q.title}</strong>
              <p>
                {q.status} · {q.quiz_questions.length}문제
              </p>
              <small>
                {q.starts_at} → {q.ends_at}
              </small>
            </div>
            <Link href={`/admin?preview=${q.id}`}>미리보기</Link>
            {q.status === "draft" && (
              <Link href={`/admin?quiz=${q.id}`}>초안 수정</Link>
            )}
            <form action={changeQuiz}>
              <input type="hidden" name="id" value={q.id} />
              <input
                type="hidden"
                name="status"
                value={q.status === "draft" ? "published" : "ended"}
              />
              {q.status !== "ended" && (
                <button>
                  {q.status === "draft" ? "발행" : "종료 / 발행 취소"}
                </button>
              )}
            </form>
          </article>
        ))}
      </section>
      {preview && (
        <section className="admin-panel">
          <h2>미리보기 · {preview.title}</h2>
          {preview.quiz_questions
            .sort(
              (a: { position: number }, b: { position: number }) =>
                a.position - b.position,
            )
            .map(
              (q: {
                position: number;
                snapshot: { title: string; description: string };
              }) => (
                <div className="unknown-item" key={q.position}>
                  <strong>
                    {q.position + 1}. {q.snapshot.title}
                  </strong>
                  <p>{q.snapshot.description}</p>
                </div>
              ),
            )}
        </section>
      )}
    </main>
  );
}
