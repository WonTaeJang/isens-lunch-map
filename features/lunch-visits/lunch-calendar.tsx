'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { buildMonthGrid, monthOf, shiftMonth, summarizeMonth } from '@/lib/lunch-visits/calendar';
import { koreanToday, type LunchVisit } from '@/lib/lunch-visits/model';
import { lunchVisitApi } from './lunch-visit-api';
import styles from './lunch-calendar.module.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
type Loaded = { key: string; visits: LunchVisit[] } | { key: string; error: string };

/** Read-only month calendar of the user's "오늘의 점심" records, with a monthly summary. */
export default function LunchCalendar({ userId }: { userId: string }) {
  const today = koreanToday();
  const thisMonth = monthOf(today);
  const [month, setMonth] = useState(thisMonth);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${userId}:${month}:${attempt}`;

  useEffect(() => {
    const controller = new AbortController();
    lunchVisitApi.month(userId, month, controller.signal).then(
      ({ visits }) => setLoaded({ key, visits }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : '';
        setLoaded({ key, error: message || '점심 기록을 불러오지 못했어요.' });
      },
    );
    return () => controller.abort();
  }, [key, userId, month]);

  const current = loaded?.key === key ? loaded : null;
  const visits = current && 'visits' in current ? current.visits : [];
  const byDate = new Map(visits.map((visit) => [visit.visit_date, visit]));
  const summary = summarizeMonth(visits);
  const [year, monthNumber] = month.split('-').map(Number);

  return (
    <section className={styles.calendar} aria-label="점심 기록">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.nav}
          aria-label="이전 달"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <ChevronLeftIcon size={18} />
        </button>
        <h2>
          {year}년 {monthNumber}월
        </h2>
        <button
          type="button"
          className={styles.nav}
          aria-label="다음 달"
          disabled={month >= thisMonth}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      <dl className={styles.summary} aria-live="polite" aria-busy={!current}>
        <div>
          <dt>{month === thisMonth ? '이번 달' : `${monthNumber}월`} 점심</dt>
          <dd>
            {current ? (
              <span>
                <strong>{summary.count}</strong>번
              </span>
            ) : (
              <LoadingSpinner size={16} />
            )}
          </dd>
        </div>
        <div>
          <dt>가장 많이 간 곳</dt>
          <dd>
            {summary.favorite ? (
              <>
                <strong className={styles.favorite}>{summary.favorite.name}</strong>
                <span>{summary.favorite.count}번</span>
              </>
            ) : (
              <span className={styles.none}>—</span>
            )}
          </dd>
        </div>
      </dl>

      {current && 'error' in current && (
        <div className="review-error" role="alert">
          {current.error}{' '}
          <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>
            다시 불러오기
          </Button>
        </div>
      )}

      <table className={styles.grid}>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day} scope="col">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buildMonthGrid(month).map((week) => (
            <tr key={week.find(Boolean)}>
              {week.map((date, index) => {
                if (!date) return <td key={`blank-${index}`} />;
                const visit = byDate.get(date);
                return (
                  <td key={date} aria-current={date === today ? 'date' : undefined}>
                    <span className={styles.day}>{Number(date.slice(8))}</span>
                    {visit && (
                      <div
                        className={styles.visit}
                        data-inactive={visit.restaurant_active ? undefined : true}
                        title={[visit.restaurant_name, visit.restaurant_category]
                          .filter(Boolean)
                          .join(' · ')}
                      >
                        <span className={styles.name}>{visit.restaurant_name}</span>
                        {visit.restaurant_category && (
                          <span className={styles.category}>{visit.restaurant_category}</span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {current && 'visits' in current && !visits.length && (
        <p className={styles.empty}>
          {month === thisMonth
            ? '이번 달 기록이 아직 없어요. 지도에서 오늘의 점심을 골라 보세요.'
            : '이 달에는 기록이 없어요.'}
        </p>
      )}
    </section>
  );
}
