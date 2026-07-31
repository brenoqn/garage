import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { GarageStore } from './garage-store.service';

class MemoryStorage {
  private readonly values = new Map<string, unknown>();

  get<T>(key: string): T | null {
    return (this.values.get(key) as T | undefined) ?? null;
  }

  set<T>(key: string, value: T): void {
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
  });

  it('updates the plan reference when a linked service is recorded', () => {
    const record = store.addService({
      title: 'Serviço vinculado',
      date: '2026-07-30',
      mileage: 30000,
      maintenancePlanId: 'engine-oil',
      procedureSlug: 'troca-de-oleo',
      parts: [],
    });

    const item = store.maintenancePlan().find((candidate) => candidate.id === 'engine-oil');
    expect(item?.lastExecution).toEqual({
      date: '2026-07-30',
      mileage: 30000,
      serviceRecordId: record.id,
    });
    expect(store.motorcycle().currentMileage).toBe(30000);
  });

  it('does not lower the motorcycle mileage from an older service', () => {
    const currentMileage = store.motorcycle().currentMileage;

    store.addService({
      title: 'Serviço antigo',
      date: '2025-01-01',
      mileage: 12000,
      parts: [],
    });

    expect(store.motorcycle().currentMileage).toBe(currentMileage);
  });

  it('persists state changes through the storage abstraction', () => {
    store.updateMileage(31000);

    expect(
      storage.get<{ motorcycle: { currentMileage: number } }>('state')?.motorcycle.currentMileage,
    ).toBe(31000);
  });
});
