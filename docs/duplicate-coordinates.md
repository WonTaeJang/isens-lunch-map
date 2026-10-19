# 좌표가 같은 식당 확인 (SQL)

같은 건물에 있는 식당은 주소 → 좌표 변환 결과가 같아서 위도·경도가 완전히 같게 저장됩니다.
지도는 이런 식당을 **숫자 원 하나**로 묶어 보여 주고, 누르면 "여기 모인 식당 N곳" 목록이 뜹니다
(`features/lunch-map/coordinate-groups.ts`, `docs/architecture.md` 참고). 그래서 좌표를 손으로 옮길 필요가 없습니다.

> 예전에는 겹치는 식당을 4m씩 원형으로 펼치는 SQL을 썼지만, 펼친 좌표는 서로 다른 위치로 보여
> 숫자 원으로 묶이지 않으므로 더 이상 쓰지 않습니다. 펼친 좌표나 손으로 옮긴 좌표가 남아 있으면
> 관리자 페이지 **업데이트 → 좌표 재측정**으로 저장된 주소의 카카오 좌표로 되돌립니다.

아래 SQL은 데이터를 바꾸지 않는 조회용입니다. Supabase **SQL Editor**에서 실행합니다.

## 좌표가 같은 식당 찾기

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

- `restaurants.latitude`, `longitude`는 `text` 컬럼이라 숫자로 바꿔 소수점 7자리(약 1cm)로 비교합니다.
  지도의 묶음 기준(`coordinateKey`)과 같습니다.
- 지도에 보이는 식당만 보려면 `where`에 `and active = true`를 추가합니다.
- 반올림 자릿수를 `7` → `4`로 바꾸면 약 10m 안의 가까운 식당까지 볼 수 있습니다(대략적인 격자 기준).
  이렇게 가깝지만 좌표가 다른 식당은 지도에서 묶이지 않습니다.
