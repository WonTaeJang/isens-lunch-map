This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 코드 구조와 설계 의도

화면 표시, 상태 관리, 외부 서비스 접근의 책임을 나누었습니다. 기능을 수정할 때
어느 파일을 변경해야 하는지 쉽게 찾고, 다른 기능에 미치는 영향을 줄이는 것이 목적입니다.
폴더를 많이 만드는 것보다 **함께 변경되는 코드를 모으고 상태의 소유자를 명확하게 하는 것**을 기준으로 합니다.

```text
app/                         # 페이지·레이아웃·API 진입점
components/
  ui/                        # Button, Toggle, FilterChip 등 공통 UI
  site-header.tsx            # 페이지 공통 헤더
features/
  lunch-map/                 # 지도·식당 목록·검색·필터·팝업
  favorites/                 # 즐겨찾기 저장·변경 알림·구독
  admin/                     # 관리자 화면·수정 흐름·HTTP 요청
  local-user/                # 로컬 사용자 정보 생성
  reviews/                   # 리뷰 패널·작성 폼·공통 검증
lib/
  server/                    # 서버 전용 로직
    db.ts                    # DB 연결
    restaurants.ts           # 식당 조회
    import/                  # 엑셀 파싱·검증·DB 동기화
  restaurant-types.ts        # 공통 데이터 타입
  coordinates.ts             # 좌표 유효성 검사
  distance.ts                # 거리 표시
  certs/                     # DB TLS 연결용 공개 CA 인증서
```

### 페이지와 공통 UI

`app/page.tsx`와 `app/admin/page.tsx`는 서버에서 식당 데이터를 읽고 각 기능의
화면 컴포넌트에 전달합니다. 페이지 파일은 전체 화면 구성에 집중하고, 지도 이벤트나
업로드 상태 같은 기능 내부의 처리는 `features`에서 담당합니다.
`app/api/admin/restaurants/route.ts`는 관리자 요청의 진입점입니다.

`components/ui`에는 식당 데이터나 DB를 알 필요가 없는 공통 부품을 둡니다.
예를 들어 `Toggle`은 전달받은 상태를 표시하고 변경 이벤트를 알립니다.
따라서 지도 필터 디자인을 바꿔도 관리자 활성·비활성 토글은 독립적으로 유지할 수 있습니다.
특정 기능에서만 사용하는 UI를 무조건 공통 폴더로 옮기지는 않습니다.

### 지도와 리스트의 역할 분리

| 파일 | 담당 역할 |
| --- | --- |
| `features/lunch-map/lunch-explorer.tsx` | 필터·선택 상태 관리, 지도와 리스트 연결 |
| `features/lunch-map/filter-restaurants.ts` | 검색어·거리·즐겨찾기 조건으로 목록 계산 |
| `features/lunch-map/restaurant-results.tsx` | 식당 목록·빈 결과·오류 화면 표시 |
| `features/lunch-map/restaurant-list-item.tsx` | 개별 식당과 즐겨찾기 버튼 표시 |
| `features/lunch-map/lunch-map.tsx` | SDK 초기화, React 상태와 지도 객체 연결 |
| `features/lunch-map/map-controller.ts` | 카카오 마커·오버레이 생성과 갱신·정리, 지도 이동 |
| `features/lunch-map/restaurant-map-card.tsx` | 선택한 식당의 팝업 UI |

`LunchExplorer`가 선택한 식당과 필터 상태를 소유합니다. 지도와 리스트가 각각
별도의 선택 상태를 관리하면 서로 다른 식당을 강조할 수 있으므로 같은 선택 값을 사용합니다.
검색·거리·즐겨찾기 필터 결과도 지도와 리스트에 함께 전달합니다.

**선택 상태와 지도 이동 요청은 별개입니다.**

| 사용자 행동 | 동작 |
| --- | --- |
| 지도 마커 클릭 | 식당 선택·팝업 표시, 지도 위치 유지 |
| 리스트 식당 클릭 | 식당 선택·팝업 표시, 해당 위치로 지도 이동 |
| 즐겨찾기 추가·해제 | 저장 상태와 마커 이미지 갱신, 지도 위치 유지 |
| 필터 변경 | 지도와 리스트에 같은 결과 적용, 선택 해제 |
| 즐겨찾기만 보는 중 선택한 식당 해제 | 목록·마커에서 제거하고 팝업 닫기 |

지도 컨트롤러는 식당 ID를 기준으로 마커를 보관합니다. 목록이 갱신돼도 유지할 수 있는
마커는 재사용하고, 사라진 식당의 마커와 이벤트만 제거합니다. 즐겨찾기 변경 때
전체 마커를 재생성하거나 이전 지도 이동 요청을 다시 실행하지 않도록 하기 위한 구조입니다.

팝업은 하나의 카카오 오버레이 컨테이너에 React `createPortal`로 렌더링합니다.
SDK 객체 관리는 컨트롤러가, 카드 내용과 버튼은 React가 담당하므로 향후 리뷰·이미지 등의
UI를 추가할 때 DOM 생성 코드를 직접 늘릴 필요가 없습니다. 팝업 내부의 클릭과
더블클릭이 지도로 전달되지 않도록 하는 처리는 오버레이 컨테이너에서 담당합니다.

### 즐겨찾기의 단일 저장 경로

```text
리스트 또는 팝업에서 즐겨찾기 변경
  → toggleStoredFavorite
  → localStorage 저장 성공
  → 같은 탭에 변경 이벤트 전달
  → useFavorites 구독 갱신
  → 리스트·팝업·지도 마커 갱신
```

`features/favorites/favorites.ts`는 저장 데이터 읽기·검증과 ID 추가·제거를 담당합니다.
`favorites-store.ts`는 브라우저 저장소 접근과 변경 알림을 담당하고,
`use-favorites.ts`는 `useSyncExternalStore`로 React에 연결합니다.
다른 탭의 변경은 브라우저 `storage` 이벤트로 구독합니다.

리스트와 팝업에서 각각 localStorage 저장 및 이벤트 발생 코드를 작성하지 않고,
`toggleStoredFavorite`를 사용합니다. 저장 실패 시 성공 알림을 발생시키지 않으며
호출한 화면에 오류를 반환합니다. 기존 사용자의 데이터를 유지하기 위해
`favorite_restaurant_ids`, `user_id`, `user_name` 저장 키는 임의로 변경하지 않습니다.

### 관리자 화면과 저장 흐름

`features/admin/admin-manager.tsx`는 관리자 화면을 조합합니다.
엑셀 업로드, 식당 테이블, 주소 오류 목록은 각각의 화면 컴포넌트로 나누고,
`use-admin-restaurants.ts`에서 입력 상태·저장 중 상태·오류·목록 갱신을 관리합니다.

자식 컴포넌트에는 여러 상태 설정 함수를 넘기는 대신 `onFileChange`,
`onAddressChange` 같은 사용자 행동 단위의 함수를 전달합니다.
예를 들어 파일 변경 시 이전 미리보기와 안내 문구를 지우는 규칙을 한곳에서 유지할 수 있습니다.

`admin-api.ts`는 HTTP 요청을 담당합니다. 상태 변경과 주소 수정의 요청 타입을 구분하여
필수 필드 누락을 TypeScript가 검사하도록 했습니다. 이 타입 검사는 서버의 인증·입력 검증을
대체하지 않습니다. 저장 중 중복 요청을 막고 서버 목록 갱신 중에도 작업 버튼을 잠급니다.

### 서버 전용 코드와 로컬 사용자

`lib/server`의 DB·엑셀 처리 코드는 서버에서만 실행합니다. 폴더 이름 자체가 보안 장치는
아니며, `server-only`를 사용해 클라이언트 코드에서 잘못 가져오는 것을 방지합니다.
DB 연결 문자열과 관리자 비밀번호 등은 서버 환경 변수로 유지합니다.

`features/local-user`는 브라우저의 익명 사용자 ID와 이름을 초기화하는 기능입니다.
즐겨찾기나 지도와 별도 책임으로 분리했습니다. localStorage에 저장한 사용자 ID는
사용자가 변경할 수 있어 인증된 본인 확인을 보장하지 않습니다. 현재 리뷰는 사용자가 선택한
토이프로젝트 방식으로 이 ID의 일치 여부만 비교하며, 자세한 동작은 아래 리뷰 절을 참고합니다.

### 기능을 추가하거나 수정할 때의 기준

- 공통 모양과 동작만 가진 UI는 `components/ui`, 특정 기능에 종속된 코드는 해당 `features`에 둡니다.
- 리뷰처럼 새 기능은 `features/reviews` 아래에 관련 화면·검증 코드를 모읍니다.
- 계산 로직은 가능한 순수 함수로 분리하고, SDK·브라우저·DB 접근과 구분합니다.
- 지도 이동은 명시적인 이동 요청으로 처리하며, 렌더링이나 즐겨찾기 변경에 연결하지 않습니다.
- 이벤트 구독과 SDK 객체를 추가하면 해제·제거 처리도 함께 작성합니다.
- 현재 규모에서는 React 상태·기능별 훅·저장소 구독으로 관리하며, 전역 상태 라이브러리는 필요가 생길 때 검토합니다.

### 변경 후 검증

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

지도 컨트롤러 테스트는 실제 카카오 SDK 대신 테스트 대역을 사용합니다.
자동 테스트 외에도 브라우저에서 다음 동작을 확인해야 합니다.

- 마커 클릭과 리스트 클릭의 지도 이동 차이
- 즐겨찾기 변경 시 팝업·지도 위치 유지와 양쪽 UI 상태 연동
- 즐겨찾기·거리·검색 필터 조합 및 결과에서 사라진 식당의 선택 해제
- 팝업 더블클릭 시 지도 확대 차단
- 지도와 관리자 페이지 왕복 후 지도 로딩 및 토글 스타일 유지
- 관리자 인증 실패·저장 실패·저장 후 목록 갱신

관리자 저장 검증은 테스트용 데이터와 환경에서 수행합니다. 화면 확인을 위해 실제 운영
식당 정보를 변경하지 않습니다. 기본 빌드가 실행 환경의 Turbopack 제한으로 실패하면
`npm run build -- --webpack`으로 추가 검증할 수 있지만, 두 빌드 결과는 구분해 기록합니다.

## Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Excel restaurant import

The `/admin` page imports a complete `.xlsx` list (up to 3 MB / 1,000 restaurants).
Set `DATABASE_URL`, `KAKAO_REST_API_KEY`, and `ADMIN_PASSWORD` in `.env` and in
Vercel's server environment variables. Never prefix these with `NEXT_PUBLIC_`.
The existing `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` is used only for browser maps.

1. Enter the administrator password and select the complete workbook.
2. Run validation/preview. Exactly one table with `가맹점명` and `주소` headers
   must exist in the first 30 rows of a visible worksheet. Hidden and very-hidden
   worksheets are excluded. Optional columns are
   `카테고리`, `대표메뉴`, and `거리` (bare numbers mean meters).
3. Review added/updated/struck/missing counts, then apply the complete list.

Matching uses name + address, ignoring whitespace and Unicode width differences.
Changing a name or address creates a new entry and deactivates the unmatched old
entry. Missing rows are never deleted. Any explicit cell or rich-text strike in
an imported data field makes that row inactive (conditional-formatting strikes
are not supported). Unstruck imported rows become active; this supersedes manual
status changes on the next import. Hidden/filtered rows within the selected visible worksheet are also imported.

All coordinates are resolved before writes. Valid existing coordinates are reused.
Failed/ambiguous address lookups save NULL address, latitude and longitude.
The address-error list shows rows whose address is NULL and lets administrators
enter an address to search and save coordinates. No additional columns are needed.
On reimport, a NULL-address row matches by name only when unambiguous; otherwise
resolve the address first. After manual correction, normal name + address matching applies.
An invalid row, stale preview, duplicate, or DB failure aborts the import without partial changes. Commit holds a table lock and
uses a transaction; updates to the table after preview require a new preview.
The main page reads only active restaurants; rows without valid coordinates are
listed but do not receive map markers.

`npm test` checks parsing and synchronization with a mock database.
`npm run db:check` checks the real DB read-only.
`node scripts/check-import.mjs` checks authenticated preview and Kakao geocoding
without inserting fixtures (requires a running local dev server).

The CA certificate in `lib/certs` is the public Supabase certificate downloaded
from its dashboard. It is included in Next.js server deployment traces.

## 식당 리뷰

지도 팝업과 식당 리스트의 `리뷰 보기`에서 리뷰를 조회·작성합니다.
PC에서는 오른쪽 패널, 모바일에서는 하단 패널을 사용합니다.

- `features/reviews/review-panel.tsx`: 조회·저장 상태와 리뷰 패널
- `features/reviews/review-form.tsx`: 추천/비추천, 내용, 태그 입력
- `features/reviews/review-model.ts`: 공통 타입과 입력 검증, 고정 태그 목록
- `app/api/reviews/route.ts`: GET/POST/PATCH/DELETE 요청 처리
- `lib/server/reviews.ts`: PostgreSQL 조회와 트랜잭션, 작성자 비교

내용은 앞뒤 공백을 제거한 뒤 1~1,000자로 제한하고, 태그는 최대 3개 선택합니다.
현재 `public.review.tags`는 `text` 타입이므로 `["tasty","good_value"]`처럼
태그 코드 배열을 JSON 문자열로 저장합니다. 추가 테이블 변경은 필요하지 않습니다.
최초 작성은 `updated_at = NULL`, 수정 시에는 서버 시간을 저장해 `수정됨`을 표시합니다.
리뷰는 최신순 20개씩 조회하며 추천·비추천 집계를 함께 표시합니다.

기존 localStorage의 `user_id`와 `user_name`을 사용하며, 없으면 기존 랜덤 생성 흐름을 사용합니다.
수정·삭제는 요청의 `user_id`와 DB 작성자 ID가 일치할 때 가능합니다.
이 방식은 사용자가 선택한 토이프로젝트 방식이며 인증된 본인 확인은 아닙니다.
ID를 바꾸거나 저장소를 지우면 기존 리뷰 소유권을 잃고, 다른 사람의 ID를 알면 사칭할 수 있습니다.
조회 응답에는 작성자의 UUID를 포함하지 않고 `is_mine`만 반환합니다.

API를 통한 등록은 식당·사용자 조합당 1개로 제한하고 트랜잭션 잠금으로 동시 중복 요청을 방지합니다.
DB 직접 입력까지 고유성을 보장하는 제약은 별도로 추가하지 않았습니다.
수정·삭제는 조회한 수정 시간도 비교해 다른 탭에서 변경된 리뷰를 덮어쓰지 않습니다.
`npm test`는 입력 제한, 소유자 조건, 중복 등록·롤백을 모의 DB로 검증합니다.

## 사용자 페이지 (`/user`)

상단 사용자 SVG 아이콘으로 이동합니다. `features/user/user-dashboard.tsx`에서
localStorage의 기존 닉네임·ID를 읽고 내 리뷰와 즐겨찾기 탭을 표시합니다.
`GET /api/reviews?scope=mine&user_id=...`는 해당 ID의 리뷰를 최신순 20개씩 반환합니다.
비활성 식당에 남긴 리뷰도 조회·수정·삭제할 수 있고 기존 리뷰 API와 작성 폼을 재사용합니다.
리뷰 수정 중에는 탭 전환을 잠가 입력 내용이 사라지는 것을 막습니다.

즐겨찾기는 기존 브라우저 저장소와 공통 store를 사용하며 해제 내용은 지도에도 반영됩니다.
활성 상태이고 좌표가 있는 식당명을 누르면 `/?restaurant=<id>#lunch-map-layout`로
이동해 지도에서 해당 식당을 선택하고 포커스합니다. 비활성 식당은 지도 링크를 제공하지 않습니다.
사용자 정보는 로그인 계정이 아니며 리뷰 권한은 기존과 동일하게 전달받은 ID 일치 여부로 판단합니다.

사용자 프로필 아래 통계는 기존 내 리뷰 API 응답에서 집계합니다.
탐방 진행률은 활성 식당 중 리뷰를 작성한 식당 수 / 전체 활성 식당 수이며,
추천·비추천 막대는 리뷰를 작성한 활성 식당의 평가 비율입니다.
페이지네이션과 무관하게 전체 기록을 집계하고, 식당별 중복 리뷰는 최신 작성 건 하나를 사용합니다.
평가가 NULL인 기존 리뷰는 탐방 수에는 포함하되 추천·비추천 비율에서는 제외합니다.
식당 또는 평가가 없으면 회색 막대와 안내를 표시합니다.
