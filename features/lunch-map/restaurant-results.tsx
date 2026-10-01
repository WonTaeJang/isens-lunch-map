import Link from 'next/link';
import Button from '@/components/ui/button';
import EmptyState from '@/components/ui/empty-state';
import RestaurantListItem from './restaurant-list-item';
import type { MapRestaurant } from '@/lib/restaurant-types';

type Props = {
  rows: MapRestaurant[];
  total: number;
  failed: boolean;
  favoritesOnly: boolean;
  favorites: ReadonlySet<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onReset: () => void;
};

export default function RestaurantResults({ rows, total, failed, favoritesOnly, favorites, selectedId, onSelect, onFavorite, onReset }: Props) {
  if (failed) return <EmptyState role="alert">식당 목록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</EmptyState>;
  if (!total) return <EmptyState icon="⌖" title="활성 식당이 없어요" description="관리자 페이지에서 식당 목록을 등록해 주세요." action={<Link href="/admin" className="text-link">리스트 관리로 이동 ↗</Link>} />;
  if (!rows.length) return <EmptyState title={favoritesOnly ? '조건에 맞는 즐겨찾기 식당이 없어요' : '조건에 맞는 식당이 없어요'} description={favoritesOnly ? '즐겨찾기를 추가하거나 필터를 변경해 보세요.' : '검색어나 거리 필터를 변경해 보세요.'} action={<Button onClick={onReset}>필터 초기화</Button>} />;
  return (
    <ul className="restaurant-results">
      {rows.map(row => <RestaurantListItem key={row.id} row={row} favorite={favorites.has(row.id)} selected={selectedId === row.id} onFavorite={() => onFavorite(row.id)} onSelect={() => onSelect(row.id)} />)}
    </ul>
  );
}
