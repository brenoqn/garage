import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { GarageSnapshot, ImportPreview } from '../../../../shared/garage';
import { INITIAL_GARAGE_STATE } from '../../data/nx200-demo.data';
import {
  ApiFailureKind,
  ApiResult,
  CommandResult,
  GarageApiClient,
} from '../api/garage-api.client';
import { GarageState } from '../models/garage-state.model';
import { LocalStorageAdapter } from '../storage/local-storage.adapter';
import { GarageStore } from './garage-store.service';

class MemoryStorage {
  readonly values = new Map<string, string>();
  get<T>(key: string): T | null {
    const raw = this.getRaw(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }
  getRaw(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  set<T>(key: string, value: T): void {
    this.setRaw(key, JSON.stringify(value));
  }
  setRaw(key: string, value: string): void {
    this.values.set(key, value);
  }
  remove(key: string): void {
    this.values.delete(key);
  }
}

const serverState: GarageState = {
  ...INITIAL_GARAGE_STATE,
  motorcycle: { ...INITIAL_GARAGE_STATE.motorcycle, id: 'remote-moto', currentMileage: 40_000 },
  setup: { completed: true, demoData: false },
};

/** API falsa: guarda o estado, a revisão e os comandos recebidos. */
class FakeApi {
  revision = 7;
  state: GarageState = serverState;
  status: GarageSnapshot['status'] = 'configured-empty';
  commands: { path: string; payload: unknown; expectedRevision: string }[] = [];
  failNext?: ApiFailureKind;
  failSnapshot?: ApiFailureKind;
  imports: { digest: string; expectedRevision: string }[] = [];

  async snapshot(): Promise<ApiResult<GarageSnapshot>> {
    if (this.failSnapshot) return this.fail(this.failSnapshot);
    return {
      ok: true,
      value:
        this.status === 'not-configured'
          ? {
              revision: String(this.revision),
              catalogVersion: 'c',
              status: this.status,
              settings: this.state.settings,
            }
          : {
              revision: String(this.revision),
              catalogVersion: 'c',
              status: this.status,
              state: this.state,
            },
    };
  }

  async command(
    path: string,
    payload: unknown,
    expectedRevision: string,
  ): Promise<ApiResult<CommandResult>> {
    this.commands.push({ path, payload, expectedRevision });
    if (this.failNext) {
      const kind = this.failNext;
      this.failNext = undefined;
      return this.fail(kind);
    }
    if (expectedRevision !== String(this.revision)) return this.fail('conflict');
    let id = 'none';
    if (path === '/api/garage/expenses') {
      const input = payload as GarageState['expenseHistory'][number];
      id = `expense-${this.revision}`;
      this.state = {
        ...this.state,
        expenseHistory: [
          ...this.state.expenseHistory,
          {
            ...input,
            id,
            motorcycleId: this.state.motorcycle.id,
            createdAt: '2026-11-26T10:00:00.000Z',
          },
        ],
      };
    }
    this.revision += 1;
    this.status = 'configured-with-history';
    return { ok: true, value: { revision: String(this.revision), result: { ids: [id] } } };
  }

  async previewImport(): Promise<ApiResult<ImportPreview>> {
    return {
      ok: true,
      value: {
        digest: 'd'.repeat(64),
        summary: {
          motorcycle: 'Honda NX200',
          year: 1997,
          currentMileage: 1,
          serviceRecords: 0,
          odometerRecords: 0,
          maintenanceItems: 6,
          procedureExecutions: 0,
          fuelRecords: 0,
          expenseRecords: 0,
          occurrenceRecords: 0,
          safetyChecks: 0,
        },
        excludedDemoServices: 0,
        target: 'empty',
        settings: 'keep-remote',
      },
    };
  }

  async importBackup(
    _backup: unknown,
    digest: string,
    expectedRevision: string,
  ): Promise<ApiResult<CommandResult>> {
    this.imports.push({ digest, expectedRevision });
    this.status = 'configured-with-history';
    this.revision += 1;
    return { ok: true, value: { revision: String(this.revision), result: { ids: ['m'] } } };
  }

  private fail(kind: ApiFailureKind): {
    ok: false;
    failure: { kind: ApiFailureKind; message: string };
  } {
    return { ok: false, failure: { kind, message: `falha ${kind}` } };
  }
}

const localState: GarageState = {
  ...INITIAL_GARAGE_STATE,
  motorcycle: { ...INITIAL_GARAGE_STATE.motorcycle, currentMileage: 12_000 },
  setup: { completed: true, demoData: false },
};

describe('GarageStore in server mode', () => {
  let storage: MemoryStorage;
  let api: FakeApi;

  function createStore(): GarageStore {
    TestBed.configureTestingModule({
      providers: [
        GarageStore,
        { provide: LocalStorageAdapter, useValue: storage },
        { provide: GarageApiClient, useValue: api },
      ],
    });
    return TestBed.inject(GarageStore);
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    storage = new MemoryStorage();
    storage.set('state', localState);
    api = new FakeApi();
  });

  it('stays local until the server answers with a valid authenticated snapshot', async () => {
    api.failSnapshot = 'unauthenticated';
    const store = createStore();
    expect(store.mode()).toBe('local');
    const failed = await store.connectServer();
    expect(failed.ok).toBe(false);
    expect(store.mode()).toBe('local');
    expect(storage.getRaw('mode')).toBeNull();
    expect(store.motorcycle().currentMileage).toBe(12_000);

    api.failSnapshot = undefined;
    expect((await store.connectServer()).ok).toBe(true);
    expect(store.mode()).toBe('server');
    expect(storage.getRaw('mode')).toBe('server');
    expect(store.motorcycle().id).toBe('remote-moto');
    expect(storage.get<GarageState>('state')).toEqual(localState);
  });

  it('sends writes with the known revision and publishes only the confirmed snapshot', async () => {
    const store = createStore();
    await store.connectServer();
    const record = await store.addExpense({
      date: '2026-11-26',
      title: 'Placa',
      category: 'document',
      amount: 50,
      notes: '',
    });
    expect(record?.id).toBe('expense-7');
    expect(api.commands[0]).toMatchObject({
      path: '/api/garage/expenses',
      expectedRevision: '7',
      payload: { title: 'Placa', amount: 50 },
    });
    expect(store.expenseHistory()).toHaveLength(1);
    expect(storage.get<GarageState>('state')?.expenseHistory).toEqual([]);
    await store.addExpense({ date: '2026-11-26', title: 'Outro', category: 'other', amount: 1 });
    expect(api.commands[1]?.expectedRevision).toBe('8');
  });

  it('refreshes after a conflict and reports it without claiming success', async () => {
    const store = createStore();
    await store.connectServer();
    api.revision = 9;
    api.state = {
      ...api.state,
      motorcycle: { ...api.state.motorcycle, nickname: 'Outro aparelho' },
    };
    const record = await store.addExpense({
      date: '2026-11-26',
      title: 'Placa',
      category: 'document',
      amount: 50,
    });
    expect(record).toBeNull();
    expect(store.motorcycle().nickname).toBe('Outro aparelho');
    expect(store.expenseHistory()).toEqual([]);
    expect(store.remote().status).toBe('ready');
  });

  it('blocks writes after a network failure until the snapshot is reloaded', async () => {
    const store = createStore();
    await store.connectServer();
    api.failNext = 'network';
    expect(
      await store.addExpense({ date: '2026-11-26', title: 'A', category: 'other', amount: 1 }),
    ).toBeNull();
    expect(store.remote()).toMatchObject({ status: 'error', kind: 'network' });
    expect(
      await store.addExpense({ date: '2026-11-26', title: 'B', category: 'other', amount: 1 }),
    ).toBeNull();
    expect(api.commands).toHaveLength(1);
    await store.refreshRemote();
    expect(
      await store.addExpense({ date: '2026-11-26', title: 'C', category: 'other', amount: 1 }),
    ).not.toBeNull();
  });

  it('asks for regression confirmation locally before calling the server', async () => {
    const store = createStore();
    await store.connectServer();
    const result = await store.updateMileage({ mileage: 39_000, source: 'dashboard' });
    expect(result.status).toBe('confirmation-required');
    expect(api.commands).toHaveLength(0);
  });

  it('never resets or overwrites server data with local-only actions', async () => {
    const store = createStore();
    await store.connectServer();
    expect(await store.resetToInitialState()).toBe(false);
    expect(await store.importState(localState)).toBe(false);
    expect(api.commands).toHaveLength(0);
  });

  it('starts loading from the server when the mode was saved, and can return to local', async () => {
    storage.setRaw('mode', 'server');
    const store = createStore();
    expect(store.remote().status).toBe('loading');
    expect(store.remoteLoaded()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve));
    expect(store.remoteLoaded()).toBe(true);
    expect(store.motorcycle().id).toBe('remote-moto');
    expect(store.useLocalMode()).toBe(true);
    expect(store.mode()).toBe('local');
    expect(store.motorcycle().currentMileage).toBe(12_000);
    expect(storage.getRaw('mode')).toBeNull();
  });

  it('treats a not-configured server as an empty garage and imports the local data', async () => {
    api.status = 'not-configured';
    const store = createStore();
    await store.connectServer();
    expect(store.setup().completed).toBe(false);
    expect(store.remote()).toMatchObject({ status: 'ready', snapshot: 'not-configured' });
    const backup = store.localDataBackup();
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;
    const preview = await store.previewServerImport(backup.value);
    expect(preview.ok && preview.value.target).toBe('empty');
    if (!preview.ok) return;
    expect((await store.importToServer(backup.value, preview.value.digest)).ok).toBe(true);
    expect(api.imports).toEqual([{ digest: 'd'.repeat(64), expectedRevision: '7' }]);
    expect(store.setup().completed).toBe(true);
  });
});
