import { resolve } from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import request from 'supertest';
import { NX200_PROCEDURES } from '../../src/app/data/nx200/procedures/nx200-procedures.data';
import { NX200_PRE_RIDE_CHECKLIST } from '../../src/app/data/nx200/safety/nx200-pre-ride-checklist.data';
import { createApp } from '../src/http/app';
import { loadMigrations, runMigrations } from '../src/persistence/migrate';

const dsn = process.env['GARAGE_TEST_DATABASE_URL'];
const isolated = process.env['GARAGE_TEST_DB_ISOLATED'] === '1';
const safe =
  dsn &&
  isolated &&
  (() => {
    const url = new URL(dsn);
    return (
      url.hostname === '127.0.0.1' &&
      url.pathname === '/garage_test_db' &&
      url.username === 'garage_test_user'
    );
  })();

describe.skipIf(!safe).sequential('Garage PostgreSQL isolation', () => {
  const pool = new Pool({ connectionString: dsn, max: 5 });
  const app = createApp({
    pool,
    expectedUser: 'garage_test_user',
    expectedDatabase: 'garage_test_db',
  });
  const migrations = loadMigrations(resolve(process.cwd(), 'server/migrations'));
  let currentRevision = '0';
  const post = (path: string, payload: unknown, key: string, expectedRevision = currentRevision) =>
    request(app).post(path).set('Idempotency-Key', key).send({ expectedRevision, payload });

  beforeAll(async () => {
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
  });
  afterAll(async () => {
    await pool.end();
  });

  it('starts empty; first run, second run, checksum mismatch and concurrent runner are safe', async () => {
    const before = await pool.query(
      "SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public'",
    );
    expect(before.rows[0].total).toBe(0);
    const files = await migrations;
    expect(await runMigrations(pool, files)).toEqual(['001_initial.sql']);
    expect(await runMigrations(pool, files)).toEqual([]);
    await expect(runMigrations(pool, [{ ...files[0]!, checksum: '0'.repeat(64) }])).rejects.toThrow(
      'mismatch',
    );
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    const concurrent = await Promise.all([runMigrations(pool, files), runMigrations(pool, files)]);
    expect(concurrent.map((result) => result.length).sort()).toEqual([0, 1]);
    const recorded = await pool.query('SELECT count(*)::int AS total FROM schema_migrations');
    expect(recorded.rows[0].total).toBe(1);
    const tables = await pool.query(
      "SELECT count(*)::int AS total FROM information_schema.tables WHERE table_schema='public' AND table_name <> 'schema_migrations'",
    );
    expect(tables.rows[0].total).toBe(13);
    const owners = await pool.query(
      "SELECT DISTINCT pg_get_userbyid(c.relowner) AS owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'",
    );
    expect(owners.rows).toEqual([{ owner: 'garage_test_user' }]);
    const extras = await pool.query(
      "SELECT count(*)::int AS total FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)",
    );
    expect(extras.rows[0].total).toBe(0);
    await pool.query(
      "INSERT INTO garage (id,maintenance_alerts_enabled,theme) VALUES (1,false,'light')",
    );
    const preferencesBeforeMotorcycle = await request(app).get('/api/garage');
    expect(preferencesBeforeMotorcycle.body).toMatchObject({
      status: 'not-configured',
      settings: { maintenanceAlertsEnabled: false, theme: 'light' },
    });
    await pool.query('DELETE FROM garage WHERE id=1');
  });

  it('serves health, readiness and a truly empty snapshot', async () => {
    expect((await request(app).get('/health')).status).toBe(200);
    expect((await request(app).get('/ready')).status).toBe(200);
    const response = await request(app).get('/api/garage');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ revision: '0', status: 'not-configured' });
    expect(response.body.settings).toEqual({ maintenanceAlertsEnabled: true, theme: 'dark' });
    expect(response.body.state).toBeUndefined();
  });

  it('returns sanitized precondition and body-size errors', async () => {
    const missingKey = await request(app)
      .post('/api/garage/setup')
      .send({ expectedRevision: '0', payload: {} });
    expect(missingKey.status).toBe(428);
    expect(missingKey.body).toEqual({ code: 'VALIDATION', message: 'Idempotency-Key is required' });
    const missingRevision = await request(app)
      .post('/api/garage/setup')
      .set('Idempotency-Key', 'missing-revision')
      .send({ payload: {} });
    expect(missingRevision.status).toBe(428);
    expect(missingRevision.body).toEqual({
      code: 'VALIDATION',
      message: 'expectedRevision is required',
    });
    const oversized = await request(app)
      .post('/api/garage/setup')
      .set('Idempotency-Key', 'oversized')
      .send({ expectedRevision: '0', payload: { note: 'x'.repeat(300_000) } });
    expect(oversized.status).toBe(413);
    expect(oversized.body).toEqual({ code: 'VALIDATION', message: 'Request body is too large' });
  });

  it('rejects demo/client-generated fields and applies setup once', async () => {
    const invalid = await post(
      '/api/garage/setup',
      { nickname: 'Minha NX', year: 1997, currentMileage: 100, isDemo: true },
      'setup-invalid',
    );
    expect(invalid.status).toBe(400);
    const payload = { nickname: 'Minha NX', year: 1997, currentMileage: 100 };
    const first = await post('/api/garage/setup', payload, 'setup-1');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ revision: '1', result: { ids: [expect.any(String)] } });
    currentRevision = '1';
    expect((await post('/api/garage/setup', payload, 'setup-1', '0')).body).toEqual(first.body);
    expect(
      (await post('/api/garage/setup', { ...payload, nickname: 'Outra' }, 'setup-1', '0')).status,
    ).toBe(409);
    expect(
      (
        await post(
          '/api/garage/settings',
          { theme: 'light', maintenanceAlertsEnabled: true },
          'stale',
          '0',
        )
      ).status,
    ).toBe(409);
    const snapshot = await request(app).get('/api/garage');
    expect(snapshot.status).toBe(200);
    expect(snapshot.body.status).toBe('configured-empty');
    expect(snapshot.body.state.setup).toEqual({ completed: true, demoData: false });
    expect(snapshot.body.state.serviceHistory).toEqual([]);
    expect(snapshot.body.state.motorcycle.currentMileage).toBe(100);
    expect(
      snapshot.body.state.maintenancePlan.every(
        (item: { lastExecution?: unknown }) => !item.lastExecution,
      ),
    ).toBe(true);
  });

  it('rolls back a service when a later odometer insert fails', async () => {
    await pool.query(
      "CREATE FUNCTION reject_test_odometer() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture failure'; END $$",
    );
    await pool.query(
      'CREATE TRIGGER reject_test_odometer BEFORE INSERT ON odometer_records FOR EACH ROW EXECUTE FUNCTION reject_test_odometer()',
    );
    const failed = await post(
      '/api/garage/services',
      { title: 'Inspeção', date: '2026-10-04', mileage: 105, parts: [] },
      'service-fail',
    );
    expect(failed.status).toBe(503);
    expect(
      (await pool.query('SELECT count(*)::int AS total FROM service_records')).rows[0].total,
    ).toBe(0);
    expect((await pool.query('SELECT revision FROM garage WHERE id=1')).rows[0].revision).toBe('1');
    await pool.query('DROP TRIGGER reject_test_odometer ON odometer_records');
    await pool.query('DROP FUNCTION reject_test_odometer()');
  });

  it('writes service, parts, odometer and latest-plan projection atomically', async () => {
    const service = await post(
      '/api/garage/services',
      {
        title: 'Troca do óleo',
        date: '2026-10-04',
        mileage: 120,
        maintenancePlanId: 'engine-oil',
        parts: [{ name: 'Óleo', quantity: 1 }],
      },
      'service-1',
    );
    expect(service.status).toBe(200);
    currentRevision = service.body.revision;
    const snapshot = (await request(app).get('/api/garage')).body.state;
    expect(snapshot.serviceHistory).toHaveLength(1);
    expect(snapshot.serviceHistory[0].parts).toEqual([{ name: 'Óleo', quantity: 1 }]);
    expect(snapshot.motorcycle.currentMileage).toBe(120);
    expect(
      snapshot.odometerHistory.filter((r: { source: string }) => r.source === 'service'),
    ).toHaveLength(1);
    expect(
      snapshot.maintenancePlan.find((r: { id: string }) => r.id === 'engine-oil').lastExecution
        .serviceRecordId,
    ).toBe(service.body.result.ids[0]);
    expect((await request(app).get('/api/garage')).body.status).toBe('configured-with-history');
    const old = await post(
      '/api/garage/services',
      {
        title: 'Serviço antigo',
        date: '2026-01-01',
        mileage: 90,
        maintenancePlanId: 'engine-oil',
        parts: [],
      },
      'service-old',
    );
    expect(old.status).toBe(200);
    currentRevision = old.body.revision;
    const later = (await request(app).get('/api/garage')).body.state;
    expect(later.motorcycle.currentMileage).toBe(120);
    expect(
      later.maintenancePlan.find((r: { id: string }) => r.id === 'engine-oil').lastExecution
        .serviceRecordId,
    ).toBe(service.body.result.ids[0]);
  });

  it('preserves odometer on historical fuel and enforces explicit regression reason', async () => {
    const fuel = await post(
      '/api/garage/fuel',
      {
        fueledAt: '2026-09-01T10:00:00.000Z',
        mileage: 100,
        liters: 5,
        totalCost: 30,
        fullTank: true,
        confirmedHistoricalMileage: true,
      },
      'fuel-1',
    );
    expect(fuel.status).toBe(200);
    currentRevision = fuel.body.revision;
    expect((await request(app).get('/api/garage')).body.state.motorcycle.currentMileage).toBe(120);
    expect(
      (
        await post(
          '/api/garage/odometer',
          { mileage: 110, source: 'correction', confirmedRegression: true },
          'regress-no-note',
        )
      ).status,
    ).toBe(400);
    const corrected = await post(
      '/api/garage/odometer',
      { mileage: 110, source: 'correction', confirmedRegression: true, note: 'Painel conferido' },
      'regress-ok',
    );
    expect(corrected.status).toBe(200);
    currentRevision = corrected.body.revision;
    expect((await request(app).get('/api/garage')).body.state.motorcycle.currentMileage).toBe(110);
  });

  it('does not let expense or occurrence change mileage; validates checklist and procedure lifecycle', async () => {
    const expense = await post(
      '/api/garage/expenses',
      { date: '2026-10-04', title: 'Estacionamento', category: 'parking', amount: 12 },
      'expense-1',
    );
    expect(expense.status).toBe(200);
    currentRevision = expense.body.revision;
    const occurrence = await post(
      '/api/garage/occurrences',
      {
        occurredAt: '2026-10-04T12:00:00.000Z',
        mileage: 108,
        title: 'Observação',
        severity: 'note',
      },
      'occurrence-1',
    );
    expect(occurrence.status).toBe(200);
    currentRevision = occurrence.body.revision;
    expect((await request(app).get('/api/garage')).body.state.motorcycle.currentMileage).toBe(110);
    expect(
      (
        await post(
          '/api/garage/safety-checks',
          { checkedAt: '2026-10-04T12:00:00.000Z', responses: [] },
          'safety-invalid',
        )
      ).status,
    ).toBe(400);
    const procedure = NX200_PROCEDURES[0]!;
    const start = await post(
      '/api/garage/procedures/start',
      {
        procedureSlug: procedure.slug,
        acknowledgedWarningIds: procedure.safetyWarnings.map((w) => w.id),
      },
      'procedure-start',
    );
    expect(start.status).toBe(200);
    currentRevision = start.body.revision;
    const executionId = start.body.result.ids[0] as string;
    expect(
      (
        await post(
          '/api/garage/procedures/start',
          {
            procedureSlug: procedure.slug,
            acknowledgedWarningIds: procedure.safetyWarnings.map((w) => w.id),
          },
          'procedure-duplicate',
        )
      ).status,
    ).toBe(409);
    expect(
      (await post('/api/garage/procedures/finish', { executionId }, 'procedure-too-soon')).status,
    ).toBe(400);
    const restart = await post(
      '/api/garage/procedures/restart',
      { executionId },
      'procedure-restart',
    );
    expect(restart.status).toBe(200);
    currentRevision = restart.body.revision;
    const executions = (await request(app).get('/api/garage')).body.state.procedureExecutions;
    expect(executions.filter((e: { status: string }) => e.status === 'in-progress')).toHaveLength(
      1,
    );
    expect(executions.filter((e: { status: string }) => e.status === 'cancelled')).toHaveLength(1);
  });

  it('persists a full inspection and links a completed execution to one service', async () => {
    const check = await post(
      '/api/garage/safety-checks',
      {
        checkedAt: '2026-10-04T13:00:00.000Z',
        responses: NX200_PRE_RIDE_CHECKLIST.map((item) => ({ itemId: item.id, status: 'ok' })),
      },
      'safety-complete',
    );
    expect(check.status).toBe(200);
    currentRevision = check.body.revision;
    const procedure = NX200_PROCEDURES[0]!;
    const active = (await request(app).get('/api/garage')).body.state.procedureExecutions.find(
      (entry: { status: string; procedureSlug: string }) =>
        entry.status === 'in-progress' && entry.procedureSlug === procedure.slug,
    );
    const executionId = active.id as string;
    for (const step of procedure.steps.filter((item) => item.required)) {
      const updated = await post(
        '/api/garage/procedures/update',
        { executionId, action: 'complete-step', targetId: step.id },
        `step-${step.id}`,
      );
      expect(updated.status).toBe(200);
      currentRevision = updated.body.revision;
    }
    for (const finalCheck of procedure.finalChecks.filter((item) => item.required)) {
      const updated = await post(
        '/api/garage/procedures/update',
        { executionId, action: 'set-final-check', targetId: finalCheck.id, completed: true },
        `check-${finalCheck.id}`,
      );
      expect(updated.status).toBe(200);
      currentRevision = updated.body.revision;
    }
    const finished = await post(
      '/api/garage/procedures/finish',
      { executionId, note: 'Concluído' },
      'procedure-finish',
    );
    expect(finished.status).toBe(200);
    currentRevision = finished.body.revision;
    const beforeService = (await request(app).get('/api/garage')).body.state;
    expect(
      beforeService.procedureExecutions.find((entry: { id: string }) => entry.id === executionId)
        .status,
    ).toBe('completed');
    expect(beforeService.serviceHistory).toHaveLength(2);
    const service = await post(
      '/api/garage/services',
      {
        title: 'Registro posterior',
        date: '2026-10-04',
        mileage: 110,
        procedureSlug: procedure.slug,
        procedureExecutionId: executionId,
        parts: [],
      },
      'service-linked',
    );
    expect(service.status).toBe(200);
    currentRevision = service.body.revision;
    const afterService = (await request(app).get('/api/garage')).body.state;
    expect(
      afterService.procedureExecutions.find((entry: { id: string }) => entry.id === executionId)
        .resultingServiceRecordId,
    ).toBe(service.body.result.ids[0]);
    expect(
      afterService.serviceHistory.find(
        (entry: { id: string }) => entry.id === service.body.result.ids[0],
      ).procedureExecutionId,
    ).toBe(executionId);
    expect(
      (
        await post(
          '/api/garage/services',
          {
            title: 'Vínculo duplicado',
            date: '2026-10-04',
            mileage: 110,
            procedureSlug: procedure.slug,
            procedureExecutionId: executionId,
            parts: [],
          },
          'service-duplicate-link',
        )
      ).status,
    ).toBe(400);
  });

  it('serializes concurrent writes and enforces SQL FK, UNIQUE and CHECK constraints', async () => {
    const expected = currentRevision;
    const before = Number(expected);
    const [a, b] = await Promise.all([
      post(
        '/api/garage/settings',
        { theme: 'light', maintenanceAlertsEnabled: true },
        'settings-a',
        expected,
      ),
      post(
        '/api/garage/settings',
        { theme: 'system', maintenanceAlertsEnabled: false },
        'settings-b',
        expected,
      ),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    currentRevision = (a.status === 200 ? a : b).body.revision;
    expect(Number(currentRevision)).toBe(before + 1);
    expect((await pool.query('SELECT revision FROM garage WHERE id=1')).rows[0].revision).toBe(
      currentRevision,
    );
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS total FROM write_operations WHERE idempotency_key IN ('settings-a','settings-b')",
        )
      ).rows[0].total,
    ).toBe(1);
    const motorcycleId = (await pool.query('SELECT id FROM motorcycles')).rows[0].id as string;
    await expect(
      pool.query(
        "INSERT INTO motorcycles (id,garage_id,manufacturer,model,nickname,year,current_mileage,created_at,updated_at) VALUES ('other',1,'Honda','NX200','Other',1997,0,now(),now())",
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        'INSERT INTO expense_records (id,motorcycle_id,expense_date,title,category,amount,created_at) VALUES ($1,$2,$3,$4,$5,$6,now())',
        ['invalid-expense', motorcycleId, '2026-10-04', 'Bad', 'other', -1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        'INSERT INTO occurrence_records (id,motorcycle_id,occurred_at,mileage,title,severity,created_at) VALUES ($1,$2,now(),0,$3,$4,now())',
        ['invalid-occurrence', 'missing-moto', 'Bad', 'note'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query("INSERT INTO garage (id,maintenance_alerts_enabled,theme) VALUES (2,true,'dark')"),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        'INSERT INTO service_records (id,motorcycle_id,title,service_date,mileage,maintenance_plan_id,created_at) VALUES ($1,$2,$3,$4,$5,$6,now())',
        ['invalid-plan', motorcycleId, 'Bad', '2026-10-04', 1, 'missing-plan'],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query(
        'INSERT INTO fuel_records (id,motorcycle_id,fueled_at,mileage,liters,total_cost,full_tank,created_at) VALUES ($1,$2,now(),0,$3,$4,true,now())',
        ['invalid-fuel', motorcycleId, -1, 0],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('executes simultaneous requests with one idempotency key only once', async () => {
    const before = Number(currentRevision);
    const payload = {
      date: '2026-10-04',
      title: 'Teste simultâneo',
      category: 'other',
      amount: 0.1,
    };
    const [a, b] = await Promise.all([
      post('/api/garage/expenses', payload, 'same-key-concurrent'),
      post('/api/garage/expenses', payload, 'same-key-concurrent'),
    ]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body).toEqual(b.body);
    expect(Number(a.body.revision)).toBe(before + 1);
    currentRevision = a.body.revision;
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS total FROM expense_records WHERE title='Teste simultâneo'",
        )
      ).rows[0].total,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS total FROM write_operations WHERE idempotency_key='same-key-concurrent'",
        )
      ).rows[0].total,
    ).toBe(1);
    expect((await pool.query('SELECT revision FROM garage WHERE id=1')).rows[0].revision).toBe(
      currentRevision,
    );
    const snapshot = (await request(app).get('/api/garage')).body.state;
    expect(
      snapshot.expenseHistory.find((item: { title: string }) => item.title === 'Teste simultâneo')
        .amount,
    ).toBe(0.1);
  });

  it('replays a receipt after later commits without duplicating a record', async () => {
    const original = await pool.query(
      "SELECT committed_revision, result_ids FROM write_operations WHERE idempotency_key='service-1'",
    );
    const retry = await post(
      '/api/garage/services',
      {
        title: 'Troca do óleo',
        date: '2026-10-04',
        mileage: 120,
        maintenancePlanId: 'engine-oil',
        parts: [{ name: 'Óleo', quantity: 1 }],
      },
      'service-1',
      '1',
    );
    expect(retry.status).toBe(200);
    expect(retry.body).toEqual({
      revision: original.rows[0].committed_revision,
      result: { ids: original.rows[0].result_ids },
    });
    expect(
      (
        await pool.query(
          "SELECT count(*)::int AS total FROM service_records WHERE title='Troca do óleo'",
        )
      ).rows[0].total,
    ).toBe(1);
  });

  it('updates the motorcycle, cancels a procedure, and rejects client timestamps/demo flags', async () => {
    const invalidFuel = await post(
      '/api/garage/fuel',
      {
        fueledAt: '2026-10-04T12:00:00.000Z',
        mileage: 120,
        liters: 1,
        totalCost: 5,
        fullTank: false,
        createdAt: '2020-01-01T00:00:00.000Z',
      },
      'fuel-client-time',
    );
    expect(invalidFuel.status).toBe(400);
    expect(
      (
        await post(
          '/api/garage/services',
          { title: 'Demo', date: '2026-10-04', mileage: 110, parts: [], isDemo: true },
          'service-demo',
        )
      ).status,
    ).toBe(400);
    const changed = await post(
      '/api/garage/motorcycle',
      { nickname: 'Minha NX revisada', year: 1997, mileage: 111, source: 'motorcycle' },
      'motorcycle-change',
    );
    expect(changed.status).toBe(200);
    currentRevision = changed.body.revision;
    const procedure = NX200_PROCEDURES[1]!;
    const started = await post(
      '/api/garage/procedures/start',
      {
        procedureSlug: procedure.slug,
        acknowledgedWarningIds: procedure.safetyWarnings.map((warning) => warning.id),
      },
      'procedure-cancel-start',
    );
    expect(started.status).toBe(200);
    currentRevision = started.body.revision;
    const cancelled = await post(
      '/api/garage/procedures/cancel',
      { executionId: started.body.result.ids[0] },
      'procedure-cancel',
    );
    expect(cancelled.status).toBe(200);
    currentRevision = cancelled.body.revision;
    const state = (await request(app).get('/api/garage')).body.state;
    expect(state.motorcycle).toMatchObject({ nickname: 'Minha NX revisada', currentMileage: 111 });
    expect(
      state.procedureExecutions.find(
        (item: { id: string }) => item.id === started.body.result.ids[0],
      ).status,
    ).toBe('cancelled');
  });

  it('returns a persistence error without a demo fallback if the network is unavailable', async () => {
    const badPool = new Pool({
      connectionString: 'postgres://garage_test_user@127.0.0.1:1/garage_test_db',
      connectionTimeoutMillis: 200,
    });
    const badApp = createApp({
      pool: badPool,
      expectedUser: 'garage_test_user',
      expectedDatabase: 'garage_test_db',
    });
    const response = await request(badApp).get('/api/garage');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      code: 'PERSISTENCE_UNAVAILABLE',
      message: 'Garage is temporarily unavailable',
    });
    await badPool.end();
  });
});
