# 게임 횟수 테이블 (SQL)

슬롯 게임(오늘 뭐 먹지?)과 오늘의 점심 상자를 날짜(한국 시간)별로 몇 번 했는지 셉니다.
Supabase **SQL Editor**에서 한 번 실행합니다.

```sql
create table public.game_play_daily (
  play_date date    not null,
  game      text    not null check (game in ('slot', 'lunch_box')),
  plays     integer not null default 0 check (plays >= 0),
  primary key (play_date, game)
);
```

- 게임 팝업이 열려 있는 동안 한 판 수를 세어 두었다가, **팝업이 닫힐 때** `POST /api/game-plays`로
  `{ game, plays }`를 보내 그날 그 게임의 `plays`에 더합니다(`lib/server/game-plays.ts`,
  없으면 행을 만들고 있으면 더하는 upsert 한 번). 한 판도 안 하고 닫으면 보내지 않습니다.
  - 슬롯: "뽑기"로 식당이 정해질 때마다 한 판. "다시 뽑기"도 한 판입니다.
  - 점심 상자: 상자를 열어 결과가 나올 때마다 한 판(상자 뽑기 기록에 한 줄 추가될 때).
  - 팝업을 연 채 탭을 닫거나 새로고침하거나 휴대폰에서 다른 앱으로 넘어가면(`pagehide`,
    화면이 숨겨질 때) 그때까지의 판 수를 보냅니다. 브라우저가 강제 종료되면 드물게 빠질 수 있습니다.
  - 한 번에 보낼 수 있는 판 수는 1~100이며, 100판이 차면 닫기 전에도 먼저 보냅니다.
- 날짜는 저장하는 순간의 `(now() at time zone 'Asia/Seoul')::date`로 서버에서 정합니다(자정을 넘겨 닫으면 닫은 날짜).
- 화면은 저장을 기다리지 않고 실패해도 무시합니다. 테이블이 아직 없으면 횟수만 저장되지 않고 게임은 그대로 됩니다.
- 사용자 정보는 남기지 않습니다.

## 조회 예시

```sql
-- 최근 2주, 날짜별 게임 횟수
select play_date,
       sum(plays) filter (where game = 'slot')      as slot,
       sum(plays) filter (where game = 'lunch_box') as lunch_box
from public.game_play_daily
where play_date >= (now() at time zone 'Asia/Seoul')::date - 13
group by play_date
order by play_date desc;
```
