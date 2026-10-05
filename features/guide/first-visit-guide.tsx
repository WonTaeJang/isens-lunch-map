'use client';

import { useState } from 'react';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import useLocalUser from '@/features/local-user/use-local-user';
import { GUIDE_STEPS } from './guide-steps';
import { markGuideSeen, useGuideSeen } from './guide-seen-store';
import styles from './guide.module.css';

/** Shows the usage guide once per browser on the first visit. */
export default function FirstVisitGuide() {
  const seen = useGuideSeen();
  if (seen) return null;
  return <GuideDialog onClose={markGuideSeen} />;
}

type Direction = 'next' | 'previous';

function GuideDialog({ onClose }: { onClose: () => void }) {
  const { identity } = useLocalUser();
  // Direction picks which side the next step slides in from.
  const [{ step, direction }, setPosition] = useState<{ step: number; direction: Direction }>({
    step: 0,
    direction: 'next',
  });
  const go = (next: number) =>
    setPosition({ step: next, direction: next > step ? 'next' : 'previous' });
  const current = GUIDE_STEPS[step];
  const last = step === GUIDE_STEPS.length - 1;
  return (
    <Modal
      labelledBy="guide-title"
      width={420}
      className={styles.dialog}
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" onClick={() => (step === 0 ? onClose() : go(step - 1))}>
            {step === 0 ? '건너뛰기' : '이전'}
          </Button>
          <Button onClick={() => (last ? onClose() : go(step + 1))}>
            {last ? '시작하기' : '다음'}
          </Button>
        </>
      }
    >
      <div
        className={styles.dots}
        role="img"
        aria-label={`${GUIDE_STEPS.length}단계 중 ${step + 1}단계`}
      >
        {GUIDE_STEPS.map((item, index) => (
          <span key={item.title} data-current={index === step || undefined} />
        ))}
      </div>
      <div className={styles.viewport}>
        {/* A new key per step remounts the slide so its entry animation plays again. */}
        <div key={step} className={styles.slide} data-direction={direction}>
          <h2 id="guide-title">{current.title}</h2>
          <div className={`${styles.body} ${styles['dialog-body']}`}>
            {current.body(identity?.user_name ?? null)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
