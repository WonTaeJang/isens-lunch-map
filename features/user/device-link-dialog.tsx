'use client';

import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import QrCode from '@/components/ui/qr-code';
import { showSnackbar } from '@/components/ui/snackbar';
import { identityLink } from '@/features/local-user/identity-link';
import type { LocalIdentity } from '@/features/local-user/local-user-store';
import styles from './user.module.css';

/** Sending side of "다른 기기에서 이어 쓰기": a QR code and a copyable link. */
export default function DeviceLinkDialog({
  identity,
  onClose,
}: {
  identity: LocalIdentity;
  onClose: () => void;
}) {
  const link = identityLink(window.location.origin, identity);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      showSnackbar('링크를 복사했어요. 다른 브라우저에서 열어 주세요.');
    } catch {
      showSnackbar('링크를 복사하지 못했어요. QR 코드를 이용해 주세요.', { tone: 'error' });
    }
  }
  return (
    <Modal
      title="다른 기기에서 이어 쓰기"
      width={360}
      className={styles['device-dialog']}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            닫기
          </Button>
          <Button onClick={() => void copy()}>링크 복사</Button>
        </>
      }
    >
      <p className="description">
        휴대폰 카메라로 QR을 찍거나, 링크를 다른 브라우저에서 열어 주세요.
      </p>
      <div className={styles['device-qr']}>
        <QrCode value={link} label="다른 기기에서 이어 쓰기 QR 코드" />
      </div>
      <p className={styles['device-warning']}>
        이 링크로 내 리뷰를 수정·삭제할 수 있어요. 다른 사람에게 보내지 마세요.
      </p>
    </Modal>
  );
}
