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

describe('GarageStore', () => {
  let store: GarageStore;
  let storage: MemoryStorage;

  beforeEach(() => {
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
    expect(store.completeSetup({ nickname: 'Minha NX', year: 1997, currentMileage: 28_750 })).toBe(
      true,
    );
  });

  it('records each odometer update and persists schema 4', () => {
    const result = store.updateMileage({
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
    expect(storage.get<GarageState>('state')?.schemaVersion).toBe(4);
  });

  it('does not lower mileage until the regression is explicitly confirmed', () => {
    const historySize = store.odometerHistory().length;
    const result = store.updateMileage({
      mileage: 20_000,
      source: 'correction',
    });

    expect(result.status).toBe('confirmation-required');
    expect(store.motorcycle().currentMileage).toBe(28_750);
    expect(store.odometerHistory()).toHaveLength(historySize);
  });

  it('records a confirmed regression without rewriting old history', () => {
    const oldRecords = [...store.odometerHistory()];
    const result = store.updateMileage({
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

  it('updates the plan reference when a newer linked service is recorded', () => {
    const record = store.addService({
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

  it('keeps a newer plan execution when an older service is added', () => {
    store.addService({
      title: 'Serviço mais recente',
      date: '2026-07-30',
      mileage: 30_000,
      maintenancePlanId: 'engine-oil',
      parts: [],
    });
    const before = store
      .maintenancePlan()
      .find((candidate) => candidate.id === 'engine-oil')?.lastExecution;

    store.addService({
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

  it('adds a service reading to odometer history without lowering current mileage', () => {
    const record = store.addService({
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

  it('commits state only after storage succeeds', () => {
    storage.failWrites = true;
    const result = store.updateMileage({ mileage: 31_000, source: 'dashboard' });

    expect(result.status).toBe('blocked');
    expect(store.motorcycle().currentMileage).toBe(28_750);
    expect(store.recovery()?.kind).toBe('persistence-error');
  });

  it('does not overwrite invalid raw state during initialization', () => {
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

  it('migrates the legacy value in place while preserving the physical key', () => {
    TestBed.resetTestingModule();
    const legacyStorage = new MemoryStorage();
    const legacyData: Record<string, unknown> = { ...INITIAL_GARAGE_STATE };
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
    expect(migratedStore.state().schemaVersion).toBe(4);
    expect(migratedStore.motorcycle()).toEqual(INITIAL_GARAGE_STATE.motorcycle);
    expect(persisted?.['schemaVersion']).toBe(4);
    expect(persisted?.['version']).toBeUndefined();
  });

  it('replaces recovered data only through an explicit import or reset', () => {
    TestBed.resetTestingModule();
    const invalidStorage = new MemoryStorage();
    invalidStorage.setRaw('state', '{invalid');
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: invalidStorage }],
    });
    const recoveredStore = TestBed.inject(GarageStore);

    expect(recoveredStore.importState(INITIAL_GARAGE_STATE)).toBe(true);
    expect(recoveredStore.recovery()).toBeUndefined();
    expect(invalidStorage.get<GarageState>('state')?.schemaVersion).toBe(4);
  });

  it('persists procedure progress and resumes it after recreating the store', () => {
    const procedure = store.procedures()[0]!;
    const started = store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(store.completeProcedureStep(started.execution.id, procedure.steps[0]!.id).ok).toBe(true);

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

  it('allows only one active execution of the same procedure and rolls back failed writes', () => {
    const procedure = store.procedures()[0]!;
    const warnings = procedure.safetyWarnings.map((warning) => warning.id);
    const started = store.startProcedure(procedure.slug, warnings);
    expect(started.ok).toBe(true);
    expect(store.startProcedure(procedure.slug, warnings).ok).toBe(false);
    if (!started.ok) return;

    storage.failWrites = true;
    expect(store.completeProcedureStep(started.execution.id, procedure.steps[0]!.id).ok).toBe(
      false,
    );
    expect(store.procedureExecutions()[0]?.completedStepIds).toEqual([]);
  });

  it('links one completed execution to one service in the same persisted state', () => {
    const procedure = store.procedures()[0]!;
    const started = store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    if (!started.ok) throw new Error(started.error);
    for (const step of procedure.steps.filter((candidate) => candidate.required)) {
      expect(store.completeProcedureStep(started.execution.id, step.id).ok).toBe(true);
    }
    for (const check of procedure.finalChecks.filter((candidate) => candidate.required)) {
      expect(store.setProcedureFinalCheck(started.execution.id, check.id, true).ok).toBe(true);
    }
    expect(store.finishProcedure(started.execution.id).ok).toBe(true);
    const service = store.addService({
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
      store.addService({
        title: 'Duplicado',
        date: '2026-08-01',
        mileage: store.motorcycle().currentMileage,
        procedureSlug: procedure.slug,
        procedureExecutionId: started.execution.id,
        parts: [],
      }),
    ).toBeNull();
  });

  it('cancels an execution without changing the plan, odometer or service history', () => {
    const procedure = store.procedures()[0]!;
    const before = store.state();
    const started = store.startProcedure(
      procedure.slug,
      procedure.safetyWarnings.map((warning) => warning.id),
    );
    if (!started.ok) throw new Error(started.error);
    expect(store.cancelProcedure(started.execution.id).ok).toBe(true);
    expect(store.procedureExecutions()[0]?.status).toBe('cancelled');
    expect(store.motorcycle().currentMileage).toBe(before.motorcycle.currentMileage);
    expect(store.maintenancePlan()).toEqual(before.maintenancePlan);
    expect(store.serviceHistory()).toEqual(before.serviceHistory);
  });

  it('records fuel, updates a higher odometer and keeps the durable link', () => {
    const fuel = store.addFuel({
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

  it('requires confirmation for historical fuel and never lowers the current odometer', () => {
    const input = {
      fueledAt: '2026-07-01T10:00:00.000Z',
      mileage: 20_000,
      liters: 8,
      totalCost: 48,
      fullTank: true,
    };
    expect(store.addFuel(input)).toBeNull();
    expect(store.addFuel({ ...input, confirmedHistoricalMileage: true })).not.toBeNull();
    expect(store.motorcycle().currentMileage).toBe(28_750);
  });

  it('stores a complete pre-ride check and rolls back on write failure', () => {
    const responses = store.safetyChecklist().map((item) => ({
      itemId: item.id,
      status: 'ok' as const,
    }));
    const saved = store.addSafetyCheck({
      checkedAt: '2026-08-02T10:00:00.000Z',
      responses,
    });
    expect(saved.ok).toBe(true);
    expect(store.safetyCheckHistory()).toHaveLength(1);

    storage.failWrites = true;
    expect(store.addSafetyCheck({ checkedAt: '2026-08-02T11:00:00.000Z', responses }).ok).toBe(
      false,
    );
    expect(store.safetyCheckHistory()).toHaveLength(1);
  });
});
