# 🍱 Lunch Map — 오늘의 점심 지도

> 가까운 맛집부터 솔직한 리뷰까지, 우리의 점심 리스트를 지도에서 만나보세요.

비플페이 가맹 식당을 카카오 지도에 모아 보여 주고, 동료들과 리뷰·추천·오늘의 점심을 나누는 사내 점심 웹앱입니다.

![Lunch Map](public/og-image.png)

## 주요 기능

- 🗺️ **점심 지도**: 회사 주변 가맹 식당을 지도와 목록으로 함께 보고, 검색·거리·즐겨찾기로 좁혀 봅니다.
- 🍜 **오늘의 점심**: 오늘 갈 식당을 하루 한 곳 기록하고, 🎲 랜덤 추천으로 고를 수도 있습니다.
- 📝 **리뷰**: 추천/비추천과 태그(최대 3개), 선택 내용으로 남깁니다. 하루 5개까지 쓸 수 있습니다.
- 🏆 **랭킹**: 최근 30일 점심 기록·리뷰 수·추천 점수 TOP 10을 보여 줍니다.
- 👤 **내 페이지**: 점심 기록 달력, 내 리뷰, 즐겨찾기, 탐방 진행률을 확인하고 QR·링크로 **다른 기기에서 이어 쓰기**를 합니다.
- ❓ **사용법**: 처음 방문할 때 안내를 한 번 보여 주고, `/guide`에서 다시 볼 수 있습니다.
- 🛠️ **관리자** (`/admin`): 엑셀로 식당 목록을 가져오고(주소 → 좌표 자동 변환) 식당 상태와 통계를 관리합니다.

## 기술 스택

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules · PostgreSQL([Supabase](https://supabase.com), `pg`) · Kakao Maps SDK / Local API · Vercel

## 시작하기

Node.js 20 이상, Supabase(PostgreSQL) DB, [Kakao Developers](https://developers.kakao.com) 앱(JavaScript 키·REST API 키)이 필요합니다.
카카오 앱의 플랫폼 → Web에 `http://localhost:3000`과 배포 도메인을 등록하세요.

```bash
git clone https://github.com/WonTaeJang/isens-lunch-map.git
cd isens-lunch-map
npm install
npm run dev   # http://localhost:3000
```

프로젝트 루트에 `.env`를 만듭니다. (`.gitignore`에 포함)

```dotenv
NEXT_PUBLIC_KAKAO_MAP_APP_KEY=카카오_JavaScript_키      # 브라우저 노출용(지도)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/postgres  # Supabase 트랜잭션 풀러
KAKAO_REST_API_KEY=카카오_REST_API_키                  # 엑셀 가져오기 주소 → 좌표
ADMIN_PASSWORD=관리자_비밀번호
# SITE_URL=https://your-domain.com                     # 선택: 공유 미리보기 기준 주소
# REVIEW_TEST_DATABASE_URL=...                         # 선택: 통합 테스트 전용 DB
```

서버 전용 값에는 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. DB TLS 연결에는 `lib/certs/supabase-ca.crt`를 사용합니다.

## 스크립트

| 명령                                          | 설명                                                |
| --------------------------------------------- | --------------------------------------------------- |
| `npm run dev` / `npm run build` / `npm start` | 개발 서버 / 빌드 / 실행                             |
| `npm run lint` / `npm run format:check`       | ESLint / Prettier 검사                              |
| `npm test`                                    | 단위 테스트                                         |
| `npm run test:integration`                    | PostgreSQL 통합 테스트 (`REVIEW_TEST_DATABASE_URL`) |
| `npm run db:check`                            | DB 연결 읽기 전용 점검                              |

## 프로젝트 구조

```text
app/         페이지, 레이아웃, API 라우트
components/  공통 헤더와 UI (Button, Modal, Snackbar …)
features/    기능별 화면·상태 (lunch-map, lunch-visits, reviews, ranking, user, guide, admin …)
lib/         features와 서버가 함께 쓰는 코드 (features import 금지), server/는 서버 전용
tests/       단위 / 통합 테스트
docs/        설계 문서, 커밋 규칙, TODO
```

자세한 설계와 동작은 [docs/architecture.md](docs/architecture.md)를 참고하세요.

## 배포 (Vercel)

1. 저장소를 Import하고 Production Branch를 `master`로 설정합니다.
2. Settings → Environment Variables에 위 환경 변수를 등록합니다.
3. 카카오 플랫폼 → Web에 배포 도메인을 추가합니다. (없으면 지도가 표시되지 않습니다)
4. Settings → Functions → Region을 DB와 가까운 리전으로 맞추면 응답이 빨라집니다.
5. `NEXT_PUBLIC_*`·`SITE_URL`을 바꾸면 다시 배포해야 반영됩니다.

## 알아 두기

- 로그인 없이 브라우저 localStorage의 익명 `user_id`로 사용자를 구분합니다. 브라우저 데이터를 지우면 기존 리뷰를 관리할 수 없으니, 다른 기기는 **이어 쓰기**로 연결하세요.
- 식당 목록은 24시간 캐시되며, 관리자 화면에서 수정하면 바로 갱신됩니다.
- 커밋 메시지는 `[type] : Summary` 형식을 따릅니다. 자세한 규칙은 [docs/commit.md](docs/commit.md), 진행 상황은 [docs/todo.md](docs/todo.md)를 참고하세요.
