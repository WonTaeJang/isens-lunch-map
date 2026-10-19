'use client';

import { menuLine } from '@/lib/restaurant-labels';
import { useId, useMemo, useState } from 'react';
import ModalDialog from '@/components/ui/modal-dialog';
import Button from '@/components/ui/button';
import CountBadge from '@/components/ui/count-badge';
import { GiftBoxIcon, MapIcon, CloseIcon } from '@/components/ui/icons';
import DistanceBadge from '@/features/lunch-map/distance-badge';
import ReviewCountBadges from '@/features/reviews/review-counts';
import { hasCoordinates } from '@/lib/coordinates';
import { countBoxColors, type BoxColor, type BoxHistoryEntry } from './model';
import styles from './box-history.module.css';

const colorNames: Record<BoxColor, string> = {
  blue: '블루',
  purple: '퍼플',
  gold: '골드',
  rainbow: '무지개',
};

function HistorySummary({ counts }: { counts: Record<BoxColor, number> }) {
  return (
    <span className={styles.summary}>
      {(Object.keys(colorNames) as BoxColor[]).map((color) => (
        <span
          key={color}
          className={styles.summaryItem}
          data-color={color}
          role="img"
          aria-label={`${colorNames[color]} ${counts[color]}회`}
          title={colorNames[color]}
        >
          <span className={styles.dot} aria-hidden="true" />
          {counts[color]}
        </span>
      ))}
    </span>
  );
}

type Props = {
  entries: BoxHistoryEntry[];
  onSelect: (id: string) => void;
};

export default function BoxHistory({ entries, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => countBoxColors(entries), [entries]);
  return (
    <>
      <button
        type="button"
        className={styles.history}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span>
          상자 뽑기 기록 <CountBadge>{entries.length}</CountBadge>
        </span>
        <HistorySummary counts={counts} />
      </button>
      {open && (
        <HistoryDialog
          counts={counts}
          entries={entries}
          onSelect={onSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function HistoryDialog({
  entries,
  counts,
  onSelect,
  onClose,
}: Props & { counts: Record<BoxColor, number>; onClose: () => void }) {
  const titleId = useId();
  return (
    <ModalDialog className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      <div className={styles.heading}>
        <h2 id={titleId}>
          상자 뽑기 기록 <CountBadge>{entries.length}</CountBadge>
        </h2>
        <Button
          variant="secondary"
          className={styles.iconButton}
          aria-label="뽑기 기록 닫기"
          onClick={onClose}
        >
          <CloseIcon size={20} />
        </Button>
      </div>
      <HistorySummary counts={counts} />
      {entries.length ? (
        <>
          <p className={styles.description}>최근 뽑은 순 · 새로고침하면 초기화돼요</p>
          <ol className={styles.list} aria-label="뽑기 기록">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div className={styles.cardHeading}>
                  <div className={styles.box} data-color={entry.color}>
                    <GiftBoxIcon size={22} />
                    <span>
                      {colorNames[entry.color]} · {entry.position} 상자
                    </span>
                  </div>
                  {hasCoordinates(entry.restaurant) && (
                    <Button
                      variant="secondary"
                      className={styles.iconButton}
                      aria-label={`${entry.restaurant.name} 지도에서 보기`}
                      title="지도에서 보기"
                      onClick={() => onSelect(entry.restaurant.id)}
                    >
                      <MapIcon size={18} />
                    </Button>
                  )}
                </div>
                <h3>{entry.restaurant.name}</h3>
                <div className={styles.metadata}>
                  <p className={styles.menu}>{menuLine(entry.restaurant)}</p>
                  <div className={styles.stats}>
                    <DistanceBadge distance={entry.restaurant.distance} />
                    <span className={styles.votes}>
                      <ReviewCountBadges colored counts={entry.counts} />
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className={styles.empty}>상자를 열면 식당과 상자 기록이 여기에 쌓여요.</p>
      )}
    </ModalDialog>
  );
}
