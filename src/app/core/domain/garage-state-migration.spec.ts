import { describe, expect, it } from 'vitest';
import { GarageState } from '../models/garage-state.model';
import {
  decodeStoredGarageState,
  migrateGarageStateV1,
  validateGarageState,
} from './garage-state-migration';

const source = { status: 'needs-confirmation' as const, label: 'Dado demonstrativo' };

const legacyState = {
  version: 1 as const,
  motorcycle: {
    id: 'nx200-primary',
    manufacturer: 'Honda' as const,
    model: 'NX200' as const,
    nickname: 'Minha NX',
    year: 1997,
    currentMileage: 12_345,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  },
  maintenancePlan: [
    {
      id: 'oil',
      title: 'Óleo',
      category: 'engine' as const,
      technicalSource: source,
    },
  ],
  serviceHistory: [],
  settings: { maintenanceAlertsEnabled: true },
};

const safeState: GarageState = {
  schemaVersion: 2,
  motorcycle: legacyState.motorcycle,
  maintenancePlan: legacyState.maintenancePlan,
  serviceHistory: [],
  odometerHistory: [],
  settings: legacyState.settings,
  setup: { completed: false, demoData: true },
};

describe('garage state migration', () => {
  it('migrates schema 1 without losing existing data', () => {
    const migrated = migrateGarageStateV1(legacyState);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.motorcycle).toEqual(legacyState.motorcycle);
    expect(migrated.maintenancePlan).toEqual(legacyState.maintenancePlan);
    expect(migrated.odometerHistory).toHaveLength(1);
    expect(migrated.odometerHistory[0]?.mileage).toBe(12_345);
    expect(migrated.setup).toEqual({ completed: false, demoData: true });
  });

  it('is idempotent after the state reaches schema 2', () => {
    const migrated = migrateGarageStateV1(legacyState);
    const decoded = decodeStoredGarageState(JSON.stringify(migrated), safeState);

    expect(decoded.kind).toBe('current');
    expect(decoded.state).toEqual(migrated);
  });

  it('preserves invalid raw content and uses safe state only in memory', () => {
    const rawValue = '{"schemaVersion":2,"motorcycle":null}';
    const decoded = decodeStoredGarageState(rawValue, safeState);

    expect(decoded.kind).toBe('invalid-state');
    expect('rawValue' in decoded ? decoded.rawValue : null).toBe(rawValue);
    expect(decoded.state).toBe(safeState);
  });

  it('does not accept a future schema version', () => {
    const decoded = decodeStoredGarageState('{"schemaVersion":99}', safeState);

    expect(decoded.kind).toBe('future-version');
  });

  it('rejects a schema 2 state with invalid odometer records', () => {
    const validation = validateGarageState({
      ...safeState,
      odometerHistory: [{ mileage: 'invalid' }],
    });

    expect(validation.valid).toBe(false);
  });
});
