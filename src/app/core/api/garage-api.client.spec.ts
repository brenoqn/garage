import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { compactPayload, GARAGE_FETCH, GarageApiClient } from './garage-api.client';

function client(response: () => Promise<Response>) {
  const fetchMock = vi.fn<(path: string, init?: RequestInit) => Promise<Response>>(() =>
    response(),
  );
  TestBed.configureTestingModule({
    providers: [{ provide: GARAGE_FETCH, useValue: fetchMock }],
  });
  return { api: TestBed.inject(GarageApiClient), fetchMock };
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('GarageApiClient', () => {
  it('sends commands same-origin with revision, idempotency key and compact payload', async () => {
    const { api, fetchMock } = client(() => json({ revision: '4', result: { ids: ['x'] } }));
    const result = await api.command(
      '/api/garage/expenses',
      { title: 'Placa', notes: '', mileage: undefined },
      '3',
    );
    expect(result).toEqual({ ok: true, value: { revision: '4', result: { ids: ['x'] } } });
    const [path, init] = fetchMock.mock.calls[0]!;
    expect(path).toBe('/api/garage/expenses');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.redirect).toBe('manual');
    const headers = init?.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toMatch(/^garage-/);
    expect(JSON.parse(String(init?.body))).toEqual({
      expectedRevision: '3',
      payload: { title: 'Placa' },
    });
  });

  it('maps Access, network, conflict and rejection failures to clear messages', async () => {
    expect((await client(() => json({}, 401)).api.snapshot()).ok).toBe(false);
    TestBed.resetTestingModule();
    const unauth = await client(() => json({ code: 'FORBIDDEN' }, 403)).api.snapshot();
    expect(!unauth.ok && unauth.failure.kind).toBe('unauthenticated');
    TestBed.resetTestingModule();
    const network = await client(() => Promise.reject(new TypeError('offline'))).api.snapshot();
    expect(!network.ok && network.failure.kind).toBe('network');
    TestBed.resetTestingModule();
    const conflict = await client(() =>
      json({ code: 'REVISION_CONFLICT', message: 'changed' }, 409),
    ).api.command('/api/x', {}, '1');
    expect(!conflict.ok && conflict.failure.kind).toBe('conflict');
    TestBed.resetTestingModule();
    const rejected = await client(() =>
      json({ code: 'VALIDATION', message: 'Invalid title' }, 400),
    ).api.command('/api/x', {}, '1');
    expect(!rejected.ok && rejected.failure).toMatchObject({
      kind: 'rejected',
      code: 'VALIDATION',
    });
    expect(!rejected.ok && rejected.failure.message).toContain('Invalid title');
    TestBed.resetTestingModule();
    const html = await client(() => Promise.resolve(new Response('<html></html>'))).api.snapshot();
    expect(!html.ok && html.failure.kind).toBe('unavailable');
  });

  it('removes empty strings and undefined recursively but keeps null and false', () => {
    expect(
      compactPayload({ a: '', b: undefined, c: null, d: false, e: [{ f: ' ', g: 1 }] }),
    ).toEqual({ c: null, d: false, e: [{ g: 1 }] });
  });
});
