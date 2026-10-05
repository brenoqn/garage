import type { PoolConfig } from 'pg';

export interface ServerConfig {
  readonly database: PoolConfig;
  readonly port: number;
  readonly expectedUser: string;
  readonly expectedDatabase: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value?.trim()) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function port(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid configuration: ${name}`);
  }
  return parsed;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  let database: PoolConfig;
  let expectedUser: string;
  let expectedDatabase: string;
  if (env['DATABASE_URL']) {
    let url: URL;
    try {
      url = new URL(env['DATABASE_URL']);
    } catch {
      throw new Error('Invalid DATABASE_URL');
    }
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      throw new Error('DATABASE_URL must use PostgreSQL');
    }
    try {
      expectedUser = decodeURIComponent(url.username);
      expectedDatabase = decodeURIComponent(url.pathname.slice(1));
    } catch {
      throw new Error('Invalid DATABASE_URL encoding');
    }
    if (!expectedUser || !expectedDatabase)
      throw new Error('DATABASE_URL requires user and database');
    if (expectedUser === 'bqtech_admin')
      throw new Error('Administrative database role is forbidden');
    database = { connectionString: url.toString() };
  } else {
    const user = required(env, 'POSTGRES_USER');
    const databaseName = required(env, 'POSTGRES_DB');
    expectedUser = user;
    expectedDatabase = databaseName;
    if (expectedUser === 'bqtech_admin')
      throw new Error('Administrative database role is forbidden');
    database = {
      host: required(env, 'POSTGRES_HOST'),
      port: port(required(env, 'POSTGRES_PORT'), 'POSTGRES_PORT'),
      database: databaseName,
      user,
      password: required(env, 'POSTGRES_PASSWORD'),
    };
  }
  return {
    port: port(env['PORT'] ?? '3001', 'PORT'),
    expectedUser,
    expectedDatabase,
    database: {
      ...database,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 10000,
      query_timeout: 12000,
      application_name: 'garage-api',
    },
  };
}
