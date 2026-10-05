'use client';

import { useState } from 'react';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
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
  const [userId, setUserId] = useState(identity.user_id);
  const [userName, setUserName] = useState(identity.user_name);
  const [error, setError] = useState('');
  return (
    <Modal
      title="사용자 정보 수정"
      className={styles['identity-editor']}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" form="identity-editor-form">
            저장
          </Button>
        </>
      }
    >
      <p className="description">
        이 브라우저의 사용자 정보를 바꿔요. ID를 바꾸면 내 리뷰 조회·관리 대상도 바뀌어요. 기존
        리뷰의 작성자 정보는 바뀌지 않아요.
      </p>
      <form
        id="identity-editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            updateLocalUser(window.localStorage, { user_id: userId, user_name: userName });
            onClose();
            void localUserStore.initialize(true);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : '사용자 정보를 저장하지 못했어요.');
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
      </form>
    </Modal>
  );
}
