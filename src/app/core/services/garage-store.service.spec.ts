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

  it('records each odometer update and persists schema 2', () => {
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
    expect(storage.get<GarageState>('state')?.schemaVersion).toBe(2);
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
    legacyStorage.setRaw('state', JSON.stringify({ version: 1, ...legacyData }));
    TestBed.configureTestingModule({
      providers: [GarageStore, { provide: LocalStorageAdapter, useValue: legacyStorage }],
    });

    const migratedStore = TestBed.inject(GarageStore);
    const persisted = legacyStorage.get<Record<string, unknown>>('state');
    expect(migratedStore.state().schemaVersion).toBe(2);
    expect(migratedStore.motorcycle()).toEqual(INITIAL_GARAGE_STATE.motorcycle);
    expect(persisted?.['schemaVersion']).toBe(2);
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
    expect(invalidStorage.get<GarageState>('state')?.schemaVersion).toBe(2);
  });
});
