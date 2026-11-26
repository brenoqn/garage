import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import request from 'supertest';
import { loadConfig, loadDatabaseConfig } from '../src/config/env';
import { createApp } from '../src/http/app';

describe('Garage API configuration', () => {
  it('reads PostgreSQL settings from environment without exposing the password', () => {
    const config = loadConfig({
      POSTGRES_HOST: 'internal-postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'garage_test_user',
      POSTGRES_DB: 'garage_test_db',
      POSTGRES_PASSWORD: 'never-print-this',
      CF_ACCESS_TEAM_DOMAIN: 'bqtech.cloudflareaccess.com',
      CF_ACCESS_AUD: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      CF_ACCESS_ALLOWED_EMAILS: ' Breno@Example.com , ',
    });
    expect(config.access).toEqual({
      mode: 'cloudflare',
      teamDomain: 'bqtech.cloudflareaccess.com',
      audience: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
      allowedEmails: ['breno@example.com'],
    });
    expect(config.expectedUser).toBe('garage_test_user');
    expect(config.database.host).toBe('internal-postgres');
    expect(config.database.max).toBe(5);
    expect(config.database.connectionTimeoutMillis).toBe(5000);
    expect(() =>
      loadConfig({
        POSTGRES_HOST: 'internal-postgres',
        POSTGRES_PORT: 'invalid',
        POSTGRES_USER: 'garage_test_user',
        POSTGRES_DB: 'garage_test_db',
        POSTGRES_PASSWORD: 'never-print-this',
        GARAGE_ACCESS_DISABLED: 'local-only',
        HOST: '127.0.0.1',
      }),
    ).toThrow('Invalid configuration: POSTGRES_PORT');
  });

  it('refuses to start without an access barrier outside loopback', () => {
    const database = {
      POSTGRES_HOST: 'internal-postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'garage_test_user',
      POSTGRES_DB: 'garage_test_db',
      POSTGRES_PASSWORD: 'never-print-this',
    };
    expect(() => loadConfig(database)).toThrow('CF_ACCESS_TEAM_DOMAIN');
    expect(() => loadConfig({ ...database, GARAGE_ACCESS_DISABLED: 'local-only' })).toThrow(
      'loopback',
    );
    expect(() =>
      loadConfig({ ...database, CF_ACCESS_TEAM_DOMAIN: 'evil.example.com', CF_ACCESS_AUD: 'x' }),
    ).toThrow('CF_ACCESS_TEAM_DOMAIN');
    expect(
      loadConfig({ ...database, GARAGE_ACCESS_DISABLED: 'local-only', HOST: '127.0.0.1' }).access,
    ).toEqual({ mode: 'disabled-local' });
    expect(loadDatabaseConfig(database).expectedDatabase).toBe('garage_test_db');
  });

  it('refuses the global administrative role', () => {
    expect(() =>
      loadConfig({
        POSTGRES_HOST: 'internal-postgres',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'bqtech_admin',
        POSTGRES_DB: 'garage_test_db',
        POSTGRES_PASSWORD: 'never-print-this',
      }),
    ).toThrow('Administrative database role is forbidden');
  });

  it('returns a safe validation error for malformed JSON without contacting PostgreSQL', async () => {
    const pool = new Pool({
      connectionString: 'postgres://garage_test_user@127.0.0.1:1/garage_test_db',
      connectionTimeoutMillis: 200,
    });
    const app = createApp({
      pool,
      expectedUser: 'garage_test_user',
      expectedDatabase: 'garage_test_db',
      access: { mode: 'disabled-local' },
    });
    const response = await request(app)
      .post('/api/garage/setup')
      .set('Idempotency-Key', 'malformed-json')
      .set('Content-Type', 'application/json')
      .send('{invalid');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ code: 'VALIDATION', message: 'Invalid request body' });
    await pool.end();
  });
});
