import { resolve } from 'node:path';
import { loadConfig } from './config/env';
import { loadMigrations, runMigrations } from './persistence/migrate';
import { createPool } from './persistence/pool';

const pool = createPool(loadConfig());
try {
  const directory = resolve(process.cwd(), 'server/migrations');
  const applied = await runMigrations(pool, await loadMigrations(directory));
  process.stdout.write(`Garage migrations applied: ${applied.length}\n`);
} catch {
  process.stderr.write('Garage migrations failed; inspect schema and migration history.\n');
  process.exitCode = 1;
} finally {
  await pool.end();
}
