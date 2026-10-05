'use client';

import { useState } from 'react';
import Button from '@/components/ui/button';
import useModalDialog from '@/components/ui/use-modal-dialog';
import modalStyles from '@/components/ui/modal.module.css';
import { localUserStore, type LocalIdentity } from '@/features/local-user/local-user-store';
import { updateLocalUser } from '@/features/local-user/update-local-user';
import styles from './user.module.css';

export default function IdentityEditor({
  identity,
  onClose,
}: {
  identity: LocalIdentity;
  onClose: () => void;
}) {
  const dialog = useModalDialog();
  const [userId, setUserId] = useState(identity.user_id);
  const [userName, setUserName] = useState(identity.user_name);
  const [error, setError] = useState('');
  return (
    <dialog
      ref={dialog}
      className={`${modalStyles.modal} ${styles['identity-editor']}`}
      aria-labelledby="identity-editor-title"
      onCancel={onClose}
    >
      <h2 id="identity-editor-title">사용자 정보 수정</h2>
      <p className="description">
        이 브라우저의 사용자 정보를 변경합니다. ID를 변경하면 내 리뷰 조회·관리 대상도 바뀝니다.
        기존 리뷰의 작성자 정보는 변경되지 않습니다.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          try {
            updateLocalUser(window.localStorage, { user_id: userId, user_name: userName });
            onClose();
            void localUserStore.initialize(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '사용자 정보를 저장하지 못했습니다.');
          }
        }}
      >
        <label htmlFor="identity-id">user_id</label>
        <input
          id="identity-id"
          className="admin-input"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          required
        />
        <label htmlFor="identity-name">user_name</label>
        <input
          id="identity-name"
          className="admin-input"
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          autoComplete="off"
          required
        />
        {error && (
          <p className="review-error" role="alert">
            {error}
          </p>
        )}
        <div className="review-actions">
          <Button type="submit">저장</Button>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
        </div>
      </form>
    </dialog>
  );
}
