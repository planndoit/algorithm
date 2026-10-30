import Link from "next/link";
import {
  type AdminContent,
  categories,
  reviewLabels,
  methodLabels,
} from "@/lib/admin";
import { PageHeading, Stats, Empty, Notice } from "./admin-common";
import { setContentStatus } from "@/app/admin/actions";
export default function ContentList({
  contents,
  search,
}: {
  contents: AdminContent[];
  search: {
    q?: string;
    status?: string;
    category?: string;
    method?: string;
    error?: string;
    saved?: string;
  };
}) {
  const filtered = contents.filter(
    (c) =>
      (!search.q ||
        `${c.title} ${c.creator}`
          .toLowerCase()
          .includes(search.q.toLowerCase())) &&
      (!search.status || c.status === search.status) &&
      (!search.category || c.category === search.category) &&
      (!search.method || c.collection_method === search.method),
  );
  return (
    <>
      <PageHeading
        section="콘텐츠 관리"
        title="콘텐츠 관리"
        description="문제 후보를 모으고, 검토하고, 출제 가능한 콘텐츠로 준비하세요."
        action={
          <Link className="admin-button primary" href="/admin/contents/new">
            ＋ 콘텐츠 등록
          </Link>
        }
      />
      <Notice
        error={search.error}
        saved={search.saved ? "콘텐츠를 저장했어요." : undefined}
      />
      <Stats
        items={[
          {
            label: "전체 콘텐츠",
            value: contents.length,
            note: "문제 후보 저장소",
          },
          {
            label: "검토 대기",
            value: contents.filter((c) => c.status === "pending").length,
            note: "내용 확인이 필요해요",
          },
          {
            label: "출제 가능",
            value: contents.filter((c) => c.status === "approved").length,
            note: "문제 노출 관리에서 선택",
          },
          {
            label: "회차에 사용됨",
            value: contents.filter((c) => c.use_count > 0).length,
            note: "발행 시점의 내용이 보존돼요",
          },
        ]}
      />
      <section className="library-panel">
        <div className="panel-heading">
          <div>
            <h2>
              콘텐츠 목록 <span>{filtered.length}</span>
            </h2>
            <p>
              자동 수집한 후보도 이 목록에 쌓이고, 관리자 검토 후 출제합니다.
            </p>
          </div>
          <span className="sample-hint">샘플 데이터는 별도로 표시돼요</span>
        </div>
        <form className="admin-filters" action="/admin/contents">
          <label className="search-field">
            <span className="sr-only">콘텐츠 검색</span>
            <input
              name="q"
              placeholder="제목 또는 크리에이터 검색"
              defaultValue={search.q}
            />
          </label>
          <label>
            <span className="sr-only">유형 필터</span>
            <select name="category" defaultValue={search.category || ""}>
              <option value="">모든 유형</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">검토 상태 필터</span>
            <select name="status" defaultValue={search.status || ""}>
              <option value="">모든 검토 상태</option>
              {Object.entries(reviewLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">등록 경로 필터</span>
            <select name="method" defaultValue={search.method || ""}>
              <option value="">모든 등록 경로</option>
              {Object.entries(methodLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-button subtle">검색</button>
          <Link href="/admin/contents" className="filter-reset">
            초기화
          </Link>
        </form>
        {filtered.length ? (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>콘텐츠</th>
                  <th>유형 · 플랫폼</th>
                  <th>검토 상태</th>
                  <th>발견일</th>
                  <th>등록 경로</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        className="content-title"
                        href={`/admin/contents/${c.id}`}
                      >
                        {c.title}
                      </Link>
                      <span className="table-sub">
                        {c.creator || "크리에이터 미등록"}{" "}
                        <span>· {c.difficulty}</span>
                      </span>
                      {c.use_count > 0 && (
                        <small className="used-note">
                          {c.use_count}개 회차에 포함
                        </small>
                      )}
                    </td>
                    <td>
                      <span className="category-tag">{c.category}</span>
                      <span className="table-sub">{c.platform}</span>
                    </td>
                    <td>
                      <span className={`status-chip ${c.status}`}>
                        {reviewLabels[c.status]}
                      </span>
                    </td>
                    <td className="date-cell">{c.discovered_at}</td>
                    <td>
                      <span className={`method-chip ${c.collection_method}`}>
                        {methodLabels[c.collection_method]}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/admin/contents/${c.id}`}>
                          상세 / 수정
                        </Link>
                        {c.status === "pending" && (
                          <form action={setContentStatus}>
                            <input type="hidden" name="id" value={c.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="approved"
                            />
                            <button>승인</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="조건에 맞는 콘텐츠가 없어요"
            description="검색 조건을 바꾸거나 새 문제 후보를 등록해 주세요."
            href="/admin/contents/new"
            label="콘텐츠 등록"
          />
        )}
      </section>
      <div className="workflow-guide">
        <span>01 수집 · 등록</span>
        <i>→</i>
        <span>02 관리자 검토 · 승인</span>
        <i>→</i>
        <Link href="/admin/exposure">03 문제 노출 관리에서 회차 구성 ↗</Link>
      </div>
    </>
  );
}
