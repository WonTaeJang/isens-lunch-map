'use client';
import EmptyState from '../components/empty-state';
import CountBadge from '../components/count-badge';
import type { RestaurantRow } from '@/lib/restaurant-types';
import Toggle from '../components/toggle';
const STATUS_TABS = [
  { value: 'active', label: '활성화' },
  { value: 'inactive', label: '비활성화' },
] as const;
const TAB_NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End']);

type Props = {
 restaurants: RestaurantRow[]; error: string | null; activeTab: 'active' | 'inactive'; setActiveTab: (value: 'active' | 'inactive') => void;
 activeCount: number; visibleRestaurants: RestaurantRow[]; busy: boolean; toggle: (row: RestaurantRow, active: boolean) => Promise<void>;
};
export default function RestaurantTable(props: Props) {
  const {restaurants, error, activeTab, setActiveTab, activeCount, visibleRestaurants, busy, toggle} = props;
  return (
    <section className="table-section"><h2>등록된 식당 <CountBadge>{error ? '—' : restaurants.length}</CountBadge></h2>
      <div className="restaurant-tabs" role="tablist" aria-label="식당 활성 상태">
        {STATUS_TABS.map(({value: tab, label}) => <button
          key={tab} type="button" role="tab" id={`restaurant-tab-${tab}`}
          aria-selected={activeTab === tab} aria-controls="restaurant-panel" tabIndex={activeTab === tab ? 0 : -1}
          onClick={()=>setActiveTab(tab)}
          onKeyDown={e=>{
            if (!TAB_NAVIGATION_KEYS.has(e.key)) return;
            e.preventDefault();
            const next = e.key === 'Home' ? 'active' : e.key === 'End' ? 'inactive' : activeTab === 'active' ? 'inactive' : 'active';
            setActiveTab(next);
            document.getElementById(`restaurant-tab-${next}`)?.focus();
          }}
        >{label} <span>{error ? '—' : tab === 'active' ? activeCount : restaurants.length-activeCount}</span></button>)}
      </div>
      <div id="restaurant-panel" role="tabpanel" aria-labelledby={`restaurant-tab-${activeTab}`} tabIndex={0} className="table-scroll"><table><thead><tr><th>식당명</th><th>분류 / 메뉴</th><th>주소</th><th>거리</th><th>상태</th></tr></thead><tbody>{visibleRestaurants.map(r=><tr key={r.id}><td style={{textDecoration:r.active?'none':'line-through'}}>{r.name}</td><td>{r.category}<br/>{r.main_menu}</td><td>{r.address || '주소 확인 필요'}</td><td>{r.distance === null ? '—' : `${r.distance}m`}</td><td><Toggle label={`${r.name} 활성 상태`} checked={!!r.active} disabled={busy || !!error} onCheckedChange={active=>{void toggle(r, active);}} onLabel="활성" offLabel="비활성" /></td></tr>)}{!visibleRestaurants.length && <tr><td colSpan={5}><EmptyState variant="table">{error ? '목록을 불러오지 못했습니다.' : `${activeTab === 'active' ? '활성화된' : '비활성화된'} 식당이 없습니다.`}</EmptyState></td></tr>}</tbody></table></div>
    </section>
  );
}
