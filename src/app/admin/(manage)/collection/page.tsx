import Link from "next/link";
import { redirect } from "next/navigation";
import { query, requireAdmin } from "@/lib/db";
import { type Settings, type SourceResult } from "@/lib/collection/model";
import { formatKst } from "@/lib/admin";
import { PageHeading, Notice } from "@/components/admin-common";
import InstagramConnection from "@/components/instagram-connection";
import { instagramConfig } from "@/lib/collection/instagram";
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
  skipped: "실행 안 함",
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
    skipped:
      "수집을 실행하지 않았습니다. 자동 수집 설정과 Instagram 인증 상태를 확인해 주세요.",
  };
  return (
    <>
      <PageHeading
        section="자동 수집"
        title="자동 수집"
        description="인기 후보를 발견하고, 관리자가 검토할 수 있도록 저장합니다."
        action={
          <form action={collectNow}>
            <CollectButton
              disabled={!settings.enabled || !instagramConfig(process.env)}
            />
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
              <h3>Instagram만 수집합니다</h3>
              <p>
                Bluesky·YouTube·TikTok 수집은 꺼져 있습니다. Instagram도 Meta
                인증 완료 후에만 실행됩니다.
              </p>
              <h3>1. 후보 발견 · 해시태그</h3>
              <p>
                등록한 해시태그의 공식 인기 게시물(top_media)을 조회합니다. 단순
                문구 일치 검색이 아니라 해당 해시태그 안에서 Instagram이 선정한
                인기 후보를 가져옵니다. 전체 Instagram을 지표만으로 검색하는
                API는 사용하지 않습니다.
              </p>
              <h3>2. 후보 선별 · 공개 반응</h3>
              <p>
                최근 7일·한국어·최소 좋아요 조건을 통과한 게시물을 시간당
                좋아요로 정렬합니다. 댓글 수는 제공될 때 함께 저장합니다. 현재
                댓글 수와 증가율은 선정 점수에 반영하지 않습니다.
              </p>
              <p>
                현재 해시태그 API에서 얻지 못하는 조회수·공유·저장 수는 추정하지
                않습니다. 연결한 본인 계정의 인사이트 분석과 타인의 바이럴
                게시물 발굴은 조회 가능한 데이터가 다릅니다.
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
