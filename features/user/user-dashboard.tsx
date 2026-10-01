'use client';
import styles from './user.module.css';

import UserProgress from './user-progress';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/button';
import useFavorites from '@/features/favorites/use-favorites';
import { toggleStoredFavorite } from '@/features/favorites/favorites-store';
import RecommendationBadge from '@/features/reviews/recommendation-badge';
import ReviewForm from '@/features/reviews/review-form';
import { reviewRequest } from '@/features/reviews/review-api';
import { REVIEW_TAGS, type Review, type UserReview, type UserReviewPage, type reviewInput } from '@/features/reviews/review-model';
import type { RestaurantRow } from '@/lib/restaurant-types';
import { hasCoordinates } from '@/lib/coordinates';
import { formatDistance } from '@/lib/distance';

import useLocalUser from '@/features/local-user/use-local-user';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import useReviewFeed from '@/features/reviews/use-review-feed';
type Props = { restaurants: RestaurantRow[]; failed: boolean };
const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
const TABS = [{ value: 'reviews', label: '내 리뷰' }, { value: 'favorites', label: '즐겨찾기' }] as const;
function mapLink(id: string) { return `/?restaurant=${encodeURIComponent(id)}#lunch-map-layout`; }

export default function UserDashboard(props: Props) {
  const user = useLocalUser();
  return <UserDashboardContent key={user.identity?.user_id ?? String(user.ready)} {...props} identity={user.identity} identityReady={user.ready} identityError={user.error} />;
}
function UserDashboardContent({ restaurants, failed, identity, identityReady, identityError }: Props & { identity: LocalIdentity | null; identityReady: boolean; identityError: string }) {
  const router = useRouter();
  const favorites = useFavorites();
  const feed = useReviewFeed<UserReviewPage>(identity ? `/api/reviews?${new URLSearchParams({ scope: 'mine', user_id: identity.user_id })}` : null);
  const { page, busy, load } = feed;
  const loading = !identityReady || feed.loading;
  const [actionError, setError] = useState('');
  const error = identityError || actionError || feed.error;
  const [tab, setTab] = useState<'reviews' | 'favorites'>('reviews');
  const [favoriteError, setFavoriteError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<UserReview | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const savedRestaurants = restaurants.filter(row => favorites.has(row.id));
  async function mutate(method: 'PATCH' | 'DELETE', review: Review, input?: ReturnType<typeof reviewInput>) {
    if (!identity) return;
    setError(''); setNotice('');
    if (await feed.mutate(method, { user_id: identity.user_id, id: review.id, version: review.updated_at ?? review.created_at, ...input })) {
      setEditing(null); setDeleting(null);
      setNotice(method === 'DELETE' ? '리뷰를 삭제했습니다.' : '리뷰를 수정했습니다.');
      router.refresh();
    }
  }
  async function reloadEditing() {
    if (!identity || !editing) return null;
    const result = await reviewRequest<{ review: Review | null }>(`/api/reviews?${new URLSearchParams({ scope: 'review', review_id: editing.id, user_id: identity.user_id })}`);
    return result.review;
  }

  return <div className={styles['user-dashboard']}>
    <section className={styles['user-profile']} aria-label="내 프로필">
      <span className={styles['user-avatar']} aria-hidden="true"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></svg></span>
      <div><p className="subtle">나의 점심 기록</p><h1>{identity?.user_name ?? (identityReady ? '사용자 정보를 확인해 주세요' : '불러오는 중…')}</h1><p className="subtle">작성한 리뷰 {page?.total ?? '—'} · 즐겨찾기 {identityReady ? favorites.size : '—'}</p></div>
    </section>
    <UserProgress stats={page} loading={loading} />
    <div className={styles['user-tabs']} aria-label="내 기록 분류">{TABS.map(item => <button type="button" key={item.value} aria-pressed={tab === item.value} disabled={busy || Boolean(editing)} onClick={() => setTab(item.value)}>{item.label}</button>)}</div>
    {tab === 'reviews' ? <section className={styles['user-records']} aria-label="내 리뷰">
      {error && <div className="review-error" role="alert">{error} <Button disabled={loading || busy || Boolean(editing)} onClick={() => { setError(''); if (identity) void load(); else window.location.reload(); }}>다시 불러오기</Button></div>}
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">내 리뷰를 불러오는 중…</p>}
      {page?.total === 0 && !loading && <div className="review-empty">아직 작성한 리뷰가 없어요. <Link href="/" className="text-link">점심 지도에서 식당 찾아보기</Link></div>}
      <ul className="review-list">{page?.reviews.map(review => <li className={`review-item${review.restaurant_active ? '' : ` ${styles['user-restaurant-inactive']}`}`} key={review.id}>
        <div className="review-item-heading"><h2>{review.restaurant_active && hasCoordinates(review) ? <Link href={mapLink(review.restaurant_id)}>{review.restaurant_name} ↗</Link> : review.restaurant_name}</h2><RecommendationBadge recommended={review.is_recommended} /></div>
        {!review.restaurant_active && <p className="subtle">현재 비활성 식당입니다.</p>}
        {review.restaurant_active && !hasCoordinates(review) && <p className="subtle">위치 확인 중 · 지도 이동 불가</p>}
        <p className="subtle">{DATE_FORMAT.format(new Date(review.updated_at ?? review.created_at))}{review.updated_at && ' · 수정됨'}</p>
        {editing?.id === review.id ? <ReviewForm key={editing.id} review={editing} name={identity?.user_name ?? ''} busy={busy || loading} onReload={reloadEditing} onCancel={() => setEditing(null)} onSave={(input, base) => mutate('PATCH', base ?? editing, input)} /> : <>
          <p className="review-content">{review.content}</p>
          <div className="review-tags">{review.tags.map(tag => <span key={tag}>{REVIEW_TAGS.find(option => option.value === tag)?.label}</span>)}</div>
          <div className="review-actions">{deleting === review.id ? <><span>리뷰를 삭제할까요?</span><Button disabled={busy || loading} onClick={() => void mutate('DELETE', review).catch(cause => setError(cause instanceof Error ? cause.message : '삭제하지 못했습니다.'))}>삭제 확인</Button><Button disabled={busy} onClick={() => setDeleting(null)}>취소</Button></> : <><Button disabled={busy || loading || Boolean(editing)} onClick={() => { setEditing(review); setDeleting(null); }}>수정</Button><Button disabled={busy || loading || Boolean(editing)} onClick={() => setDeleting(review.id)}>삭제</Button></>}</div>
        </>}
      </li>)}</ul>
      {page?.hasMore && <Button disabled={busy || loading || Boolean(editing)} onClick={() => void load(true)}>더 보기</Button>}
    </section> : <section className={styles['user-records']} aria-label="즐겨찾기 식당">
      {favoriteError && <p className="review-error" role="alert">{favoriteError}</p>}
      {failed ? <p role="alert">식당 목록을 불러오지 못했습니다. <Button onClick={() => router.refresh()}>다시 불러오기</Button></p> : <>
        {!savedRestaurants.length && <p className="review-empty">즐겨찾기한 식당이 없어요. <Link href="/" className="text-link">식당 찾아보기</Link></p>}
        <ul className="review-list">{savedRestaurants.map(row => <li className={`review-item${row.active ? '' : ` ${styles['user-restaurant-inactive']}`}`} key={row.id}>
          <div className="review-item-heading"><h2>{row.active && hasCoordinates(row) ? <Link href={mapLink(row.id)}>{row.name} ↗</Link> : row.name}</h2><span className="distance-badge">{formatDistance(row.distance)}</span></div>
          <p className="description">{row.category} · {row.main_menu}</p><p className="description">{row.address || '주소 확인 필요'}</p>
          {!row.active && <p className="subtle">현재 비활성 식당입니다.</p>}
          <button type="button" className={styles['user-remove-favorite']} onClick={() => setFavoriteError(toggleStoredFavorite(row.id) ?? '')} aria-label={`${row.name} 즐겨찾기 해제`}>즐겨찾기 해제</button>
        </li>)}</ul>
      </>}
    </section>}
    <p className={styles['user-storage-note']}>이 브라우저에 저장된 사용자 정보입니다. 브라우저 데이터를 삭제하면 기존 리뷰를 관리할 수 없어요.</p>
  </div>;
}
