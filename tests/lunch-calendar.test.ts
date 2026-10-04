import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthGrid, monthOf, shiftMonth, summarizeMonth } from '../lib/lunch-visits/calendar';
import type { LunchVisit } from '../lib/lunch-visits/model';

test('month grid starts on Sunday and pads both ends to whole weeks', () => {
  // 2026-10-01 is a Thursday; October has 31 days.
  const weeks = buildMonthGrid('2026-10');
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0], [null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(weeks[4], [
    '2026-10-25',
    '2026-10-26',
    '2026-10-27',
    '2026-10-28',
    '2026-10-29',
    '2026-10-30',
    '2026-10-31',
  ]);
  assert.ok(weeks.every((week) => week.length === 7));
  // February 2026 starts on Sunday and fills exactly four weeks; 2028 is a leap year.
  assert.equal(buildMonthGrid('2026-02').length, 4);
  assert.equal(buildMonthGrid('2026-02')[0][0], '2026-02-01');
  assert.ok(buildMonthGrid('2028-02').flat().includes('2028-02-29'));
  assert.ok(!buildMonthGrid('2027-02').flat().includes('2027-02-29'));
  // A month starting on Saturday needs six rows.
  assert.equal(buildMonthGrid('2026-08').length, 6);
});

test('months shift across year boundaries', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-10', 0), '2026-10');
  assert.equal(monthOf('2026-10-04'), '2026-10');
});

const visit = (date: string, id: string, name: string): LunchVisit => ({
  id: date,
  restaurant_id: id,
  restaurant_name: name,
  restaurant_category: null,
  restaurant_active: true,
  visit_date: date,
  created_at: `${date}T03:00:00.000Z`,
  updated_at: null,
});

test('summary counts visits and names the most visited place only when repeated', () => {
  assert.deepEqual(summarizeMonth([]), { count: 0, favorite: null });
  assert.deepEqual(summarizeMonth([visit('2026-10-01', 'a', 'A'), visit('2026-10-02', 'b', 'B')]), {
    count: 2,
    favorite: null,
  });
  assert.deepEqual(
    summarizeMonth([
      visit('2026-10-01', 'a', 'A'),
      visit('2026-10-02', 'b', 'B'),
      visit('2026-10-05', 'a', 'A'),
      visit('2026-10-06', 'b', 'B'),
      visit('2026-10-07', 'c', 'C'),
    ]),
    // A and B tie at two visits; B was visited more recently.
    { count: 5, favorite: { name: 'B', count: 2 } },
  );
});
