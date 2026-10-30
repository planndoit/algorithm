import Link from "next/link";
import { redirect } from "next/navigation";
import { query, requireAdmin } from "@/lib/db";
import { type Settings, type SourceResult } from "@/lib/collection/model";
import { formatKst } from "@/lib/admin";
import { PageHeading, Notice } from "@/components/admin-common";
import InstagramConnection from "@/components/instagram-connection";
import CollectButton from "@/components/collect-button";
import { saveSettings, collectNow } from "./actions";
export const maxDuration = 180;
type Run = {
  id: string;
  trigger: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  found_count: number;
  inserted_count: number;
  duplicate_count: number;
  source_results: SourceResult[];
  error: string;
  stalled: boolean;
};
const labels: Record<string, string> = {
  running: "수집 중",
  succeeded: "완료",
  partial: "일부 소스 실패",
  failed: "실패",
  skipped: "일시정지",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; result?: string }>;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin");
  }
  const [[settings], runs] = await Promise.all([
    query<Settings>("select * from public.collection_settings where id=true"),
    query<Run>(
      "select id,trigger,status,started_at::text,finished_at::text,found_count,inserted_count,duplicate_count,source_results,error,(status='running' and started_at<now()-interval '10 minutes') stalled from public.collection_runs order by started_at desc limit 30",
    ),
  ]);
  const search = await searchParams;
  const messages: Record<string, string> = {
    busy: "이미 실행했거나 수집 중입니다. 완료 후 10분, 실패 후 1분이 지나면 다시 실행할 수 있습니다.",
    succeeded:
      "수집을 완료했습니다. 새 후보는 콘텐츠 관리의 검토 대기에 추가했습니다.",
    partial:
      "가능한 소스의 후보를 저장했습니다. 실패한 소스는 실행 기록을 확인해 주세요.",
    failed: "수집에 실패했습니다. 소스별 기록을 확인하고 다시 실행해 주세요.",
    skipped: "수집이 일시정지되어 있습니다. 설정에서 다시 켜주세요.",
  };
  return (
    <>
      <PageHeading
        section="자동 수집"
        title="자동 수집"
        description="인기 후보를 발견하고, 관리자가 검토할 수 있도록 저장합니다."
        action={
          <form action={collectNow}>
            <CollectButton disabled={!settings.enabled} />
          </form>
        }
      />
      <Notice
        error={search.error}
        saved={search.saved ? "수집 설정을 저장했어요." : undefined}
      />
      {search.result && (
        <div
          role="status"
          className={`feedback ${["failed", "partial"].includes(search.result) ? "error" : "success"}`}
        >
          {messages[search.result] || "실행 기록을 확인해 주세요."}{" "}
          <Link href="/admin/contents?status=pending&method=auto">
            검토 대기 보기 →
          </Link>
        </div>
      )}
      <div className="editor-grid">
        <section className="library-panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>매일 한국 시간 오전 9시</h2>
              <p>
                Vercel Hobby에서는 오전 9~10시 사이 실행될 수 있습니다. 신규
                후보는 하루 최대 {settings.daily_limit}개입니다.
              </p>
            </div>
          </div>
          <form action={saveSettings} className="form-body">
            <label>
              <span>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={settings.enabled}
                />{" "}
                자동 수집 켜기
              </span>
            </label>
            <label>
              탐색 키워드
              <textarea
                name="keywords"
                rows={3}
                defaultValue={settings.keywords.join(", ")}
                required
                maxLength={247}
              />
            </label>
            <p className="field-note">
              쉼표로 구분해 최대 8개, 각 30자까지 입력하세요. 한국어 밈·유행
              후보를 찾습니다.
            </p>
            <label>
              하루 신규 등록 한도
              <input
                type="number"
                name="daily_limit"
                min={1}
                max={50}
                required
                defaultValue={settings.daily_limit}
              />
            </label>
            <label>
              Bluesky 최소 반응 점수
              <input
                type="number"
                name="bluesky_min_engagement"
                min={1}
                max={10000}
                required
                defaultValue={settings.bluesky_min_engagement}
              />
            </label>
            <label>
              YouTube 최소 조회수
              <input
                type="number"
                name="youtube_min_views"
                min={100}
                max={100000000}
                required
                defaultValue={settings.youtube_min_views}
              />
            </label>
            <label>
              Instagram 탐색 해시태그
              <textarea
                name="instagram_hashtags"
                rows={2}
                required
                maxLength={247}
                defaultValue={settings.instagram_hashtags.join(", ")}
              />
            </label>
            <p className="field-note">
              쉼표로 구분해 최대 8개. 공백 없이 입력하세요. Meta는 계정당 최근
              7일간 고유 해시태그를 30개까지 허용합니다. 다른 앱의 사용량도
              영향을 줍니다.
            </p>
            <label>
              Instagram 최소 좋아요
              <input
                type="number"
                name="instagram_min_likes"
                min={1}
                max={10000000}
                required
                defaultValue={settings.instagram_min_likes}
              />
            </label>
            <button className="admin-button primary">설정 저장</button>
          </form>
        </section>
        <aside className="editor-side">
          <section className="library-panel form-panel">
            <div className="panel-heading">
              <h2>수집 소스</h2>
            </div>
            <div className="form-body">
              <h3>Bluesky · 공개 API</h3>
              <p>
                최근 7일 한국어 키워드 검색에서 반응 점수(좋아요 + 공유×2 +
                댓글)를 통과한 게시물. 시간당 반응으로 정렬합니다. 인증키 없이
                요청하며 실제 연결 상태는 아래 실행 기록에 표시됩니다.
              </p>
              <h3>
                YouTube ·{" "}
                {process.env.YOUTUBE_API_KEY
                  ? "API 연결 설정됨"
                  : "API 키 연결 필요"}
              </h3>
              <p>
                최근 7일 키워드 검색의 4분 미만 영상 중 조회수 조건을 통과한
                후보. 시간당 조회수로 정렬합니다. Shorts와 일반 짧은 영상이 함께
                포함될 수 있습니다.
              </p>
              {!process.env.YOUTUBE_API_KEY && (
                <p className="field-note">
                  Google Cloud에서 YouTube Data API v3를 활성화하고 Vercel 운영
                  환경에 YOUTUBE_API_KEY를 추가한 뒤 재배포하세요. 키는 채팅이나
                  메모에 입력하지 마세요.
                </p>
              )}
              <h3>Instagram · 공식 해시태그 API</h3>
              <p>
                아래 Instagram 연결에서 인증 상태를 확인하세요. 지정한
                해시태그의 인기 게시물 중 최근 7일·한국어·최소 좋아요 조건을
                통과한 후보를 저장합니다.
              </p>
              <h3>TikTok</h3>
              <p>
                미연결. 전체 인기 피드에 대한 공식 API 접근이 제한되어 현재
                수집하지 않습니다.
              </p>
              <div className="muted-box">
                개인 추천 피드나 플랫폼 전체 인기 순위를 재현하지 않습니다.
                원문·반응 지표를 확인하고 승인한 뒤 출제하세요. 제목과 설명은
                원문을 바탕으로 저장하며 AI 분석은 아직 사용하지 않습니다.
              </div>
            </div>
          </section>
        </aside>
      </div>
      <InstagramConnection />
      <section className="library-panel">
        <div className="panel-heading">
          <div>
            <h2>최근 실행 기록</h2>
            <p>
              신규 등록 · 중복 발견 · 소스 오류를 구분합니다. 중복 후보의 지표만
              갱신하고 관리자 편집은 보존합니다.
            </p>
          </div>
        </div>
        {runs.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>실행 시각 (한국)</th>
                  <th>상태</th>
                  <th>후보 / 신규 / 중복</th>
                  <th>소스 결과</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {formatKst(run.started_at)}
                      <span className="table-sub">
                        {run.trigger === "cron"
                          ? "매일 자동 실행"
                          : "관리자 실행"}
                      </span>
                    </td>
                    <td>
                      {run.stalled
                        ? "중단됨 · 다음 실행에서 복구"
                        : labels[run.status]}
                    </td>
                    <td>
                      {run.found_count} / {run.inserted_count} /{" "}
                      {run.duplicate_count}
                    </td>
                    <td>
                      {run.source_results.map((s) => (
                        <span className="table-sub" key={s.source}>
                          {s.source}:{" "}
                          {s.status === "ok" ? `${s.found}개 후보` : s.message}
                        </span>
                      ))}
                      {run.error && (
                        <span className="table-sub">{run.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <h3>첫 수집을 시작해 보세요</h3>
            <p>
              ‘지금 수집하기’를 누르면 실제 소스에 연결해 후보를 가져옵니다.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
