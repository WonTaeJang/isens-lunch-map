'use client';

import { useId, type CSSProperties } from 'react';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { tierById, type PromotedTierId, type TierId } from '@/lib/grades/model';
import TierIcon, { tierColorVars } from './tier-icon';
import styles from './promotion.module.css';

/** A cheer for each tier one can be promoted to. */
const TIER_CHEERS: Record<PromotedTierId, string> = {
  bronze: '점심 탐방의 첫걸음을 뗐어요. 오늘 남긴 한 끼가 누군가의 내일 점심이 돼요.',
  silver: '꾸준함이 빛나기 시작했어요. 이제 동료들이 당신의 리뷰를 찾아 읽을 거예요.',
  gold: '황금 같은 점심시간을 허투루 쓰지 않았네요. 그 한 끼 한 끼가 모여 골드가 됐어요.',
  platinum: '회사 근처 골목골목을 꿰고 있네요. 메뉴 고민은 이제 당신에게 물어볼게요.',
  diamond: '반짝이는 점심 내공! 웬만한 맛집은 이미 다 다녀오셨죠?',
  master: '수많은 점심이 쌓여 마스터가 됐어요. 이제 당신의 추천이 곧 오늘의 메뉴예요.',
  grandmaster: '전설까지 한 걸음 남았어요. 점심시간이면 모두가 당신의 선택을 기다려요.',
  challenger: '최고의 자리에 올랐어요! 이 동네 점심 지도는 당신이 그렸어요.',
};

// Sparks burst from the crest, one per direction.
const SPARKS = Array.from({ length: 10 }, (_, index) => index * 36);

/** Celebrates reaching a higher tier, with that tier's own cheer. */
export default function PromotionDialog({
  from,
  to,
  onClose,
  onShowTiers,
}: {
  from: TierId;
  to: PromotedTierId;
  onClose: () => void;
  /** Opens the tier table (after this dialog closes). */
  onShowTiers: () => void;
}) {
  const headingId = useId();
  const { name } = tierById(to);
  return (
    <Modal
      labelledBy={headingId}
      width={340}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={onShowTiers}>
            등급표 보기
          </Button>
          <Button onClick={onClose}>확인</Button>
        </>
      }
    >
      <div className={styles.promotion} style={tierColorVars(to)}>
        <div className={styles.crest}>
          {SPARKS.map((angle) => (
            <span
              key={angle}
              className={styles.spark}
              style={{ '--angle': `${angle}deg` } as CSSProperties}
            />
          ))}
          <TierIcon tier={to} size={104} />
        </div>
        <p className={styles.step}>
          {tierById(from).name} → {name}
        </p>
        <h2 id={headingId} className={styles.title}>
          {name} 승급을 축하해요!
        </h2>
        <p className={styles.cheer}>{TIER_CHEERS[to]}</p>
      </div>
    </Modal>
  );
}
