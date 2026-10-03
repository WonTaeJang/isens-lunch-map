# 🍱 Lunch Map — 오늘의 점심 지도

> 가까운 맛집부터 솔직한 리뷰까지, 우리의 점심 리스트를 지도에서 만나보세요.

회사 식대 결제(비플페이) 가맹 식당 목록을 카카오 지도 위에 보여 주고,
동료들과 리뷰·추천을 나누며 "오늘 뭐 먹지?"를 함께 해결하는 사내 점심 지도 웹앱입니다.

![Lunch Map](public/og-image.png)

## 주요 기능

| 기능                 | 설명                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 🗺️ **점심 지도**     | 회사 위치를 기준으로 가맹 식당을 마커로 표시합니다. 지도와 목록의 선택 상태가 연동됩니다.                                |
| 🔍 **검색·필터**     | 식당 이름 검색, 거리 필터, 즐겨찾기 필터를 지원합니다.                                                                   |
| ⭐ **즐겨찾기**      | 로그인 없이 브라우저에 저장하며, 여러 탭 사이에도 동기화됩니다.                                                          |
| 📝 **리뷰**          | 추천/비추천, 내용, 태그(최대 3개)를 남길 수 있습니다. 수정 충돌을 감지하고, 하루 작성 개수를 제한합니다.                 |
| 🎰 **랜덤 추천**     | 슬롯머신 방식으로 오늘의 식당을 뽑습니다. 현재 필터가 적용됩니다.                                                        |
| 🏆 **랭킹**          | 리뷰 수 랭킹과 추천 점수 랭킹(가중치·보정 적용) TOP 10을 보여 줍니다.                                                    |
| 👤 **내 페이지**     | 내가 쓴 리뷰와 즐겨찾기, 탐방 진행률, 추천 비율을 확인합니다.                                                            |
| 🛠️ **관리자**        | 비밀번호로 인증한 뒤 엑셀로 식당 목록을 가져오고(주소 → 좌표 자동 변환), 활성 상태와 주소 오류를 관리하며 통계를 봅니다. |
| 🔗 **공유 미리보기** | 카카오톡 등에 링크를 공유할 때 표시되는 Open Graph 이미지와 메타데이터를 제공합니다.                                     |

## 기술 스택

- **Framework**: [Next.js](https://nextjs.org) 16 (App Router) · React 19 · TypeScript
- **Styling**: Tailwind CSS 4 · CSS Modules
- **Database**: PostgreSQL ([Supabase](https://supabase.com)) · `pg`
- **Map**: Kakao Maps JavaScript SDK · Kakao Local REST API(주소 → 좌표 변환)
- **Excel**: ExcelJS
- **Test**: Node.js 내장 test runner + `tsx`
- **Deploy**: [Vercel](https://vercel.com)

## 시작하기

### 1. 요구 사항

- Node.js 20 이상 (개발 환경: Node.js 22)
- Supabase(PostgreSQL) 데이터베이스
- [Kakao Developers](https://developers.kakao.com) 앱
  - JavaScript 키: 지도 표시용. 플랫폼 → Web에 `http://localhost:3000`과 배포 도메인을 등록해야 합니다.
  - REST API 키: 엑셀을 가져올 때 주소를 좌표로 바꾸는 데 사용합니다.

### 2. 설치

```bash
git clone https://github.com/WonTaeJang/isens-lunch-map.git
cd isens-lunch-map
npm install
```

### 3. 환경 변수

프로젝트 루트에 `.env` 파일을 만드세요. 이 파일은 `.gitignore`에 포함돼 있어 커밋되지 않습니다.

```dotenv
# 브라우저에 노출되는 값 (지도 표시용)
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=카카오_JavaScript_키

# 서버 전용 값 — 절대 NEXT_PUBLIC_ 접두사를 붙이지 마세요
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres
KAKAO_REST_API_KEY=카카오_REST_API_키
ADMIN_PASSWORD=관리자_비밀번호

# 선택: 공유 미리보기에 사용할 공개 주소
# SITE_URL=https://your-domain.com
```

| 변수                            | 필수 | 용도                                                             |
| ------------------------------- | :--: | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` |  ✅  | 카카오 지도 SDK (빌드할 때 코드에 포함됨)                        |
| `DATABASE_URL`                  |  ✅  | PostgreSQL 연결 문자열 (Supabase 트랜잭션 풀러 권장)             |
| `KAKAO_REST_API_KEY`            |  ✅  | 엑셀을 가져올 때 주소 → 좌표 변환                                |
| `ADMIN_PASSWORD`                |  ✅  | `/admin` 인증                                                    |
| `SITE_URL`                      |      | Open Graph 기준 URL. 없으면 Vercel URL → `localhost` 순서로 사용 |
| `REVIEW_TEST_DATABASE_URL`      |      | 통합 테스트 전용 DB (운영 DB 사용 금지)                          |

DB TLS 연결에는 `lib/certs/supabase-ca.crt`(Supabase 공개 CA 인증서)를 사용합니다.

### 4. 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 여세요.

## 스크립트

| 명령                              | 설명                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                     | 개발 서버 실행                                                |
| `npm run build` / `npm start`     | 프로덕션 빌드 / 실행                                          |
| `npm run lint`                    | ESLint 검사                                                   |
| `npm run format` / `format:check` | Prettier 포맷 적용 / 검사                                     |
| `npm test`                        | 단위 테스트 (모의 DB 사용)                                    |
| `npm run test:integration`        | 실제 PostgreSQL 통합 테스트 (`REVIEW_TEST_DATABASE_URL` 필요) |
| `npm run db:check`                | 실제 DB 연결 읽기 전용 점검                                   |

변경한 뒤에는 다음을 실행해 확인합니다.

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

## 페이지 구성

| 경로       | 내용                                                      |
| ---------- | --------------------------------------------------------- |
| `/`        | 점심 지도 · 식당 목록 · 필터 · 랜덤 추천 · 리뷰 패널      |
| `/ranking` | 리뷰 수 랭킹 (`?type=recommendation`: 추천 랭킹)          |
| `/user`    | 내 리뷰 · 즐겨찾기 · 탐방 진행률                          |
| `/admin`   | 관리자: 엑셀 가져오기 · 식당 관리 · 주소 오류 수정 · 통계 |

## 프로젝트 구조

```text
app/            # 페이지, 레이아웃, API 라우트 (reviews, admin)
components/     # 공통 헤더와 UI 컴포넌트 (Button, Toggle, Tabs …)
features/       # 기능별 화면·상태·모델
  lunch-map/    #   지도, 목록, 필터, 랜덤 추천
  reviews/      #   리뷰 패널·폼·검증
  favorites/    #   즐겨찾기 저장소
  ranking/      #   랭킹
  user/         #   내 페이지
  admin/        #   관리자 화면
  local-user/   #   익명 사용자 ID
lib/            # features와 서버가 함께 쓰는 코드 (features import 금지)
  server/       # 서버 전용: DB, 조회, 엑셀 가져오기 (server-only)
  reviews/      # 리뷰 모델·검증·정책 상수
  ranking/      # 랭킹 모델·정책 상수
  certs/        # DB TLS용 공개 CA 인증서
scripts/        # DB·가져오기 점검 스크립트
tests/          # 단위 / 통합 테스트
docs/           # 설계 문서, 커밋 규칙, TODO
```

설계 의도, 상태 흐름, 엑셀 가져오기 규칙, 리뷰 API 동작 등 자세한 내용은
👉 **[docs/architecture.md](docs/architecture.md)** 를 참고하세요.

## 배포 (Vercel)

1. Vercel에서 이 저장소를 Import합니다. 프레임워크는 Next.js로 자동 인식되며, Production Branch는 `master`로 설정합니다.
2. **Settings → Environment Variables**에 위 환경 변수를 등록합니다.
3. 카카오 개발자 콘솔 → 플랫폼 → Web에 배포 도메인을 추가합니다. 추가하지 않으면 지도가 표시되지 않습니다.
4. DB가 서울 리전이라면 **Settings → Functions → Region**을 `icn1`(Seoul)로 설정하는 것을 권장합니다.
5. `NEXT_PUBLIC_*` 값이나 `SITE_URL`을 바꾼 뒤에는 다시 배포해야 반영됩니다.

## 알아 두기

- 사용자 계정 없이 브라우저 localStorage의 익명 `user_id`로 리뷰 작성자를 구분하는 **토이 프로젝트 방식**입니다.
  인증된 본인 확인이 아니므로, 저장소를 지우면 기존 리뷰의 소유권이 사라집니다.
- 관리자 비밀번호는 메모리에만 보관하며, 요청할 때마다 서버에서 검증합니다.

## 기여

커밋 메시지는 `[type] : Summary` 형식을 따릅니다. 예: `[feat] : Add random restaurant slot picker`.
자세한 규칙은 [docs/commit.md](docs/commit.md), 진행 상황은 [docs/todo.md](docs/todo.md)를 참고하세요.
