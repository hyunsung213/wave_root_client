# AI 작업 기록

## 2026-10-10

- 2026-10-10 15:45:42 (+09:00) — 프론트 배포 전 연결 설정을 점검함. Vercel project `wave-root-client`의 기존 Production은 `main` 초기 커밋(`63c4033`)이고 실제 앱 코드는 `codex/frontend-preview-20261009` Preview에만 있음을 확인함. Vercel MCP env 조회·쓰기 모두 403, CLI도 없어서 프로젝트 env를 직접 변경할 수 없었음. production에서 NEXT_PUBLIC API 설정이 없거나 localhost이면 Render origin `https://wave-root-backend.onrender.com`으로 폴백하는 `lib/apiBaseUrl.ts`를 추가하고 Axios, Next image remotePatterns, MJPEG proxy에서 공통 사용하도록 변경함. 설정 없는 Production build의 client bundle에서 Render origin 포함을 확인하고 `npm run lint`, `npm run build` 통과. 백엔드 운영 CORS 차단을 고친 뒤 main Production 배포를 진행할 예정.
- 2026-10-10 15:46:16 (+09:00) — Render backend `/health`, `/health/ready`가 모두 200이고, Vercel 운영 도메인의 CORS preflight가 204 및 `Access-Control-Allow-Origin`을 반환하는 것을 확인함. 보호된 `/api/web/plants`도 CORS 헤더가 붙은 401(`Bearer access token required`)을 반환해 브라우저-백엔드 경계가 통과함을 확인함. 이제 Vercel Production에 앱을 배포하고 배포 완료 여부 및 공개 페이지를 재검증할 예정.

## 2026-10-09

- 2026-10-09 01:40:41 (+09:00) — 전체 스택 점검에서 ESLint와 Next.js production build 통과. Vercel Preview `/`, `/login`은 HTTP 200이나 실제 배포 JS에 API 기본값 `http://localhost:5000`이 포함되어 Vercel 원격 사용자의 백엔드 연결은 실패하는 상태로 확인함. Render 서비스 URL 부재와 Vercel 환경변수 조회 권한 403 때문에 올바른 `NEXT_PUBLIC_API_BASE_URL` 설정 및 Production 재배포는 보류함. 브라우저 API 로그인/센서/스트림 end-to-end는 아직 완료되지 않음.

- 2026-10-09 00:51:25 (+09:00) — `wave-root-client` 프론트 변경분을 `codex/frontend-preview-20261009` 브랜치(커밋 `9708052`)로 Vercel Preview 배포함. 배포 `READY`; 보호된 Preview URL에서 `/`, `/login`, `/manifest.webmanifest`가 모두 HTTP 200이고 앱 타이틀/manifest를 확인함. Production `main` 도메인은 변경하지 않음. Vercel env 열람은 403 권한 오류이며 Render origin이 없어 로그인·센서·영상의 백엔드 연동은 아직 검증/설정 불가.

- 2026-10-09 00:44:34 (+09:00) — MJPEG 연결 종료/실패 시 반복 요청이 폭주하지 않도록 자동 재연결을 최대 3회, 1·2·4초 지수 backoff로 제한하고 이후 수동 재시도 버튼을 표시함. ESLint, Next.js production build, `git diff --check` 통과.

- 2026-10-09 00:41:55 (+09:00) — 프론트 연결 재시도 중 상태 표시를 보완해 요청이 진행 중일 때 중복 재연결 버튼이 노출되지 않게 함. ESLint와 Next.js production build 재실행 통과.

- 2026-10-09 00:38:13 (+09:00) — `/live/[plantId]`에서 `/api/web/plants/:plantId`의 단기 서명 `streamingUrl`을 받아 MJPEG `<img>`로 재생하도록 연결함. 식물 캐시에 URL이 빠진 경우 상세 API를 다시 조회하고, 연결 오류·만료 시 재요청해 새 URL로 재연결하도록 구성함. 센서 API 60초 폴링은 유지하고 급수 기능은 수정하지 않음. `npm run lint`, `npm run build`, `git diff --check` 통과. Vercel 배포 전 `NEXT_PUBLIC_API_BASE_URL`을 실제 Render origin으로 설정해야 함.

- 00:01:27 (+09:00) — Vercel/Render 배포 전 점검: 프론트엔드 ESLint와 Next.js production build 통과. 현재 Vercel 프로젝트는 존재하지만 `NEXT_PUBLIC_API_BASE_URL` 설정을 확인할 권한이 없고, 현재 build 기본값은 localhost이며 프로젝트의 `.vercel.app` 주소는 SSO 보호 상태임. Render 백엔드 주소가 준비되지 않아 배포 환경변수 설정 및 실제 API 연결 확인은 대기. 외부 배포/커밋/푸시는 아직 실행하지 않음.

## 2026-09-29

- 11:08:45 (+09:00) — 사용자의 요청에 따라 앞으로 모든 작업을 날짜, 시간, 작업 내용과 함께 `aiProgress.md`에 기록하기로 함.
- 11:13:08 (+09:00) — 프론트엔드 전체 기능 점검을 시작함. 아키텍처/상태 관리, UX/반응성, 성능, 타입 안정성/에러 처리를 기준으로 코드 구조와 실행 검사를 진행할 예정.
- 11:14:11 (+09:00) — TypeScript 및 production build 통과를 확인함. ESLint 실패 항목을 확인했고, 실제 라우트와 사용자 흐름 검증을 위해 브라우저 점검을 시작함.
- 11:17:44 (+09:00) — 전체 라우트 HTTP 응답(홈/인증/주요 기능/동적 라우트)과 백엔드 헬스체크를 확인함. 코드 감사에서 기록 화면 무한 로딩 가능성, 실시간 화면의 데모 영상 고정, 프로필 일반 정보 저장 미연동, 인증 가드/에러·접근성·타입/ESLint 개선 필요 항목을 확인함.
- 11:25:44 (+09:00) — 사용자가 제공한 Smart Farm Backend API 점검 문서와 프론트 API 호출 계약을 대조함. RDK 연결·인증, 급수 명령 멱등성/lease/ACK, 식물 삭제 cascade, 페이지네이션·입력 검증, 프로필 수정 API, 운영 로그/보안 보완을 백엔드 수정 후보로 정리함.
- 11:28:19 (+09:00) — 급수 기능 분리 요청을 확인함. 저장소에 이미 `feature/watering` 브랜치가 존재하고 `main`과 동일한 초기 커밋을 가리키는 것을 확인함. 현재 `main`의 미커밋 작업은 보존하고 브랜치 전환·삭제 없이 상태를 유지함.
- 11:29:36 (+09:00) — `main`에서 원격 급수 기능을 제거하고 현재 구현은 `feature/watering`에 보존하는 작업을 시작함. 대상은 실시간 물주기 UI/API와 기록 화면 급수 기록이며, 기존 미커밋 변경을 먼저 안전하게 보관할 예정.
- 11:32:52 (+09:00) — `feature/watering`에 기존 프론트 작업과 급수 구현을 WIP 커밋(`f2f1bb2`)으로 보존하고 `main`으로 복귀함. `main`에서 실시간 물주기 UI/API 호출, 급수 기록 탭/API helper, 결제의 원격 물주기 안내, 급수 이벤트 선택지를 제거함. TypeScript 및 production build 통과, ESLint는 기존 36 errors/18 warnings가 남아 있음.
- 11:40:18 (+09:00) — 현재 `main` 프론트가 실제 호출하는 API 목록을 다시 추출하고, 프론트 기준 백엔드 수정 필요 사항만 재분류하기 시작함. 급수 API는 제외하고 인증, 사용자 프로필, 식물/스트림, 센서, 성장 이벤트 이미지, 알림, 운영 안정성 계약을 기준으로 검토함.
- 11:48:43 (+09:00) — 현재 `main` 작업 트리의 전체 라우트와 공용 컴포넌트를 목록화하고 UI/UX 종합 감사에 착수함. 기존 사용자 작업 변경은 유지하며 페이지별 코드 근거를 확인할 예정.
- 11:51:32 (+09:00) — 성능/체감 속도, 폼 입력, 모바일 인터랙션, 오류 복구/임시 저장 기준으로 루트·로그인·가입·홈·분양·결제·실시간·기록·마이페이지·프로필·알림과 공용 레이아웃을 코드 기준으로 점검함. 계좌이체 완료 상태 오표시, 여러 페이지의 오류/빈 상태 혼동, 폼 진행 상태·접근성, 서비스 워커 부재 등 페이지별 개선안을 정리함. 이번 요청은 읽기 전용 감사로 앱 코드는 수정하지 않음.
- 13:06:08 (+09:00) — 사용자의 UI/UX 수정 요청을 받아 현재 main의 미커밋 작업 상태와 Next.js 16 로컬 문서를 확인하고 구현을 시작함. 공통 반응형·접근성, 페이지별 로딩/오류/입력 복구, 결제 상태 표시와 캐시 정책을 순차 반영할 예정.
- 16:12:08 (+09:00) — 수정 작업을 이어서 진행함. 현재까지 모바일 고정 배율 제거, 바텀시트 접근성, 로그인/가입 피드백, 주요 데이터 화면 오류·빈 상태 분리, 기록 초안 보존, 정적 자원 서비스 워커, 거짓 결제 완료 흐름 제거를 반영했으며 TypeScript 검사는 통과함. 남은 정적 검사 오류와 실제 화면 동작을 확인 중.
- 16:23:59 (+09:00) — production 서버의 전체 주요 라우트 응답을 확인하고 모바일 브라우저에서 로그인·분양 바텀시트·상품 확인·공백 이름 검증 및 데이터 화면 오류/재시도 상태를 점검함. 보호 화면의 인증 가드와 남은 `any` 타입 오류 7건을 수정하기 시작함.
- 16:34:18 (+09:00) — 공통 세션 가드와 API 입력 타입을 보완하고 Next.js 작업 루트를 명시함. 모바일/데스크톱 화면, 가입 blur 검증, 무효 토큰 정리 및 로그인 복귀, 서비스 워커의 실제 오프라인 안내를 브라우저에서 확인함. 전체 ESLint, TypeScript, production build, 서비스 워커 구문 검사, `git diff --check` 통과. 주문·결제와 일반 프로필 수정은 백엔드 API가 없어 준비 중으로 정확히 안내하며, 인증된 전체 E2E는 테스트 계정 부재로 수행하지 못함.
- 2026-10-09 00:28:38 +09:00 — Vercel→Render HTTPS 통신을 위한 `NEXT_PUBLIC_API_BASE_URL` 구성 계약을 확인하고, 사용하지 않는 MJPEG proxy route에서 임의 URL SSRF가 가능하지 않도록 Render API origin 및 서명 식물 스트림 경로만 허용하게 제한함. Next.js lint와 production build 통과. 배포 환경변수는 Vercel 프로젝트 접근 권한이 없어 아직 설정하지 않음.
- 2026-10-09 00:53:46 +09:00 — 프론트 현재 작업을 `codex/frontend-preview-20261009` 브랜치로 Vercel Preview 배포함. 커밋 `1f0d877` 빌드 `READY`, 루트와 웹 앱 매니페스트 HTTP 200 확인. Production `main`은 변경하지 않았으며, Render 공개 API 주소가 미확정이고 Vercel 환경변수 조회 권한이 없어 API 연동 동작은 아직 검증/설정하지 않음.
