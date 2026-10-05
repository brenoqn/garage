import { createServer } from 'node:http';
import { loadConfig } from './config/env';
import { createApp } from './http/app';
import { createPool } from './persistence/pool';

const config = loadConfig();
const pool = createPool(config);
const app = createApp({
  pool,
  expectedUser: config.expectedUser,
  expectedDatabase: config.expectedDatabase,
});
const server = createServer(app);

server.listen(config.port, process.env['HOST'] ?? '0.0.0.0', () => {
  process.stdout.write(`Garage API listening on port ${config.port}\n`);
});

let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  const closed = new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  server.closeIdleConnections();
  await closed;
  await pool.end();
}
process.once('SIGINT', () => {
  void shutdown();
});
process.once('SIGTERM', () => {
  void shutdown();
});
