import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { addToBlacklist, listBlacklist, removeFromBlacklist } from '../../lib/server/blacklist';

// Only an explicitly configured test DB is used; production tables are never touched.
const connectionString = process.env.REVIEW_TEST_DATABASE_URL;
test(
  'PostgreSQL: one entry per user and restaurant, active only, cascade on restaurant delete',
  { skip: !connectionString },
  async () => {
    const pool = new Pool({ connectionString, max: 4 });
    const schema = `blacklist_test_${crypto.randomUUID().replaceAll('-', '')}`;
    const db = {
      query: (sql: string, values?: unknown[]) =>
        pool.query(
          sql
            .replaceAll('public.restaurant_blacklist', `"${schema}".restaurant_blacklist`)
            .replaceAll('public.restaurants', `"${schema}".restaurants`),
          values,
        ),
    } as unknown as Pool;
    const [user, other] = [crypto.randomUUID(), crypto.randomUUID()];
    const [first, second, inactive] = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ];
    try {
      await pool.query(`create schema "${schema}"`);
      await db.query(
        'create table public.restaurants (id uuid primary key, name text, category text, active boolean)',
      );
      // Same definition as the production table.
      await db.query(`create table public.restaurant_blacklist (
        user_id       uuid not null,
        restaurant_id uuid not null references public.restaurants(id) on delete cascade,
        created_at    timestamptz not null default now(),
        primary key (user_id, restaurant_id)
      )`);
      await db.query(
        "insert into public.restaurants values ($1,'첫 식당','한식',true),($2,'둘째 식당','중식',true),($3,'닫은 식당','일식',false)",
        [first, second, inactive],
      );

      const added = await addToBlacklist(db, user, first);
      assert.equal(added.restaurant_name, '첫 식당');
      // Repeated and concurrent adds keep a single row.
      await Promise.all([addToBlacklist(db, user, second), addToBlacklist(db, user, second)]);
      await addToBlacklist(db, user, first);
      const list = await listBlacklist(db, user);
      assert.deepEqual(list.map((row) => row.restaurant_id).sort(), [first, second].sort());
      assert.deepEqual(await listBlacklist(db, other), []);

      await assert.rejects(addToBlacklist(db, user, inactive), /숨길 수 없는 식당/);
      await assert.rejects(addToBlacklist(db, user, crypto.randomUUID()), /숨길 수 없는 식당/);

      // A restaurant deactivated after being hidden stays listed (and can be re-added).
      await db.query('update public.restaurants set active=false where id=$1', [second]);
      const stillListed = await listBlacklist(db, user);
      assert.equal(
        stillListed.find((row) => row.restaurant_id === second)?.restaurant_active,
        false,
      );
      assert.equal((await addToBlacklist(db, user, second)).restaurant_id, second);

      assert.equal(await removeFromBlacklist(db, user, first), true);
      assert.equal(await removeFromBlacklist(db, user, first), false);

      await db.query('delete from public.restaurants where id=$1', [second]);
      assert.deepEqual(await listBlacklist(db, user), []);
    } finally {
      await pool.query(`drop schema if exists "${schema}" cascade`);
      await pool.end();
    }
  },
);
