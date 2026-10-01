'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { reviewRequest as request } from './review-api';
import RecommendationBar from './recommendation-bar';
import ReviewActionIcons from './review-action-icons';
import RecommendationBadge from '@/features/reviews/recommendation-badge';
import ReviewForm from './review-form';
import { type Review, type ReviewPage, type reviewInput } from './review-model';
import { REVIEW_TAGS } from './constants';

import useLocalUser from '@/features/local-user/use-local-user';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import useReviewFeed from './use-review-feed';
import { getDailyReviewCount, recordDailyReview } from './daily-review-limit';
import { DAILY_REVIEW_LIMIT } from './constants';
type Props = { restaurant: { id: string; name: string }; onClose: () => void };
const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

export default function ReviewPanel(props: Props) {
  const user = useLocalUser();
  return <ReviewPanelContent key={user.identity?.user_id ?? String(user.ready)} {...props} identity={user.identity} identityReady={user.ready} storageError={user.error} />;
}
function ReviewPanelContent({ restaurant, onClose, identity, identityReady, storageError }: Props & { identity: LocalIdentity | null; identityReady: boolean; storageError: string }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const params = new URLSearchParams({ restaurant_id: restaurant.id });
  if (identity) params.set('user_id', identity.user_id);
  const feed = useReviewFeed<ReviewPage>(identityReady ? `/api/reviews?${params}` : null);
  const { page, busy, load } = feed;
  const loading = !identityReady || feed.loading;
  const [actionError, setError] = useState('');
  const error = actionError || feed.error;
  const [editing, setEditing] = useState<Review | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);
  const [notice, setNotice] = useState('');
  const [limitReached, setLimitReached] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function canCreateReview() {
    try {
      if (getDailyReviewCount(window.localStorage) < DAILY_REVIEW_LIMIT) return true;
      setLimitReached(true);
    } catch {
      setError('리뷰 작성 횟수를 확인할 수 없습니다. 브라우저 저장소 설정을 확인해 주세요.');
    }
    return false;
  }
  async function mutate(method: 'POST' | 'PATCH' | 'DELETE', review: Review | null, input?: ReturnType<typeof reviewInput>) {
    if (!identity) return;
    if (method === 'POST' && !canCreateReview()) return;
    setError(''); setNotice('');
    if (await feed.mutate(method, { ...identity, restaurant_id: restaurant.id, id: review?.id, version: review?.updated_at ?? review?.created_at, ...input }, method === 'POST' ? () => {
      try { recordDailyReview(window.localStorage); }
      catch { setError('리뷰는 등록되었지만 작성 횟수를 저장하지 못했습니다.'); }
    } : undefined)) {
      router.refresh();
      setEditing(null); setDeleting(null);
      setNotice(method === 'DELETE' ? '' : '리뷰를 저장했습니다.');
    }
  }
  async function reloadEditing() {
    if (!identity) return null;
    if (editing && editing !== 'new') {
      const result = await request<{ review: Review | null }>(`/api/reviews?${new URLSearchParams({ scope: 'review', review_id: editing.id, user_id: identity.user_id })}`);
      return result.review;
    }
    const result = await request<ReviewPage>(`/api/reviews?${params}`);
    return result.mine;
  }
  function close() {
    if (busy) return;
    if (editing && !window.confirm('리뷰 작성을 닫을까요? 작성 중인 내용은 저장되지 않습니다.')) return;
    onClose();
  }

  return <dialog ref={dialog} className="review-panel" aria-labelledby="review-panel-title" onCancel={event => { event.preventDefault(); close(); }}>
    {limitReached && <ConfirmDialog title="오늘의 리뷰를 모두 작성했어요" description={`하루에 작성할 수 있는 리뷰 ${DAILY_REVIEW_LIMIT}개를 모두 사용했어요.\n내일 다시 점심 이야기를 남겨 주세요.`} confirmLabel="확인" showCancel={false} onConfirm={() => setLimitReached(false)} onCancel={() => setLimitReached(false)} />}
    {deleting && <ConfirmDialog title="리뷰를 삭제할까요?" description="삭제한 리뷰는 복구할 수 없습니다." confirmLabel="삭제" busy={busy} error={error} onCancel={() => setDeleting(null)} onConfirm={() => void mutate('DELETE', deleting).catch(cause => setError(cause instanceof Error ? cause.message : '삭제하지 못했습니다.'))} />}
    <header className="review-panel-header"><div><p className="subtle">식당 리뷰</p><h2 id="review-panel-title">{restaurant.name}</h2></div><button type="button" className="review-close" aria-label="리뷰 닫기" disabled={busy} onClick={close}>×</button></header>
    <div className="review-panel-body">
      {page && <div className="review-summary"><strong>리뷰 {page.total}개</strong><RecommendationBar recommended={page.recommended} notRecommended={page.not_recommended} /></div>}
      {storageError && <p className="subtle">{storageError}</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <div role="alert" className="review-error">{error} <Button disabled={loading || busy || Boolean(editing)} onClick={() => { setError(''); void load(); }}>다시 불러오기</Button></div>}
      {page && identity && !editing && <Button disabled={busy || loading} onClick={() => { if (!page.mine && !canCreateReview()) return; setEditing(page.mine ?? 'new'); setDeleting(null); }}>{page.mine ? '내 리뷰 수정' : '리뷰 작성'}</Button>}
      {editing && <ReviewForm key={editing === 'new' ? 'new' : editing.id} review={editing === 'new' ? null : editing} name={identity?.user_name ?? ''} busy={busy || loading} onReload={reloadEditing} onCancel={() => setEditing(null)} onSave={(input, base) => mutate(base ? 'PATCH' : 'POST', base, input)} />}
      {loading && <p role="status">리뷰를 불러오는 중…</p>}
      {page?.total === 0 && !loading && <p className="review-empty">아직 리뷰가 없어요. 첫 점심 후기를 남겨 주세요.</p>}
      <ul className="review-list">{page?.reviews.map(review => <li key={review.id} className="review-item">
        <div className="review-item-heading"><strong>{review.user_name || '익명'} {review.is_mine && <small>내 리뷰</small>}</strong><div className="review-heading-actions"><RecommendationBadge recommended={review.is_recommended} />
          {review.is_mine && <ReviewActionIcons disabled={busy || loading || Boolean(editing)} onEdit={() => setEditing(review)} onDelete={() => { setError(''); setDeleting(review); }} />}
        </div></div>
        <p className="subtle">{DATE_FORMAT.format(new Date(review.updated_at ?? review.created_at))}{review.updated_at && ' · 수정됨'}</p>
        <p className="review-content">{review.content}</p>
        <div className="review-tags">{review.tags.map(tag => <span key={tag}>{REVIEW_TAGS.find(option => option.value === tag)?.label}</span>)}</div>

      </li>)}</ul>
      {page?.hasMore && <Button disabled={loading || busy || Boolean(editing)} onClick={() => void load(true)}>리뷰 더 보기</Button>}
    </div>
  </dialog>;
}
