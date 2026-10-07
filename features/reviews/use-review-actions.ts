'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import { reviewTarget, type Review, type reviewInput } from '@/lib/reviews/model';
import { reviewRequest, type ReviewWriteMethod as Method } from './review-api';

type Feed = {
  error: string;
  mutate: (method: Method, body: object, onSuccess?: () => void) => Promise<boolean>;
};

/**
 * Edit/delete state and write flow shared by the restaurant review panel and the user page.
 * `E` is what can be edited: a review, or also 'new' where a first review can be written.
 */
export default function useReviewActions<E extends Review | 'new'>({
  identity,
  feed,
  extraBody,
  savedNotice,
}: {
  identity: LocalIdentity | null;
  feed: Feed;
  /** Extra request fields, e.g. restaurant_id and user_name for creating a review. */
  extraBody?: Record<string, unknown>;
  savedNotice: string;
}) {
  const router = useRouter();
  const [actionError, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<E | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  async function mutate(
    method: Method,
    review: Review | null,
    input?: ReturnType<typeof reviewInput>,
    onSuccess?: () => void,
  ) {
    if (!identity) return;
    setError('');
    setNotice('');
    const saved = await feed.mutate(
      method,
      {
        user_id: identity.user_id,
        ...extraBody,
        ...reviewTarget(review),
        ...input,
      },
      onSuccess,
    );
    if (saved) {
      setEditing(null);
      setDeleting(null);
      setNotice(method === 'DELETE' ? '' : savedNotice);
      router.refresh();
    }
  }

  /** Latest server copy of the review being edited (null if it was deleted elsewhere). */
  async function loadOwnReview(id: string) {
    if (!identity) return null;
    const result = await reviewRequest<{ review: Review | null }>(
      `/api/reviews?${new URLSearchParams({ scope: 'review', review_id: id, user_id: identity.user_id })}`,
    );
    return result.review;
  }

  return {
    error: actionError || feed.error,
    setError,
    notice,
    editing,
    setEditing,
    deleting,
    mutate,
    loadOwnReview,
    startEdit(target: E) {
      setEditing(target);
      setDeleting(null);
    },
    startDelete(review: Review) {
      setError('');
      setDeleting(review);
    },
    cancelDelete() {
      setDeleting(null);
    },
    confirmDelete() {
      if (!deleting) return;
      void mutate('DELETE', deleting).catch((cause) =>
        setError(cause instanceof Error ? cause.message : '삭제하지 못했어요.'),
      );
    },
  };
}
