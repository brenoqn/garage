import type { PoolConfig } from 'pg';
import type { AccessConfig } from '../http/access';

export interface DatabaseConfig {
  readonly database: PoolConfig;
  readonly expectedUser: string;
  readonly expectedDatabase: string;
}

export interface ServerConfig extends DatabaseConfig {
  readonly port: number;
  readonly host: string;
  readonly access: AccessConfig;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value?.trim()) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

const LOOPBACK_HOSTS = ['127.0.0.1', '::1', 'localhost'];

/**
 * A API só sobe com Cloudflare Access configurado. A única exceção é o desenvolvimento local
 * explícito (`GARAGE_ACCESS_DISABLED=local-only`), que exige escutar somente em loopback.
 */
function accessConfig(env: NodeJS.ProcessEnv, host: string): AccessConfig {
  const teamDomain = env['CF_ACCESS_TEAM_DOMAIN']?.trim().toLowerCase();
  const audience = env['CF_ACCESS_AUD']?.trim();
  if (teamDomain || audience) {
    if (!teamDomain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain)) {
      throw new Error('Invalid configuration: CF_ACCESS_TEAM_DOMAIN');
    }
    if (!audience || !/^[A-Za-z0-9]{16,128}$/.test(audience)) {
      throw new Error('Invalid configuration: CF_ACCESS_AUD');
    }
    const allowedEmails = (env['CF_ACCESS_ALLOWED_EMAILS'] ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    return { mode: 'cloudflare', teamDomain, audience, allowedEmails };
  }
  if (env['GARAGE_ACCESS_DISABLED'] === 'local-only') {
    if (!LOOPBACK_HOSTS.includes(host)) {
      throw new Error('GARAGE_ACCESS_DISABLED=local-only requires a loopback HOST');
    }
    return { mode: 'disabled-local' };
  }
  throw new Error('Missing required configuration: CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD');
}

function port(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid configuration: ${name}`);
  }
  return parsed;
}

/** Somente o banco: usado pelo runner de migrations, que não atende HTTP. */
export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const database = loadDatabaseConfig(env);
  const host = env['HOST']?.trim() || '0.0.0.0';
  return {
    ...database,
    port: port(env['PORT'] ?? '3001', 'PORT'),
    host,
    access: accessConfig(env, host),
  };
}
