import { query, requireAdmin } from "@/lib/db";
import { formatKst } from "@/lib/admin";
export default async function CollectionEvidence({ id }: { id: string }) {
  await requireAdmin();
  const [evidence] = await query<{
    provider: string;
    published_at: string;
    first_seen_at: string;
    last_seen_at: string;
    metrics: Record<string, number>;
    previous_metrics: Record<string, number> | null;
    reason: string;
    score: number;
  }>(
    "select provider,published_at::text,first_seen_at::text,last_seen_at::text,metrics,previous_metrics,reason,score from public.collection_observations where content_id=$1",
    [id],
  );
  if (!evidence) return null;
  const labels: Record<string, string> = {
    views: "조회수",
    likes: "좋아요",
    reposts: "공유",
    replies: "댓글",
    comments: "댓글",
  };
  return (
    <section className="library-panel collection-evidence">
      <div className="panel-heading">
        <div>
          <h2>
            자동 수집 근거 ·{" "}
            {evidence.provider === "youtube"
              ? "YouTube"
              : evidence.provider === "instagram"
                ? "Instagram"
                : "Bluesky"}
          </h2>
          <p>{evidence.reason}</p>
        </div>
      </div>
      <div className="form-body">
        <p>
          {Object.entries(evidence.metrics)
            .map(
              ([k, v]) =>
                `${labels[k] || k} ${v.toLocaleString("ko-KR")}${evidence.previous_metrics && typeof evidence.previous_metrics[k] === "number" ? ` (이전 수집 대비 ${v - evidence.previous_metrics[k] >= 0 ? "+" : ""}${(v - evidence.previous_metrics[k]).toLocaleString("ko-KR")})` : ""}`,
            )
            .join(" · ")}
        </p>
        <p className="field-note">
          소스 내 수집 점수 {evidence.score.toLocaleString("ko-KR")} · 서로 다른
          플랫폼의 점수는 직접 비교하지 않습니다.
        </p>
        <p className="field-note">
          게시일 {formatKst(evidence.published_at)} · 최초 발견{" "}
          {formatKst(evidence.first_seen_at)} · 지표 갱신{" "}
          {formatKst(evidence.last_seen_at)}
        </p>
        <p className="field-note">
          소스 내 수집 점수 {evidence.score.toLocaleString("ko-KR")} · 서로 다른
          플랫폼의 점수는 직접 비교하지 않습니다.
        </p>
        <p className="field-note">
          게시일과 유행 시작일은 다릅니다. 수집 지표는 발견 시점의 값이며, 유행
          여부·유형·난이도는 관리자 확인이 필요합니다.
        </p>
      </div>
    </section>
  );
}
