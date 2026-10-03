# 좌표가 같은 식당 펼치기 (SQL)

같은 건물에 있는 식당은 엑셀 가져오기 때 주소 → 좌표 변환 결과가 같아서 위도·경도가 완전히 같게 저장됩니다.
이 경우 지도에서 마커가 정확히 겹쳐 맨 위 마커만 클릭되므로, 겹치는 식당을 원래 위치에서 **4m씩** 원형으로 옮깁니다.
모든 SQL은 Supabase **SQL Editor**에서 실행합니다.

- `restaurants.latitude`, `longitude`는 `text` 컬럼이므로 숫자로 바꿔(`round(..., 7)`, 약 1cm) 비교합니다.
- 좌표가 비어 있거나 숫자가 아닌 행, 겹치지 않는 식당은 바뀌지 않습니다.
- 묶음 안에서는 활성 식당부터 이름순으로 북쪽부터 시계 방향으로 놓입니다.
- `updated_at`은 바꾸지 않습니다. 거리 표시는 엑셀의 `distance` 값을 쓰므로 영향이 없습니다.

## 1. 좌표가 같은 식당 찾기

```sql
with coords as (
  select id, name, address, active,
         round(latitude::numeric, 7)  as lat,
         round(longitude::numeric, 7) as lng
  from public.restaurants
  where latitude  ~ '^-?[0-9]+(\.[0-9]+)?$'
    and longitude ~ '^-?[0-9]+(\.[0-9]+)?$'
)
select lat, lng,
       count(*) as cnt,
       string_agg(name || case when active then '' else ' (비활성)' end, ', ' order by name) as names,
       string_agg(distinct coalesce(address, '(주소 없음)'), ' / ') as addresses
from coords
group by lat, lng
having count(*) > 1
order by cnt desc, lat, lng;
```

- 지도에 보이는 식당만 보려면 `where`에 `and active = true`를 추가합니다.
- 반올림 자릿수를 `7` → `4`로 바꾸면 약 10m 안의 가까운 식당까지 묶입니다(대략적인 격자 기준).

## 2. 백업

실행할 때마다 날짜를 바꿔 새로 만듭니다.

```sql
create table public.restaurants_coord_backup_YYYYMMDD as
select id, latitude, longitude from public.restaurants;
```

## 3. 미리보기 (수정하지 않음)

```sql
with coords as (
  select id, name, active,
         round(latitude::numeric, 7)  as lat,
         round(longitude::numeric, 7) as lng
  from public.restaurants
  where latitude  ~ '^-?[0-9]+(\.[0-9]+)?$'
    and longitude ~ '^-?[0-9]+(\.[0-9]+)?$'
), grouped as (
  select *,
         count(*) over (partition by lat, lng) as n,
         row_number() over (partition by lat, lng order by active desc nulls last, name, id) - 1 as k
  from coords
), moved as (
  select id, name, active, n, k, lat, lng,
         4 as r,                      -- 원래 위치에서 이동 거리(m)
         2 * pi() * k / n as theta
  from grouped
  where n > 1
)
select id, name, active, n, lat, lng,
       round((lat + r * cos(theta) / 111320)::numeric, 7) as new_lat,
       round((lng + r * sin(theta) / (111320 * cos(radians(lat))))::numeric, 7) as new_lng
from moved
order by lat, lng, k;
```

## 4. 적용

```sql
with coords as (
  select id, name, active,
         round(latitude::numeric, 7)  as lat,
         round(longitude::numeric, 7) as lng
  from public.restaurants
  where latitude  ~ '^-?[0-9]+(\.[0-9]+)?$'
    and longitude ~ '^-?[0-9]+(\.[0-9]+)?$'
), grouped as (
  select *,
         count(*) over (partition by lat, lng) as n,
         row_number() over (partition by lat, lng order by active desc nulls last, name, id) - 1 as k
  from coords
), moved as (
  select id, lat, lng,
         4 as r,
         2 * pi() * k / n as theta
  from grouped
  where n > 1
)
update public.restaurants r
set latitude  = round((m.lat + m.r * cos(m.theta) / 111320)::numeric, 7)::text,
    longitude = round((m.lng + m.r * sin(m.theta) / (111320 * cos(radians(m.lat))))::numeric, 7)::text
from moved m
where r.id = m.id;
```

## 5. 확인

1번 쿼리를 다시 실행해 결과가 0행이면 완료입니다.

## 되돌리기

```sql
update public.restaurants r
set latitude = b.latitude, longitude = b.longitude
from public.restaurants_coord_backup_YYYYMMDD b
where r.id = b.id;
```

## 참고

- 이동 거리는 `4 as r`(3·4번 두 곳)에서 바꿉니다. 묶음 크기와 관계없이 모두 같은 거리만큼 옮기므로,
  이웃 마커 간격은 2곳이면 8m, 6곳이면 4m, 7곳이면 약 3.5m입니다.
- 이미 펼쳐진 좌표에는 같은 좌표 묶음이 없으므로 다시 실행해도 바뀌지 않습니다. 이동 거리를 바꿔 다시 적용하려면
  먼저 백업으로 되돌린 뒤 실행합니다.
- 엑셀을 다시 가져와도 기존 식당의 좌표는 유지됩니다. 새로 추가된 식당이 기존 식당과 주소 문자열까지 같으면
  그 좌표를 그대로 받아 다시 겹칠 수 있으니, 가져온 뒤 1번으로 확인하고 3~4번을 다시 실행합니다.
- 지도 확대 레벨 2에서 1m는 약 2px이라 4m는 약 8px 차이로 보입니다(레벨 1에서는 약 16px).
