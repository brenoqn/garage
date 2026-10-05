import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { ServerConfig } from '../config/env';

export function createPool(config: ServerConfig): Pool {
  return new Pool(config.database);
}

export async function inTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO public, pg_catalog');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Keep the original failure; the client is released below.
    }
    throw error;
  } finally {
    client.release();
  }
}
