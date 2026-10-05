'use client';

import { useState, type ReactNode } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { showSnackbar } from '@/components/ui/snackbar';
import { todayLunchAction } from '@/lib/lunch-visits/model';
import useTodayLunch from './use-today-lunch';

type Restaurant = { id: string; name: string };
type Result = { chosen: boolean };

/**
 * Tapping "오늘의 점심" on a restaurant: records it, cancels it when it is already today's lunch,
 * or asks before replacing another restaurant. Results go to the snackbar.
 * Render `dialog` somewhere outside the clicked element so Escape closes only the dialog.
 */
export default function useTodayLunchAction() {
  const todayLunch = useTodayLunch();
  const [pending, setPending] = useState<{
    from: string;
    to: Restaurant;
    resolve: (result: Result) => void;
  } | null>(null);
  const [error, setError] = useState('');

  async function attempt(action: () => Promise<string>, chosen: boolean): Promise<Result> {
    try {
      showSnackbar(await action());
      return { chosen };
    } catch (cause) {
      showSnackbar(cause instanceof Error ? cause.message : '오늘의 점심을 저장하지 못했어요.', {
        tone: 'error',
      });
      return { chosen: false };
    }
  }

  function request(restaurant: Restaurant): Promise<Result> {
    const current = todayLunch.visit;
    switch (todayLunchAction(current, restaurant.id)) {
      case 'cancel':
        return attempt(async () => {
          await todayLunch.cancel();
          return '오늘의 점심을 취소했어요.';
        }, false);
      case 'choose':
        return attempt(async () => {
          await todayLunch.choose(restaurant.id);
          return '오늘의 점심으로 기록했어요.';
        }, true);
      case 'change':
        return new Promise((resolve) =>
          setPending({ from: current?.restaurant_name ?? '', to: restaurant, resolve }),
        );
    }
  }

  function close(chosen = false) {
    if (chosen) showSnackbar('오늘의 점심을 바꿨어요.');
    pending?.resolve({ chosen });
    setPending(null);
    setError('');
  }

  const dialog: ReactNode = pending && (
    <ConfirmDialog
      title="오늘의 점심을 바꿀까요?"
      description={`‘${pending.from}’ → ‘${pending.to.name}’`}
      confirmLabel="바꾸기"
      busy={todayLunch.busy}
      error={error}
      onConfirm={async () => {
        try {
          await todayLunch.choose(pending.to.id);
          close(true);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : '오늘의 점심을 바꾸지 못했어요.');
        }
      }}
      onCancel={() => close()}
    />
  );

  return { visit: todayLunch.visit, busy: todayLunch.busy, request, dialog };
}
