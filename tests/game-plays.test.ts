import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../app/api/game-plays/route';
import { gameName, GamePlayError, playCount } from '../lib/game-plays/model';
import { recordGamePlays } from '../lib/server/game-plays';

const post = (body: unknown, origin?: string) =>
  new Request('http://localhost/api/game-plays', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });

test('only the two games are counted', () => {
  assert.equal(gameName('slot'), 'slot');
  assert.equal(gameName('lunch_box'), 'lunch_box');
  for (const bad of ['', 'box', null, 1]) assert.throws(() => gameName(bad), GamePlayError);
  assert.equal(playCount(3), 3);
  for (const bad of [0, -1, 1.5, 101, '3', null])
    assert.throws(() => playCount(bad), GamePlayError);
});

test('a save adds its plays to today (Korean date) for its game in one upsert', async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  await recordGamePlays(
    { query: async (sql: string, values: unknown[]) => calls.push({ sql, values }) } as never,
    'lunch_box',
    3,
  );
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].values, ['lunch_box', 3]);
  assert.match(calls[0].sql, /Asia\/Seoul/);
  assert.match(
    calls[0].sql,
    /on conflict \(play_date, game\) do update set plays = .*plays \+ excluded\.plays/,
  );
});

test('the route counts valid plays and rejects bad or cross-origin requests before the DB', async () => {
  const globalDb = globalThis as unknown as { lunchDb: unknown };
  const previous = globalDb.lunchDb;
  const games: unknown[] = [];
  globalDb.lunchDb = { query: async (_sql: string, values: unknown[]) => games.push(values) };
  try {
    const ok = await POST(post({ game: 'slot', plays: 2 }));
    assert.equal(ok.status, 204);
    assert.equal(ok.headers.get('Cache-Control'), 'private, no-store');
    assert.equal((await POST(post({ game: 'poker', plays: 1 }))).status, 400);
    assert.equal((await POST(post({ game: 'slot', plays: 500 }))).status, 400);
    assert.equal(
      (await POST(post({ game: 'slot', plays: 1 }, 'https://evil.example'))).status,
      403,
    );
    assert.deepEqual(games, [['slot', 2]]);
  } finally {
    globalDb.lunchDb = previous;
  }
});
