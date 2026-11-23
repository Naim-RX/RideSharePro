import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';

test('PostgreSQL migrations, development seed, constraints, relationships, and authorization', { timeout: 120000 }, async (t) => {
  const db = new PGlite();
  try {
    const engine = await db.query('select version() as version');
    t.diagnostic(`Engine: ${engine.rows[0].version}`);
    await db.exec(await readFile('scripts/database/bootstrap.sql', 'utf8'));
    const migrations = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
    for (const name of migrations) {
      await t.test(`migration ${name}`, async () => {
        await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'));
      });
    }
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    // Applying the development fixture twice must not create duplicate records.
    await db.exec(await readFile('supabase/seed.sql', 'utf8'));
    const files = (await readdir('supabase/tests/database')).filter((name) => name.endsWith('.sql')).sort();
    for (const file of files) {
      await t.test(file, async () => {
        let results;
        try {
          results = await db.exec(await readFile(`supabase/tests/database/${file}`, 'utf8'));
        } catch (error) {
          throw new Error(`${file}: ${error.message} [SQLSTATE ${error.code}]`);
        }
        const lines = results.flatMap((result) => result.rows.flatMap((row) => Object.values(row))).filter((value) => typeof value === 'string' && /^(ok|1\.\.|TAP)/.test(value));
        const assertions = lines.filter((value) => value.startsWith('ok - '));
        assert.ok(assertions.length > 0, 'SQL test file did not execute assertions');
        const plan = lines.find((value) => value.startsWith('1..'));
        assert.equal(Number(plan?.slice(3)), assertions.length, 'TAP plan does not match assertion count');
        for (const line of assertions) t.diagnostic(line);
      });
    }
  } finally {
    await db.close();
  }
});
