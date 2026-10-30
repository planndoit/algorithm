import { query, requireAdmin } from "@/lib/db";
import { instagramConfig } from "@/lib/collection/instagram";
import { formatKst } from "@/lib/admin";
import { checkInstagram } from "@/app/admin/(manage)/collection/actions";
import InstagramCheckButton from "./instagram-check-button";
export default async function InstagramConnection() {
  await requireAdmin();
  const configured = Boolean(instagramConfig(process.env));
  const [check] = await query<{
    status: string;
    checked_at: string;
    message: string;
    account_name: string;
  }>(
    "select status,checked_at::text,message,account_name from public.collection_provider_checks where provider='instagram'",
  );
  return (
    <section
      className="library-panel form-panel collection-evidence"
      id="instagram"
    >
      <div className="panel-heading">
        <div>
          <h2>
            Instagram 연결 ·{" "}
            {configured ? "인증 정보 설정됨" : "Meta 인증 필요"}
          </h2>
          <p>
            Facebook Login 방식의 해시태그 인기 게시물 조회입니다. 게시물
            작성·댓글·메시지 전송 권한은 사용하지 않습니다.
          </p>
        </div>
      </div>
      <div className="form-body">
        {check && (
          <div
            className={`feedback ${configured && check.status === "ok" ? "success" : "error"}`}
            role="status"
          >
            최근 확인: {formatKst(check.checked_at)}
            {check.account_name && ` · @${check.account_name}`}
            <br />
            {check.message}
          </div>
        )}
        {!configured && (
          <p>
            현재 Instagram은 미연결입니다. 이 프로젝트에 Meta 앱·계정 인증
            정보가 없어 실제 Instagram 수집은 시작되지 않았습니다.
          </p>
        )}
        <ol>
          <li>
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
            >
              Meta for Developers → 내 앱
            </a>
            에서 앱을 만들고 Instagram API의 <strong>Facebook Login</strong>{" "}
            방식을 설정하세요.
          </li>
          <li>
            Facebook 페이지에 연결된 Instagram 비즈니스/크리에이터 계정을
            사용하세요. 개인 계정이나 Instagram Login 전용 토큰은 이 해시태그
            수집에 사용할 수 없습니다.
          </li>
          <li>
            <a
              href="https://developers.facebook.com/tools/explorer/"
              target="_blank"
              rel="noreferrer"
            >
              Graph API Explorer
            </a>
            에서 해당 앱을 선택하고 <code>instagram_basic</code>,{" "}
            <code>pages_read_engagement</code>, 계정 ID 확인을 위한{" "}
            <code>pages_show_list</code> 권한을 승인하세요. 공개 콘텐츠 조회에는{" "}
            <strong>Instagram Public Content Access</strong> 기능 및 앱 접근
            수준에 맞는 Meta 승인이 필요합니다.
          </li>
          <li>
            Explorer에서{" "}
            <code>me/accounts?fields=id,name,instagram_business_account</code>를
            조회해 연결된 <code>instagram_business_account.id</code>를
            확인하세요. Facebook 페이지 ID와 다릅니다.
          </li>
          <li>
            <a
              href="https://vercel.com/planndoits-projects/algorithm/settings/environment-variables"
              target="_blank"
              rel="noreferrer"
            >
              Vercel → algorithm → 환경 변수
            </a>
            의 <strong>Production</strong>에 <code>INSTAGRAM_ACCESS_TOKEN</code>
            을 Secret으로, <code>INSTAGRAM_BUSINESS_ACCOUNT_ID</code>를 계정
            ID로 저장하세요. 일일 운영에는 Meta에서 발급한 장기 토큰을 사용하고
            만료 전에 교체하세요.
          </li>
          <li>
            Vercel 운영 배포를 Redeploy한 뒤 아래 ‘연결 확인’을 누르세요. 계정
            인증과 첫 해시태그 조회가 성공하면 ‘지금 수집하기’로 첫 수집을
            실행할 수 있습니다.
          </li>
        </ol>
        <p className="field-note">
          토큰은 채팅·관리자 메모에 보내지 마세요. 서버에서만 사용하고 이
          화면이나 콘텐츠에 저장·표시하지 않습니다. 본인 계정으로 개발
          테스트하는 경우 앱 역할과 접근 수준에 맞는 Meta 설정이 필요합니다.
        </p>
        <form action={checkInstagram}>
          <InstagramCheckButton disabled={!configured} />
        </form>
        <p className="field-note">
          연결 확인은 현재 저장된 첫 해시태그를 조회하며 Meta 사용량에
          포함됩니다. API에서 작성자 계정을 제공하지 않으면 크리에이터·계정
          URL은 비워 두고 관리자가 원문에서 확인합니다. 숨겨진 좋아요나 조회수는
          추정하지 않습니다.
        </p>
        <a
          href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/hashtag-search/"
          target="_blank"
          rel="noreferrer"
        >
          Meta 공식 해시태그 검색 문서 ↗
        </a>
      </div>
    </section>
  );
}
