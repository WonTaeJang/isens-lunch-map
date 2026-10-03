'use client';

import { useReducer, useState } from 'react';
import { createReviewEditor, reviewEditorReducer } from './review-editor';
import { ApiError } from './review-api';
import Button from '@/components/ui/button';
import { reviewInput, type Review } from '@/lib/reviews/model';
import { MAX_REVIEW_LENGTH, MAX_REVIEW_TAGS, REVIEW_TAG_GROUPS } from '@/lib/reviews/constants';

export default function ReviewForm({
  review,
  name,
  busy,
  onSave,
  onCancel,
  onReload,
}: {
  review: Review | null;
  name: string;
  busy: boolean;
  onSave: (input: ReturnType<typeof reviewInput>, base: Review | null) => Promise<void>;
  onCancel: () => void;
  onReload: () => Promise<Review | null>;
}) {
  const [{ base, conflict, latest, content, recommended, tags }, dispatch] = useReducer(
    reviewEditorReducer,
    review,
    createReviewEditor,
  );
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const length = Array.from(content.trim()).length;
  return (
    <form
      className="review-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy || checking || conflict) return;
        try {
          const input = reviewInput({ content, is_recommended: recommended, tags });
          setError('');
          await onSave(input, base);
        } catch (cause) {
          if (cause instanceof ApiError && cause.status === 409) {
            dispatch({ type: 'conflict' });
          }
          setError(
            cause instanceof Error ? cause.message : '저장하지 못했습니다. 다시 시도해 주세요.',
          );
        }
      }}
    >
      {conflict && (
        <div role="alert" className="review-error">
          <p>다른 곳에서 리뷰가 변경되었습니다. 작성 중인 내용은 아래에 유지했습니다.</p>
          <Button
            disabled={busy || checking}
            onClick={async () => {
              setChecking(true);
              try {
                dispatch({ type: 'latest', value: await onReload() });
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : '최신 리뷰를 불러오지 못했습니다.',
                );
              } finally {
                setChecking(false);
              }
            }}
          >
            최신 리뷰 확인
          </Button>
          {latest === null && (
            <p>
              리뷰가 삭제되었거나 더 이상 수정할 수 없습니다. 작성 내용을 복사한 뒤 취소해 주세요.
            </p>
          )}
          {latest && (
            <>
              <p>현재 저장된 내용: {latest.content || '없음'}</p>
              <p>
                평가:{' '}
                {latest.is_recommended === null
                  ? '평가 없음'
                  : latest.is_recommended
                    ? '추천'
                    : '비추천'}{' '}
                · 태그: {latest.tags.join(', ') || '없음'}
              </p>
              <Button
                disabled={busy || checking}
                onClick={() => {
                  dispatch({ type: 'accept-version' });
                  setError('');
                }}
              >
                내 작성 내용 유지하고 수정 계속하기
              </Button>
            </>
          )}
        </div>
      )}
      <h3>{base ? '리뷰 수정' : '리뷰 작성'}</h3>
      <p className="subtle">{name}</p>
      <fieldset disabled={busy}>
        <legend>이 식당을 추천하나요?</legend>
        <div className="review-options">
          <button
            type="button"
            aria-pressed={recommended === true}
            onClick={() => dispatch({ type: 'recommendation', value: true })}
          >
            추천해요
          </button>
          <button
            type="button"
            aria-pressed={recommended === false}
            onClick={() => dispatch({ type: 'recommendation', value: false })}
          >
            비추천해요
          </button>
        </div>
      </fieldset>
      <label htmlFor="review-content">
        리뷰 내용 <span className="subtle">선택</span>
      </label>
      <textarea
        id="review-content"
        rows={5}
        value={content}
        disabled={busy}
        onChange={(event) => dispatch({ type: 'content', value: event.target.value })}
        placeholder="메뉴, 맛, 점심시간에 이용한 경험을 나눠 주세요."
        aria-describedby="review-length"
      />
      <span id="review-length" className="subtle">
        {length.toLocaleString()} / {MAX_REVIEW_LENGTH.toLocaleString()}자
      </span>
      <fieldset disabled={busy}>
        <legend>
          태그{' '}
          <span className="subtle">
            선택 · {tags.length}/{MAX_REVIEW_TAGS}개
          </span>
        </legend>
        <div className="review-tag-groups">
          {REVIEW_TAG_GROUPS.map((group) => (
            <fieldset key={group.value}>
              <legend className="review-tag-group-label">{group.label}</legend>
              <div className="review-options">
                {group.tags.map((tag) => (
                  <button
                    type="button"
                    key={tag.value}
                    aria-pressed={tags.includes(tag.value)}
                    disabled={!tags.includes(tag.value) && tags.length >= MAX_REVIEW_TAGS}
                    onClick={() => dispatch({ type: 'tag', value: tag.value })}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </fieldset>
      {error && (
        <p role="alert" className="review-error">
          {error}
        </p>
      )}
      <div className="review-actions">
        <Button
          type="submit"
          loading={busy || checking}
          disabled={conflict || length > MAX_REVIEW_LENGTH || recommended === null}
        >
          {base ? '수정' : '등록'}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
