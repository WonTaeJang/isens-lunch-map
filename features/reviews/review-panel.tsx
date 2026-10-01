'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/button';
import ReviewForm from './review-form';
import { REVIEW_TAGS, uuid, type Review, type ReviewPage, type reviewInput } from './review-model';

type Identity = { user_id: string; user_name: string };
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || '리뷰 요청을 처리하지 못했습니다.');
  return body;
}
const DATE_FORMAT = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

export default function ReviewPanel({ restaurant, onClose }: { restaurant: { id: string; name: string }; onClose: () => void }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const alive = useRef(true);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [page, setPage] = useState<ReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [editing, setEditing] = useState<Review | 'new' | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const mutationLock = useRef(false);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    dialog.current?.showModal();
    async function initialize() {
      let user: Identity | null = null;
      try {
        const { ensureLocalUser } = await import('@/features/local-user/local-user');
        user = ensureLocalUser(window.localStorage);
        uuid(user.user_id);
      } catch { user = null; if (!controller.signal.aborted) setStorageError('브라우저의 사용자 정보를 사용할 수 없어 리뷰 조회만 가능합니다.'); }
      if (controller.signal.aborted) return;
      setIdentity(user);
      try {
        const params = new URLSearchParams({ restaurant_id: restaurant.id });
        if (user) params.set('user_id', user.user_id);
        const result = await request<ReviewPage>(`/api/reviews?${params}`, { signal: controller.signal });
        if (!controller.signal.aborted) setPage(result);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : '리뷰를 불러오지 못했습니다.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void initialize();
    return () => { alive.current = false; controller.abort(); };
  }, [restaurant.id]);

  async function load(more = false) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ restaurant_id: restaurant.id, offset: String(more ? page?.reviews.length ?? 0 : 0) });
      if (identity) params.set('user_id', identity.user_id);
      const result = await request<ReviewPage>(`/api/reviews?${params}`);
      if (alive.current) setPage(current => more && current ? { ...result, reviews: [...current.reviews, ...result.reviews.filter(row => !current.reviews.some(existing => existing.id === row.id))] } : result);
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : '리뷰를 불러오지 못했습니다.'); }
    finally { if (alive.current) setLoading(false); }
  }
  async function mutate(method: string, review: Review | null, input?: ReturnType<typeof reviewInput>) {
    if (!identity || mutationLock.current) return;
    mutationLock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      await request('/api/reviews', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, restaurant_id: restaurant.id, id: review?.id, version: review?.updated_at ?? review?.created_at, ...input }) });
      if (!alive.current) return;
      router.refresh();
      setEditing(null); setDeleting(null); setNotice(method === 'DELETE' ? '리뷰를 삭제했습니다.' : '리뷰를 저장했습니다.');
      await load();
    } finally { mutationLock.current = false; if (alive.current) setBusy(false); }
  }
  function close() {
    if (busy) return;
    if (editing && !window.confirm('리뷰 작성을 닫을까요? 작성 중인 내용은 저장되지 않습니다.')) return;
    onClose();
  }

  return <dialog ref={dialog} className="review-panel" aria-labelledby="review-panel-title" onCancel={event => { event.preventDefault(); close(); }}>
    <header className="review-panel-header"><div><p className="subtle">식당 리뷰</p><h2 id="review-panel-title">{restaurant.name}</h2></div><button type="button" className="review-close" aria-label="리뷰 닫기" disabled={busy} onClick={close}>×</button></header>
    <div className="review-panel-body">
      {page && <div className="review-summary"><strong>리뷰 {page.total}개</strong><span>추천 {page.recommended}</span><span>비추천 {page.not_recommended}</span></div>}
      {storageError && <p className="subtle">{storageError}</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <div role="alert" className="review-error">{error} <Button disabled={loading || busy} onClick={() => void load()}>다시 불러오기</Button></div>}
      {page && identity && !editing && <Button disabled={busy || loading} onClick={() => { setEditing(page.mine ?? 'new'); setDeleting(null); }}>{page.mine ? '내 리뷰 수정' : '리뷰 작성'}</Button>}
      {editing && <ReviewForm key={editing === 'new' ? 'new' : editing.id} review={editing === 'new' ? null : editing} name={identity?.user_name ?? ''} busy={busy} onCancel={() => setEditing(null)} onSave={input => mutate(editing === 'new' ? 'POST' : 'PATCH', editing === 'new' ? null : editing, input)} />}
      {loading && <p role="status">리뷰를 불러오는 중…</p>}
      {page?.total === 0 && !loading && <p className="review-empty">아직 리뷰가 없어요. 첫 점심 후기를 남겨 주세요.</p>}
      <ul className="review-list">{page?.reviews.map(review => <li key={review.id} className="review-item">
        <div className="review-item-heading"><strong>{review.user_name || '익명'} {review.is_mine && <small>내 리뷰</small>}</strong><span>{review.is_recommended === true ? '추천' : review.is_recommended === false ? '비추천' : '평가 없음'}</span></div>
        <p className="subtle">{DATE_FORMAT.format(new Date(review.created_at))}{review.updated_at && ' · 수정됨'}</p>
        <p className="review-content">{review.content}</p>
        <div className="review-tags">{review.tags.map(tag => <span key={tag}>{REVIEW_TAGS.find(option => option.value === tag)?.label}</span>)}</div>
        {review.is_mine && <div className="review-actions">
          {deleting === review.id ? <><span>리뷰를 삭제할까요?</span><Button disabled={busy || loading} onClick={() => void mutate('DELETE', review).catch(cause => setError(cause instanceof Error ? cause.message : '삭제하지 못했습니다.'))}>삭제 확인</Button><Button disabled={busy} onClick={() => setDeleting(null)}>취소</Button></> : <><Button disabled={busy || loading || Boolean(editing)} onClick={() => setEditing(review)}>수정</Button><Button disabled={busy || loading || Boolean(editing)} onClick={() => setDeleting(review.id)}>삭제</Button></>}
        </div>}
      </li>)}</ul>
      {page?.hasMore && <Button disabled={loading || busy} onClick={() => void load(true)}>리뷰 더 보기</Button>}
    </div>
  </dialog>;
}
