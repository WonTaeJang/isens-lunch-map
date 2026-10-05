'use client';

import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { showSnackbar } from '@/components/ui/snackbar';
import { identityFromHash } from '@/features/local-user/identity-link';
import { withEuro } from '@/lib/korean';
import { localUserStore, type LocalIdentity } from '@/features/local-user/local-user-store';
import { updateLocalUser } from '@/features/local-user/update-local-user';
import { clearLocationHash, useLocationHash } from './location-hash';

/** Receiving side of "다른 기기에서 이어 쓰기": confirms before replacing this browser's user. */
export default function IdentityImport({
  identity,
  ready,
}: {
  identity: LocalIdentity | null;
  ready: boolean;
}) {
  const hash = useLocationHash();
  const [error, setError] = useState('');
  const incoming = identityFromHash(hash);
  const same =
    !!incoming &&
    incoming.user_id === identity?.user_id &&
    incoming.user_name === identity?.user_name;

  useEffect(() => {
    if (!ready) return;
    const link = identityFromHash(hash);
    if (link === null) {
      showSnackbar('이어 쓰기 링크가 올바르지 않아요. 링크를 다시 확인해 주세요.', {
        tone: 'error',
      });
      clearLocationHash();
    } else if (same) {
      showSnackbar('이미 이 기기에서 같은 사용자로 쓰고 있어요.');
      clearLocationHash();
    }
  }, [ready, hash, same]);

  if (!ready || !incoming || same) return null;
  const replaced = identity && identity.user_id !== incoming.user_id ? identity.user_name : null;
  return (
    <ConfirmDialog
      title="이 기기에서 이어 쓸까요?"
      description={
        replaced
          ? `${withEuro(incoming.user_name)} 이어 써요.\n지금 이 기기의 사용자(${replaced})로 쓴 리뷰는 더 이상 관리할 수 없어요.`
          : `${withEuro(incoming.user_name)} 이어 써요.`
      }
      confirmLabel="이어 쓰기"
      error={error}
      onCancel={() => {
        setError('');
        clearLocationHash();
      }}
      onConfirm={() => {
        try {
          updateLocalUser(window.localStorage, incoming);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : '사용자 정보를 저장하지 못했어요.');
          return;
        }
        setError('');
        clearLocationHash();
        void localUserStore.initialize(true);
        showSnackbar(`${withEuro(incoming.user_name)} 이어 쓰기를 시작했어요.`);
      }}
    />
  );
}
