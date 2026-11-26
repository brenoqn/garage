import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import { GarageState } from '../models/garage-state.model';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { GarageStore } from './garage-store.service';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  failWrites = false;

  get<T>(key: string): T | null {
    const rawValue = this.getRaw(key);
    return rawValue === null ? null : (JSON.parse(rawValue) as T);
  }

  getRaw(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set<T>(key: string, value: T): void {
    this.setRaw(key, JSON.stringify(value));
  }

  setRaw(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error('write failed');
    }
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

describe('GarageStore first use', () => {
  it('starts without invented services, executions or mileage', async () => {
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: new MemoryStorage() }],
    });
    const fresh = TestBed.inject(GarageStore);
    expect(fresh.setup()).toEqual({ completed: false, demoData: false });
    expect(fresh.serviceHistory()).toEqual([]);
    expect(fresh.odometerHistory()).toEqual([]);
    expect(fresh.motorcycle().currentMileage).toBe(0);
    expect(fresh.maintenancePlan().every((item) => !item.lastExecution)).toBe(true);
    expect(fresh.maintenancePlan().every((item) => item.origin === 'catalog')).toBe(true);

    const before = new Date().toISOString();
    expect(
      await fresh.completeSetup({ nickname: 'Trilha', year: 1997, currentMileage: 31_200 }),
    ).toBe(true);
    expect(fresh.motorcycle().createdAt >= before).toBe(true);
    expect(fresh.odometerHistory()).toHaveLength(1);
    expect(fresh.odometerHistory()[0]).toMatchObject({ mileage: 31_200, source: 'setup' });
    TestBed.resetTestingModule();
  });
});

describe('GarageStore', () => {
  let store: GarageStore;
  let storage: MemoryStorage;

  beforeEach(async () => {
    storage = new MemoryStorage();
    TestBed.configureTestingModule({
      providers: [
        GarageStore,
        {
          provide: LocalStorageAdapter,
          useValue: storage,
        },
      ],
    });
    store = TestBed.inject(GarageStore);
    expect(
      await store.completeSetup({ nickname: 'Minha NX', year: 1997, currentMileage: 28_750 }),
    ).toBe(true);
  });

  it('records each odometer update and persists schema 5', async () => {
    const result = await store.updateMileage({
      mileage: 31_000,
      source: 'dashboard',
      note: 'Leitura no abastecimento',
    });

    expect(result.status).toBe('updated');
    expect(store.odometerHistory()[0]).toMatchObject({
      motorcycleId: 'nx200-primary',
      mileage: 31_000,
      source: 'dashboard',
      note: 'Leitura no abastecimento',
    });
    expect(storage.get<GarageState>('state')?.schemaVersion).toBe(5);
  });

  it('does not lower mileage until the regression is explicitly confirmed', async () => {
    const historySize = store.odometerHistory().length;
    const result = await store.updateMileage({
      mileage: 20_000,
      source: 'correction',
    });

    expect(result.status).toBe('confirmation-required');
    expect(store.motorcycle().currentMileage).toBe(28_750);
    expect(store.odometerHistory()).toHaveLength(historySize);
  });

  it('records a confirmed regression without rewriting old history', async () => {
    const oldRecords = [...store.odometerHistory()];
    const result = await store.updateMileage({
      mileage: 20_000,
      source: 'panel-replacement',
      note: 'Painel substituído',
      confirmedRegression: true,
    });

    expect(result.status).toBe('updated');
    expect(store.motorcycle().currentMileage).toBe(20_000);
    expect(store.odometerHistory().slice(1)).toEqual(oldRecords);
    expect(store.odometerHistory()[0]?.source).toBe('panel-replacement');
  });

  it('updates the plan reference when a newer linked service is recorded', async () => {
    const record = await store.addService({
      title: 'Serviço vinculado',
      date: '2026-07-30',
      mileage: 30_000,
      maintenancePlanId: 'engine-oil',
      procedureSlug: 'troca-de-oleo',
      parts: [],
    });

    const item = store.maintenancePlan().find((candidate) => candidate.id === 'engine-oil');
    expect(record).not.toBeNull();
    expect(item?.lastExecution).toEqual({
      date: '2026-07-30',
      mileage: 30_000,
      serviceRecordId: record?.id,
    });
    expect(store.motorcycle().currentMileage).toBe(30_000);
  });

  it('keeps a newer plan execution when an older service is added', async () => {
    await store.addService({
      title: 'Serviço mais recente',
      date: '2026-07-30',
      mileage: 30_000,
      maintenancePlanId: 'engine-oil',
      parts: [],
    });
    const before = store
      .maintenancePlan()
      .find((candidate) => candidate.id === 'engine-oil')?.lastExecution;

    await store.addService({
      title: 'Serviço antigo',
      date: '2025-01-01',
      mileage: 12_000,
      maintenancePlanId: 'engine-oil',
      parts: [],
    });

    const after = store
      .maintenancePlan()
      .find((candidate) => candidate.id === 'engine-oil')?.lastExecution;
    expect(after).toEqual(before);
    expect(store.motorcycle().currentMileage).toBe(30_000);
  });

  it('adds a service reading to odometer history without lowering current mileage', async () => {
    const record = await store.addService({
      title: 'Serviço antigo',
      date: '2025-01-01',
      mileage: 12_000,
      parts: [],
    });

    expect(store.motorcycle().currentMileage).toBe(28_750);
    expect(store.odometerHistory()[0]).toMatchObject({
      source: 'service',
      mileage: 12_000,
      serviceRecordId: record?.id,
    });
  });

  it('commits state only after storage succeeds', async () => {
    storage.failWrites = true;
    const result = await store.updateMileage({ mileage: 31_000, source: 'dashboard' });

    expect(result.status).toBe('blocked');
    expect(store.motorcycle().currentMileage).toBe(28_750);
    expect(store.recovery()?.kind).toBe('persistence-error');
  });

  it('does not overwrite invalid raw state during initialization', async () => {
    TestBed.resetTestingModule();
    const invalidStorage = new MemoryStorage();
    invalidStorage.setRaw('state', '{"schemaVersion":2,"motorcycle":null}');
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: invalidStorage }],
    });

    const recoveredStore = TestBed.inject(GarageStore);
    expect(recoveredStore.recovery()?.kind).toBe('invalid-state');
    expect(invalidStorage.getRaw('state')).toBe('{"schemaVersion":2,"motorcycle":null}');
  });

  it('migrates the legacy value in place while preserving the physical key', async () => {
    TestBed.resetTestingModule();
    const legacyStorage = new MemoryStorage();
    const legacyData: Record<string, unknown> = {
      ...INITIAL_GARAGE_STATE,
      maintenancePlan: INITIAL_GARAGE_STATE.maintenancePlan.map((item) => {
        const legacyItem: Record<string, unknown> = { ...item };
        delete legacyItem['origin'];
        return legacyItem;
      }),
    };
    delete legacyData['schemaVersion'];
    delete legacyData['odometerHistory'];
    delete legacyData['setup'];
    delete legacyData['procedureExecutions'];
    legacyStorage.setRaw('state', JSON.stringify({ version: 1, ...legacyData }));
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: legacyStorage }],
    });

    const migratedStore = TestBed.inject(GarageStore);
    const persisted = legacyStorage.get<Record<string, unknown>>('state');
    expect(migratedStore.state().schemaVersion).toBe(5);
    expect(migratedStore.maintenancePlan()).toEqual(INITIAL_GARAGE_STATE.maintenancePlan);
    expect(migratedStore.motorcycle()).toEqual(INITIAL_GARAGE_STATE.motorcycle);
    expect(persisted?.['schemaVersion']).toBe(5);
    expect(persisted?.['version']).toBeUndefined();
  });

  it('replaces recovered data only through an explicit import or reset', async () => {
    TestBed.resetTestingModule();
    const invalidStorage = new MemoryStorage();
    invalidStorage.setRaw('state', '{invalid');
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: invalidStorage }],
    });
    const recoveredStore = TestBed.inject(GarageStore);

    expect(await recoveredStore.importState(INITIAL_GARAGE_STATE)).toBe(true);
    expect(recoveredStore.recovery()).toBeUndefined();
    expect(invalidStorage.get<GarageState>('state')?.schemaVersion).toBe(5);
  });

  it('persists procedure progress and resumes it after recreating the store', async () => {
    const procedure = store.procedures()[0]!;
    const started = await store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(
      (await store.completeProcedureStep(started.execution.id, procedure.steps[0]!.id)).ok,
    ).toBe(true);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: storage }],
    });
    const resumedStore = TestBed.inject(GarageStore);
    expect(resumedStore.activeProcedureExecutions()[0]).toMatchObject({
      id: started.execution.id,
      completedStepIds: [procedure.steps[0]!.id],
    });
  });

  it('allows only one active execution of the same procedure and rolls back failed writes', async () => {
    const procedure = store.procedures()[0]!;
    const warnings = procedure.safetyWarnings.map((warning) => warning.id);
    const started = await store.startProcedure(procedure.slug, warnings);
    expect(started.ok).toBe(true);
    expect((await store.startProcedure(procedure.slug, warnings)).ok).toBe(false);
    if (!started.ok) return;

    storage.failWrites = true;
    expect(
      (await store.completeProcedureStep(started.execution.id, procedure.steps[0]!.id)).ok,
    ).toBe(false);
    expect(store.procedureExecutions()[0]?.completedStepIds).toEqual([]);
  });

  it('links one completed execution to one service in the same persisted state', async () => {
    const procedure = store.procedures()[0]!;
    const started = await store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    if (!started.ok) throw new Error(started.error);
    for (const step of procedure.steps.filter((candidate) => candidate.required)) {
      expect((await store.completeProcedureStep(started.execution.id, step.id)).ok).toBe(true);
    }
    for (const check of procedure.finalChecks.filter((candidate) => candidate.required)) {
      expect((await store.setProcedureFinalCheck(started.execution.id, check.id, true)).ok).toBe(
        true,
      );
    }
    expect((await store.finishProcedure(started.execution.id)).ok).toBe(true);
    const service = await store.addService({
      title: procedure.title,
      date: '2026-08-01',
      mileage: store.motorcycle().currentMileage,
      procedureSlug: procedure.slug,
      procedureExecutionId: started.execution.id,
      parts: [],
    });
    expect(service).not.toBeNull();
    expect(
      store.procedureExecutions().find((item) => item.id === started.execution.id)
        ?.resultingServiceRecordId,
    ).toBe(service?.id);
    expect(
      await store.addService({
        title: 'Duplicado',
        date: '2026-08-01',
        mileage: store.motorcycle().currentMileage,
        procedureSlug: procedure.slug,
        procedureExecutionId: started.execution.id,
        parts: [],
      }),
    ).toBeNull();
  });

  it('cancels an execution without changing the plan, odometer or service history', async () => {
    const procedure = store.procedures()[0]!;
    const before = store.state();
    const started = await store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    if (!started.ok) throw new Error(started.error);
    expect((await store.cancelProcedure(started.execution.id)).ok).toBe(true);
    expect(store.procedureExecutions()[0]?.status).toBe('cancelled');
    expect(store.motorcycle().currentMileage).toBe(before.motorcycle.currentMileage);
    expect(store.maintenancePlan()).toEqual(before.maintenancePlan);
    expect(store.serviceHistory()).toEqual(before.serviceHistory);
  });

  it('records fuel, updates a higher odometer and keeps the durable link', async () => {
    const fuel = await store.addFuel({
      fueledAt: '2026-08-02T10:00:00.000Z',
      mileage: 29_000,
      liters: 8.5,
      totalCost: 52,
      fullTank: true,
    });
    expect(fuel).not.toBeNull();
    expect(store.motorcycle().currentMileage).toBe(29_000);
    expect(
      store.odometerHistory().find((record) => record.fuelRecordId === fuel?.id),
    ).toMatchObject({
      source: 'fuel',
      fuelRecordId: fuel?.id,
      mileage: 29_000,
    });
  });

  it('requires confirmation for historical fuel and never lowers the current odometer', async () => {
    const input = {
      fueledAt: '2026-07-01T10:00:00.000Z',
      mileage: 20_000,
      liters: 8,
      totalCost: 48,
      fullTank: true,
    };
    expect(await store.addFuel(input)).toBeNull();
    expect(await store.addFuel({ ...input, confirmedHistoricalMileage: true })).not.toBeNull();
    expect(store.motorcycle().currentMileage).toBe(28_750);
  });

  it('creates, edits and removes owner plan items and links services to them', async () => {
    const created = await store.addMaintenanceItem({
      title: 'Calibragem dos pneus',
      category: 'general',
      intervalKm: 500,
      warningKm: 100,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.id.startsWith('user-')).toBe(true);
    expect(storage.get<GarageState>('state')?.maintenancePlan).toContainEqual(created.value);

    const service = await store.addService({
      title: 'Calibragem',
      date: '2026-11-20',
      mileage: 28_750,
      maintenancePlanId: created.value.id,
      parts: [],
    });
    expect(service).not.toBeNull();
    const item = store.maintenancePlan().find((candidate) => candidate.id === created.value.id);
    expect(item?.lastExecution).toMatchObject({ mileage: 28_750, serviceRecordId: service?.id });
    expect((await store.removeMaintenanceItem(created.value.id)).ok).toBe(false);

    const edited = await store.updateMaintenanceItem(created.value.id, {
      title: 'Pneus',
      category: 'general',
      intervalDays: 15,
    });
    expect(edited.ok && edited.value.lastExecution?.serviceRecordId).toBe(service?.id);
    expect((await store.setMaintenanceSchedule(created.value.id, null)).ok).toBe(false);

    const other = await store.addMaintenanceItem({
      title: 'Lavar',
      category: 'general',
      intervalDays: 7,
    });
    expect(other.ok && (await store.removeMaintenanceItem(other.value.id)).ok).toBe(true);
    expect((await store.removeMaintenanceItem('engine-oil')).ok).toBe(false);
  });

  it('lets the owner set and clear an interval on a catalog item without touching its source', async () => {
    const original = store.maintenancePlan().find((item) => item.id === 'engine-oil')!;
    const result = await store.setMaintenanceSchedule('engine-oil', { intervalKm: 1000 });
    expect(result.ok).toBe(true);
    const saved = store.maintenancePlan().find((item) => item.id === 'engine-oil')!;
    expect(saved.userSchedule?.intervalKm).toBe(1000);
    expect(saved.intervalKm).toBe(original.intervalKm);
    expect(saved.technicalSource).toEqual(original.technicalSource);
    expect((await store.setMaintenanceSchedule('engine-oil', null)).ok).toBe(true);
    expect(store.maintenancePlan().find((item) => item.id === 'engine-oil')).toEqual(original);
    expect((await store.setMaintenanceSchedule('missing', { intervalKm: 1 })).ok).toBe(false);
    expect(
      (await store.addMaintenanceItem({ title: 'Sem intervalo', category: 'general' })).ok,
    ).toBe(false);
  });

  it('resets to a clean first-use state while keeping preferences', async () => {
    expect(await store.updateTheme('light')).toBe(true);
    expect(
      (await store.addMaintenanceItem({ title: 'X', category: 'general', intervalDays: 1 })).ok,
    ).toBe(true);
    expect(await store.resetToInitialState()).toBe(true);
    expect(store.setup()).toEqual({ completed: false, demoData: false });
    expect(store.serviceHistory()).toEqual([]);
    expect(store.maintenancePlan()).toEqual(INITIAL_GARAGE_STATE.maintenancePlan);
    expect(store.settings().theme).toBe('light');
    expect(
      (await store.addMaintenanceItem({ title: 'Y', category: 'general', intervalDays: 1 })).ok,
    ).toBe(false);
  });

  it('stores a complete pre-ride check and rolls back on write failure', async () => {
    const responses = store.safetyChecklist().map((item) => ({
      itemId: item.id,
      status: 'ok' as const,
    }));
    const saved = await store.addSafetyCheck({
      checkedAt: '2026-08-02T10:00:00.000Z',
      responses,
    });
    expect(saved.ok).toBe(true);
    expect(store.safetyCheckHistory()).toHaveLength(1);

    storage.failWrites = true;
    expect(
      (await store.addSafetyCheck({ checkedAt: '2026-08-02T11:00:00.000Z', responses })).ok,
    ).toBe(false);
    expect(store.safetyCheckHistory()).toHaveLength(1);
  });
});
