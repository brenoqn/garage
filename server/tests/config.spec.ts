import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import request from 'supertest';
import { loadConfig } from '../src/config/env';
import { createApp } from '../src/http/app';

describe('Garage API configuration', () => {
  it('reads PostgreSQL settings from environment without exposing the password', () => {
    const config = loadConfig({
      POSTGRES_HOST: 'internal-postgres',
      POSTGRES_PORT: '5432',
      POSTGRES_USER: 'garage_test_user',
      POSTGRES_DB: 'garage_test_db',
      POSTGRES_PASSWORD: 'never-print-this',
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
      }),
    ).toThrow('Invalid configuration: POSTGRES_PORT');
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
