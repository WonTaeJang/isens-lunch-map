import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSnackbarStore, SNACKBAR_DURATION } from '../components/ui/snackbar-store';

function fakeTimers() {
  let now = 0;
  const pending = new Map<number, { at: number; run: () => void }>();
  let next = 0;
  return {
    timers: {
      set: (run: () => void, ms: number) => {
        pending.set(++next, { at: now + ms, run });
        return next;
      },
      clear: (handle: unknown) => {
        pending.delete(handle as number);
      },
    },
    advance(ms: number) {
      now += ms;
      for (const [id, timer] of [...pending]) {
        if (timer.at <= now) {
          pending.delete(id);
          timer.run();
        }
      }
    },
    pendingCount: () => pending.size,
  };
}

test('a snackbar hides itself after the default duration and notifies subscribers', () => {
  const clock = fakeTimers();
  const store = createSnackbarStore(clock.timers);
  let notified = 0;
  store.subscribe(() => notified++);
  store.show('오늘의 점심으로 기록했어요.');
  assert.deepEqual(store.getSnapshot(), {
    id: 1,
    message: '오늘의 점심으로 기록했어요.',
    tone: 'default',
  });
  clock.advance(SNACKBAR_DURATION - 1);
  assert.ok(store.getSnapshot());
  clock.advance(1);
  assert.equal(store.getSnapshot(), null);
  assert.equal(notified, 2);
  assert.equal(store.getServerSnapshot(), null);
});

test('a new message replaces the current one and restarts the timer', () => {
  const clock = fakeTimers();
  const store = createSnackbarStore(clock.timers);
  store.show('first');
  clock.advance(2000);
  store.show('second', { tone: 'error' });
  assert.equal(clock.pendingCount(), 1); // The old timer was cleared.
  clock.advance(2000);
  assert.equal(store.getSnapshot()?.message, 'second'); // Not closed by the first timer.
  assert.equal(store.getSnapshot()?.tone, 'error');
  clock.advance(1000);
  assert.equal(store.getSnapshot(), null);
});

test('closing ignores stale ids and custom durations are honored', () => {
  const clock = fakeTimers();
  const store = createSnackbarStore(clock.timers);
  const first = store.show('first');
  const second = store.show('second', { duration: 500 });
  store.hide(first);
  assert.equal(store.getSnapshot()?.id, second);
  clock.advance(500);
  assert.equal(store.getSnapshot(), null);
  store.show('third');
  store.hide();
  assert.equal(store.getSnapshot(), null);
  assert.equal(clock.pendingCount(), 0);
});

test('an action is kept on the snack only when given', () => {
  const clock = fakeTimers();
  const store = createSnackbarStore(clock.timers);
  store.show('plain');
  assert.equal('action' in store.getSnapshot()!, false);
  let undone = 0;
  store.show('숨겼어요.', {
    duration: 5000,
    action: { label: '되돌리기', onClick: () => undone++ },
  });
  const snack = store.getSnapshot()!;
  assert.equal(snack.action?.label, '되돌리기');
  snack.action!.onClick();
  assert.equal(undone, 1);
  clock.advance(4999);
  assert.notEqual(store.getSnapshot(), null);
  clock.advance(1);
  assert.equal(store.getSnapshot(), null);
});
