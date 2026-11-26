import { generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { cloudflareKeyResolver, verifyAccessToken, type AccessConfig } from '../src/http/access';
import { createApp } from '../src/http/app';

const config: Extract<AccessConfig, { mode: 'cloudflare' }> = {
  mode: 'cloudflare',
  teamDomain: 'bqtech.cloudflareaccess.com',
  audience: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  allowedEmails: [],
};
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const resolver = async (kid: string): Promise<KeyObject | undefined> =>
  kid === 'key-1' ? publicKey : undefined;
const now = 1_800_000_000;

function token(
  claims: Record<string, unknown> = {},
  options: { kid?: string; key?: KeyObject; alg?: string } = {},
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: options.alg ?? 'RS256', kid: options.kid ?? 'key-1' }),
  ).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      aud: [config.audience],
      iss: `https://${config.teamDomain}`,
      exp: now + 600,
      iat: now,
      email: 'Breno@Example.com',
      ...claims,
    }),
  ).toString('base64url');
  const signature = sign(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    options.key ?? privateKey,
  ).toString('base64url');
  return `${header}.${payload}.${signature}`;
}

describe('Cloudflare Access verification', () => {
  it('accepts a valid token and normalizes the email', async () => {
    await expect(verifyAccessToken(token(), config, resolver, now)).resolves.toEqual({
      email: 'breno@example.com',
    });
  });

  it.each([
    ['wrong audience', token({ aud: ['other'] })],
    ['wrong issuer', token({ iss: 'https://evil.cloudflareaccess.com' })],
    ['expired', token({ exp: now - 120 })],
    ['not yet valid', token({ nbf: now + 600 })],
    ['other signing key', token({}, { key: other.privateKey })],
    ['unknown key id', token({}, { kid: 'key-2' })],
    ['non RS256 algorithm', token({}, { alg: 'HS256' })],
    ['malformed', 'abc.def'],
  ])('rejects a token with %s', async (_name, value) => {
    await expect(verifyAccessToken(value, config, resolver, now)).rejects.toThrow();
  });

  it('enforces the optional email allowlist', async () => {
    const restricted = { ...config, allowedEmails: ['breno@example.com'] };
    await expect(verifyAccessToken(token(), restricted, resolver, now)).resolves.toBeDefined();
    await expect(
      verifyAccessToken(token({ email: 'other@example.com' }), restricted, resolver, now),
    ).rejects.toThrow();
  });
});

describe('Cloudflare Access key resolver', () => {
  it('fetches the team certificates, caches them and refreshes on an unknown key id', async () => {
    const urls: string[] = [];
    let clock = 0;
    const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1' };
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200 });
    }) as unknown as typeof fetch;
    const resolve = cloudflareKeyResolver(config.teamDomain, fetchImpl, () => clock);
    clock = 1_000_000;
    expect(await resolve('key-1')).toBeDefined();
    expect(await resolve('key-1')).toBeDefined();
    expect(urls).toEqual(['https://bqtech.cloudflareaccess.com/cdn-cgi/access/certs']);
    expect(await resolve('key-2')).toBeUndefined();
    expect(urls).toHaveLength(1);
    clock += 60_000;
    expect(await resolve('key-2')).toBeUndefined();
    expect(urls).toHaveLength(2);
  });

  it('denies when the certificates cannot be fetched', async () => {
    const failing = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    const resolve = cloudflareKeyResolver(config.teamDomain, failing, () => 1_000_000);
    expect(await resolve('key-1')).toBeUndefined();
  });
});

describe('Access middleware on the API', () => {
  const pool = new Pool({
    connectionString: 'postgres://garage_test_user@127.0.0.1:1/garage_test_db',
    connectionTimeoutMillis: 200,
  });
  const app = createApp({
    pool,
    expectedUser: 'garage_test_user',
    expectedDatabase: 'garage_test_db',
    access: { ...config, teamDomain: config.teamDomain },
    accessKeyResolver: resolver,
  });

  it('keeps health public and protects every data route', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    const anonymous = await request(app).get('/api/garage');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.code).toBe('UNAUTHENTICATED');
    const write = await request(app).post('/api/garage/setup').set('Idempotency-Key', 'k').send({});
    expect(write.status).toBe(401);
    const forged = await request(app)
      .get('/api/garage')
      .set('Cf-Access-Jwt-Assertion', token({}, { key: other.privateKey }));
    expect(forged.status).toBe(403);
  });

  it('lets a request with a valid Access token reach the handler', async () => {
    const realNow = Math.floor(Date.now() / 1000);
    const valid = token({ exp: realNow + 600, iat: realNow });
    const viaHeader = await request(app).get('/api/garage').set('Cf-Access-Jwt-Assertion', valid);
    expect(viaHeader.status).toBe(503);
    const viaCookie = await request(app)
      .get('/api/garage')
      .set('Cookie', `other=1; CF_Authorization=${valid}`);
    expect(viaCookie.status).toBe(503);
    await pool.end();
  });
});
