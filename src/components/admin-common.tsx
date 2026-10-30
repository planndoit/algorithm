import Link from "next/link";
export function Notice({ error, saved }: { error?: string; saved?: string }) {
  if (saved)
    return (
      <div className="feedback success" role="status">
        {saved}
      </div>
    );
  if (!error) return null;
  const messages: Record<string, string> = {
    validation: "필수 항목과 URL·날짜를 확인해 주세요.",
    content:
      "저장하지 못했어요. 같은 콘텐츠 URL이 이미 등록되어 있는지 확인해 주세요.",
    quiz: "저장하지 못했어요. 승인된 콘텐츠를 중복 없이 선택하고 노출 기간을 확인해 주세요.",
    publish:
      "발행하지 못했어요. 승인된 10문제와 겹치지 않는 노출 기간이 필요합니다.",
    locked: "발행한 회차는 수정할 수 없어요. 새 회차를 만들어 주세요.",
  };
  return (
    <div className="feedback error" role="alert">
      {messages[error] || "처리하지 못했어요. 다시 시도해 주세요."}
    </div>
  );
}
export function PageHeading({
  section,
  title,
  description,
  action,
}: {
  section: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <div className="workspace-breadcrumb">
          운영 관리 <span>/</span> {section}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Stats({
  items,
}: {
  items: { label: string; value: number; note: string }[];
}) {
  return (
    <section className="admin-stats">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>
            {item.value.toLocaleString()}
            <small>개</small>
          </strong>
          <p>{item.note}</p>
        </div>
      ))}
    </section>
  );
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
}) {
  return (
    <div className="admin-empty">
      <span>✳</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <Link className="admin-button primary" href={href}>
        {label}
      </Link>
    </div>
  );
}
