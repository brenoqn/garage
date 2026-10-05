import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool, PoolClient } from 'pg';

const FILE_NAME = /^\d{3}_[a-z0-9_]+\.sql$/;
const LOCK_ID = 720250301;

export interface Migration {
  readonly id: string;
  readonly sql: string;
  readonly checksum: string;
}

export async function loadMigrations(directory: string): Promise<Migration[]> {
  const names = (await readdir(directory)).filter((name) => FILE_NAME.test(name)).sort();
  if (names.length === 0 || new Set(names.map((name) => name.slice(0, 3))).size !== names.length) {
    throw new Error('Migration sequence is empty or has duplicate versions');
  }
  const migrations: Migration[] = [];
  for (const name of names) {
    const sql = await readFile(resolve(directory, name), 'utf8');
    migrations.push({
      id: name,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex'),
    });
  }
  return migrations;
}

async function ensureMetadata(client: PoolClient): Promise<void> {
  const existing = await client.query<{ name: string | null }>(
    "SELECT to_regclass('public.schema_migrations')::text AS name",
  );
  if (!existing.rows[0]?.name) {
    await client.query(
      'CREATE TABLE public.schema_migrations (migration_id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL)',
    );
  }
}

export async function runMigrations(
  pool: Pool,
  migrations: readonly Migration[],
): Promise<string[]> {
  const client = await pool.connect();
  const appliedNow: string[] = [];
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO public, pg_catalog');
    await client.query('SELECT pg_advisory_xact_lock(hashtext(current_database()), $1)', [LOCK_ID]);
    await ensureMetadata(client);
    const recorded = await client.query<{ migration_id: string; checksum: string }>(
      'SELECT migration_id, checksum FROM public.schema_migrations ORDER BY migration_id',
    );
    const known = new Map(migrations.map((migration) => [migration.id, migration]));
    for (const row of recorded.rows) {
      const migration = known.get(row.migration_id);
      if (!migration || migration.checksum !== row.checksum) {
        throw new Error(`Migration history mismatch: ${row.migration_id}`);
      }
    }
    if (recorded.rows.some((row, index) => migrations[index]?.id !== row.migration_id)) {
      throw new Error('Migration history is not a prefix of available migrations');
    }
    const done = new Set(recorded.rows.map((row) => row.migration_id));
    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO public.schema_migrations (migration_id, checksum, applied_at) VALUES ($1, $2, now())',
        [migration.id, migration.checksum],
      );
      appliedNow.push(migration.id);
    }
    await client.query('COMMIT');
    return appliedNow;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    client.release();
  }
}
