'use client';

import { useState } from 'react';
import Button from '@/components/ui/button';
import { MAX_REVIEW_LENGTH, REVIEW_TAGS, reviewInput, type Review } from './review-model';

export default function ReviewForm({ review, name, busy, onSave, onCancel }: {
  review: Review | null; name: string; busy: boolean;
  onSave: (input: ReturnType<typeof reviewInput>) => Promise<void>; onCancel: () => void;
}) {
  const [content, setContent] = useState(review?.content ?? '');
  const [recommended, setRecommended] = useState<boolean | null>(review?.is_recommended ?? null);
  const [tags, setTags] = useState<string[]>(review?.tags ?? []);
  const [error, setError] = useState('');
  const length = Array.from(content.trim()).length;
  return <form className="review-form" onSubmit={async event => {
    event.preventDefault();
    try { const input = reviewInput({ content, is_recommended: recommended, tags }); setError(''); await onSave(input); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.'); }
  }}>
    <h3>{review ? '리뷰 수정' : '리뷰 작성'}</h3><p className="subtle">{name}</p>
    <fieldset disabled={busy}><legend>이 식당을 추천하나요?</legend><div className="review-options">
      <button type="button" aria-pressed={recommended === true} onClick={() => setRecommended(true)}>추천해요</button>
      <button type="button" aria-pressed={recommended === false} onClick={() => setRecommended(false)}>비추천해요</button>
    </div></fieldset>
    <label htmlFor="review-content">리뷰 내용</label>
    <textarea id="review-content" rows={5} value={content} disabled={busy} onChange={event => setContent(event.target.value)} placeholder="메뉴, 맛, 점심시간에 이용한 경험을 나눠 주세요." aria-describedby="review-length" />
    <span id="review-length" className="subtle">{length.toLocaleString()} / 1,000자</span>
    <fieldset disabled={busy}><legend>태그 <span className="subtle">선택 · 최대 3개</span></legend><div className="review-options">
      {REVIEW_TAGS.map(tag => <button type="button" key={tag.value} aria-pressed={tags.includes(tag.value)} disabled={!tags.includes(tag.value) && tags.length >= 3} onClick={() => setTags(current => current.includes(tag.value) ? current.filter(value => value !== tag.value) : [...current, tag.value])}>{tag.label}</button>)}
    </div></fieldset>
    {error && <p role="alert" className="review-error">{error}</p>}
    <div className="review-actions"><Button type="submit" loading={busy} disabled={!length || length > MAX_REVIEW_LENGTH || recommended === null}>{review ? '수정 저장' : '리뷰 등록'}</Button><Button disabled={busy} onClick={onCancel}>취소</Button></div>
  </form>;
}
