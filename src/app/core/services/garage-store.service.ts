import { computed, inject, Injectable, signal } from '@angular/core';
import {
  INITIAL_GARAGE_STATE,
  NX200_PROCEDURES,
  NX200_SPECIFICATIONS,
} from '../../data/nx200-demo.data';
import { GarageState } from '../models/garage-state.model';
import { Motorcycle } from '../models/motorcycle.model';
import { NewServiceRecord, ServiceRecord } from '../models/service-record.model';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { StoragePort } from '../storage/storage.port';

const STORAGE_KEY = 'state';

@Injectable({ providedIn: 'root' })
export class GarageStore {
  private readonly storage: StoragePort = inject(LocalStorageAdapter);
  private readonly stateSignal = signal<GarageState>(
    this.storage.get<GarageState>(STORAGE_KEY) ?? INITIAL_GARAGE_STATE,
  );

  readonly state = this.stateSignal.asReadonly();
  readonly motorcycle = computed(() => this.stateSignal().motorcycle);
  readonly maintenancePlan = computed(() => this.stateSignal().maintenancePlan);
  readonly serviceHistory = computed(() =>
    [...this.stateSignal().serviceHistory].sort((a, b) => b.date.localeCompare(a.date)),
  );
  readonly settings = computed(() => this.stateSignal().settings);
  readonly procedures = signal(NX200_PROCEDURES).asReadonly();
  readonly specifications = signal(NX200_SPECIFICATIONS).asReadonly();

  updateMotorcycle(changes: Pick<Motorcycle, 'nickname' | 'year' | 'currentMileage'>): void {
    this.update((state) => ({
      ...state,
      motorcycle: {
        ...state.motorcycle,
        ...changes,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  updateMileage(currentMileage: number): void {
    this.updateMotorcycle({
      nickname: this.motorcycle().nickname,
      year: this.motorcycle().year,
      currentMileage,
    });
  }

  addService(input: NewServiceRecord): ServiceRecord {
    const record: ServiceRecord = {
      ...input,
      id: globalThis.crypto?.randomUUID?.() ?? `service-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    this.update((state) => ({
      ...state,
      motorcycle: {
        ...state.motorcycle,
        currentMileage: Math.max(state.motorcycle.currentMileage, record.mileage),
        updatedAt: new Date().toISOString(),
      },
      serviceHistory: [record, ...state.serviceHistory],
      maintenancePlan: state.maintenancePlan.map((item) =>
        item.id === record.maintenancePlanId
          ? {
              ...item,
              lastExecution: {
                date: record.date,
                mileage: record.mileage,
                serviceRecordId: record.id,
              },
            }
          : item,
      ),
    }));

    return record;
  }

  updateSettings(maintenanceAlertsEnabled: boolean): void {
    this.update((state) => ({
      ...state,
      settings: { ...state.settings, maintenanceAlertsEnabled },
    }));
  }

  resetDemoData(): void {
    this.stateSignal.set(INITIAL_GARAGE_STATE);
    this.storage.set(STORAGE_KEY, INITIAL_GARAGE_STATE);
  }

  exportData(): string {
    return JSON.stringify(this.stateSignal(), null, 2);
  }

  private update(reducer: (state: GarageState) => GarageState): void {
    const nextState = reducer(this.stateSignal());
    this.stateSignal.set(nextState);
    this.storage.set(STORAGE_KEY, nextState);
  }
}
