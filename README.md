# 이번 주 알고리즘력 테스트

Next.js App Router · TypeScript · Tailwind CSS · Neon PostgreSQL · Neon Auth (Managed Better Auth).
현재 운영 대상은 Neon입니다. Supabase는 무료 활성 프로젝트 한도로 사용하지 않습니다.

## 현재 준비된 DB

- 프로젝트: `algorithm` / `small-grass-71366899`
- 브랜치: `production` / `br-red-mountain-azpqlqo5`
- 데이터베이스: `algorithm`
- 리전: AWS Singapore (`aws-ap-southeast-1`), PostgreSQL 17
- 무료 조직의 기본 compute 설정을 사용합니다. 유료 플랜 변경 없음.
- 스키마 `database/migrations/001_neon_initial.sql` 적용 완료.
- 콘텐츠/회차/결과는 비어 있습니다. 실제 트렌드를 임의 생성하지 않았습니다.

## 로컬 실행

Node.js 22 이상, `npm ci` 후 `npm run dev`.
이미 작성된 `.env.local`에 서버 전용 연결 정보가 있습니다. Git에는 포함되지 않습니다.
다른 환경에서는 `.env.example`을 참고해 다음 값을 설정합니다.

| 변수                      | 설명                                    |
| ------------------------- | --------------------------------------- |
| `DATABASE_URL`            | Neon 서버 전용 PostgreSQL 연결 문자열   |
| `NEON_AUTH_BASE_URL`      | Neon Auth 서비스 URL                    |
| `NEON_AUTH_COOKIE_SECRET` | 인증 쿠키 서명용 랜덤 비밀값, 32자 이상 |
| `RATE_LIMIT_SECRET`       | IP 해시용 독립 랜덤 비밀값              |
| `NEXT_PUBLIC_SITE_URL`    | 앱의 실제 HTTPS 주소 (로컬은 localhost) |
| `DEMO_MODE`               | 운영 `false`, 샘플 체험 `true`          |

연결 문자열과 비밀값은 채팅/로그/소스/브라우저 번들에 넣지 않습니다.
명시적 체험은 실제 트렌드가 아닌 샘플 10개입니다. 체험 결과는 브라우저에만 저장됩니다.

## 관리자 계정

1. Neon Console의 해당 브랜치 → Auth에서 관리자의 실제 이메일 계정을 만듭니다.
2. 사용자 ID를 복사하고 Neon SQL Editor에서 아래 SQL을 실행합니다.

   ```sql
   insert into public.admin_users(id) values ('Neon Auth 사용자 ID');
   ```

3. 앱의 `/admin/password`에서 등록한 이메일로 인증코드를 요청하고, 이메일의 코드와 새 비밀번호를 입력합니다. 공유 SMTP가 지원하는 이메일 OTP를 사용하며 코드는 사용자의 요청 시에만 발송합니다.
4. `/admin`에서 이메일/비밀번호로 로그인합니다.

앱은 공개 회원가입을 제공하지 않으며, 로그인한 사용자라도 `admin_users`에 없으면 모든 관리자 조회/수정이 차단됩니다. 각 Server Action은 매번 세션과 관리자 목록을 확인합니다. `planndoit@gmail.com` 계정과 관리자 권한은 이미 생성되어 있습니다. 비밀번호는 사용자가 설정 화면에서 직접 정합니다.

콘텐츠 10개 이상 등록 → approved 승인 → 회차 초안 생성 → ID를 출제 순서대로 입력 → 미리보기 → 발행.
일정 예: `2026-11-06T00:00:00+09:00`. 발행은 정확히 승인된 10문항을 요구하며, 공개 기간 중복 및 발행 후 문제 수정은 DB에서 차단됩니다. 과거 결과는 유지합니다.

## 마이그레이션 및 데이터 접근

운영 스키마는 `database/migrations/`입니다. `schema_migrations`의 버전 `001_neon_initial`로 적용을 확인할 수 있습니다.
기존 `supabase/migrations/`는 초기 Supabase 설계 기록이며 Neon에는 실행하지 않습니다.

브라우저는 DB에 직접 연결하지 않습니다. 공개 조회는 서버가 공개된 회차와 공개 필드 스냅샷만 조회하며 관리자 메모를 전송하지 않습니다. Neon Data API는 활성화하지 않았습니다. 모든 서비스 테이블에 RLS를 켜고 PUBLIC 테이블 권한 및 함수 실행 권한을 철회했습니다. 서버는 프로젝트 DB 소유자 역할로 연결하므로 RLS 우회 권한을 가진 서버 연결 문자열을 특히 보호해야 합니다.

결과 저장은 파라미터 SQL로 `submit_result`를 호출합니다. DB가 문항/응답 수를 검증하고 점수를 재계산하며 결과·응답을 단일 트랜잭션으로 저장합니다. 랜덤 UUID 결과 URL, 요청 UUID 중복 방지, IP 원문 대신 HMAC 해시를 사용합니다. Vercel의 신뢰된 `x-vercel-forwarded-for` 기준 분당 20건/전체 300건 제한이며, 다른 호스팅은 신뢰 프록시 헤더를 맞춰야 합니다. Vercel Firewall 요청 크기/빈도 제한도 운영 시 권장합니다.

## Vercel 준비 상태

팀 `planndoits-projects`에 `algorithm` 프로젝트가 생성되어 있습니다.
Production에 `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `RATE_LIMIT_SECRET`, `DEMO_MODE=true`로 샘플 체험을 허용했습니다. 비밀값은 Sensitive로 저장했습니다. Preview에는 운영 DB 비밀값을 제공하지 않았습니다.

아직 소스 전송/배포는 하지 않았습니다. 배포 전 실제 도메인을 결정해 `NEXT_PUBLIC_SITE_URL` 및 Neon Auth trusted domains에 추가합니다. Vercel 접근 보호도 일반 사용자와 OG 크롤러의 접근에 맞게 설정해야 합니다.

## 검증

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`
- `npm run test:db`: 독립 PGlite PostgreSQL에서 Neon 마이그레이션/점수/발행/불변성/접근 제어 검증.
- `tests/neon-smoke.sql`: 실제 Neon에서 수행한 트랜잭션 검증. 성공 시에도 테스트 데이터는 모두 롤백합니다.
- 체험 브라우저 검증은 DB/인증 변수를 빈 문자열로 덮어쓰고 `DEMO_MODE=true npm run start`로 실행 후 `npm run test:e2e`. Chromium 경로는 `playwright.config.ts`에서 환경에 맞게 조정합니다.

현재 개발 환경에서 앱의 직접 Neon HTTP 연결이 실패하여 실제 앱 → Neon 경로는 미검증입니다. Neon 플러그인을 통한 DB 쿼리와 실제 DB 스모크 검증은 성공했습니다. 상세 상태는 `docs/STATUS.md`와 `docs/DEPLOYMENT.md`를 확인하세요.

## 문서와 후속 범위

`docs/REQUEST.original.md`: 원문 보존. `docs/PRD.md`: 원문 요구사항과 현재 구현 결정.
Phase 2 통계/이벤트 분석, Phase 3 AI 수집, Phase 4 광고/결제는 후속입니다. 실제 콘텐츠는 운영자가 출처/권리를 확인해 등록합니다.

## 테스트용 접속 준비

Vercel 운영 도메인은 `https://algorithm-zeta-three.vercel.app`로 배정되어 있습니다. 아직 실제 배포 상태는 `docs/DEPLOYMENT.md`에서 확인하세요. 홈에 실제 회차가 없으면 별도의 명시적 샘플 체험 링크를 제공합니다. 운영 DB에는 샘플 콘텐츠를 자동 등록하지 않습니다. 관리자 비밀번호 설정은 `/admin/password`, 로그인과 운영은 `/admin`입니다.
