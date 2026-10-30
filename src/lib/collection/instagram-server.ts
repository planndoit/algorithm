import "server-only";
import { query } from "@/lib/db";
import { type Settings } from "./model";
import {
  InstagramError,
  collectInstagram,
  instagramConfig,
  checkInstagramAccount,
} from "./instagram";
export async function instagramSource(settings: Settings, now: Date) {
  const config = instagramConfig(process.env);
  if (!config)
    throw new InstagramError("Instagram 인증 정보가 설정되지 않았습니다.");
  const [quota] = await query<{ allowed: boolean }>(
    "select public.reserve_instagram_hashtags($1,$2::text[]) allowed",
    [config.accountId, settings.instagram_hashtags],
  );
  if (!quota.allowed)
    throw new InstagramError(
      "Instagram 해시태그 한도: 이 앱에서 최근 7일간 30개를 예약했습니다. 기존 해시태그를 사용해 주세요.",
    );
  return collectInstagram(settings, now, config);
}
export async function verifyInstagram(settings: Settings) {
  let status = "error",
    message = "",
    accountName = "";
  const config = instagramConfig(process.env);
  if (!config) {
    status = "unconfigured";
    message =
      "Vercel 운영 환경의 Instagram 액세스 토큰과 비즈니스 계정 ID를 연결해 주세요.";
  } else
    try {
      const account = await checkInstagramAccount(config);
      accountName = account.username;
      await instagramSource(
        {
          ...settings,
          instagram_hashtags: settings.instagram_hashtags.slice(0, 1),
        },
        new Date(),
      );
      status = "ok";
      message =
        "계정 인증과 첫 해시태그의 인기 게시물 조회 권한을 확인했습니다. 전체 수집은 지금 수집하기 또는 매일 스케줄에서 실행됩니다.";
    } catch (error) {
      message =
        error instanceof InstagramError
          ? error.message
          : "Instagram 응답 형식 확인 실패: API 버전과 권한을 확인해 주세요.";
    }
  await query(
    "insert into public.collection_provider_checks(provider,status,message,account_name) values('instagram',$1,$2,$3) on conflict(provider) do update set status=excluded.status,message=excluded.message,account_name=excluded.account_name,checked_at=now()",
    [status, message, accountName],
  );
}
