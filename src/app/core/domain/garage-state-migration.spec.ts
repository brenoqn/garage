import { describe, expect, it } from 'vitest';
import { NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { GarageState } from '../models/garage-state.model';
import {
  decodeStoredGarageState,
  GarageStateV2,
  migrateGarageStateV1,
  migrateGarageStateV2,
  migrateGarageStateV3,
  validateGarageState,
} from './garage-state-migration';

const source = { status: 'needs-confirmation' as const, label: 'Dado demonstrativo' };
const motorcycle = {
  id: 'nx200-primary',
  manufacturer: 'Honda' as const,
  model: 'NX200' as const,
  nickname: 'Minha NX',
  year: 1997,
  currentMileage: 12_345,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-07-30T12:00:00.000Z',
};
const plan = [{ id: 'oil', title: 'Óleo', category: 'engine' as const, technicalSource: source }];
const legacyState = {
  version: 1 as const,
  motorcycle,
  maintenancePlan: plan,
  serviceHistory: [],
  settings: { maintenanceAlertsEnabled: true },
};
const stateV2: GarageStateV2 = {
  schemaVersion: 2,
  motorcycle,
  maintenancePlan: plan,
  serviceHistory: [],
  odometerHistory: [],
  settings: legacyState.settings,
  setup: { completed: true, demoData: false },
};
const stateV3 = migrateGarageStateV2(stateV2);
const safeState: GarageState = migrateGarageStateV3(stateV3);

describe('garage state migration', () => {
  it('migrates schema 2 to schema 3 preserving every existing field', () => {
    const migrated = migrateGarageStateV2(stateV2);
    expect(migrated).toEqual({ ...stateV2, schemaVersion: 3, procedureExecutions: [] });
  });

  it('migrates schema 3 to schema 4 with empty daily-use histories and dark theme', () => {
    const migrated = migrateGarageStateV3(stateV3);
    expect(migrated).toMatchObject({
      schemaVersion: 4,
      fuelHistory: [],
      expenseHistory: [],
      occurrenceHistory: [],
      safetyCheckHistory: [],
      settings: { maintenanceAlertsEnabled: true, theme: 'dark' },
    });
    expect(migrated.motorcycle).toEqual(stateV3.motorcycle);
  });

  it('chains schema 1 through schema 4 without losing existing data', () => {
    const migrated = migrateGarageStateV1(legacyState);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.motorcycle).toEqual(legacyState.motorcycle);
    expect(migrated.maintenancePlan).toEqual(legacyState.maintenancePlan);
    expect(migrated.odometerHistory[0]?.mileage).toBe(12_345);
    expect(migrated.procedureExecutions).toEqual([]);
  });

  it('is idempotent once the state reaches schema 4', () => {
    const migrated = migrateGarageStateV3(migrateGarageStateV2(stateV2));
    const decoded = decodeStoredGarageState(JSON.stringify(migrated), safeState, NX200_PROCEDURES);
    expect(decoded.kind).toBe('current');
    expect(decoded.state).toEqual(migrated);
  });

  it('detects schema 2 and migrates it exactly once', () => {
    const first = decodeStoredGarageState(JSON.stringify(stateV2), safeState, NX200_PROCEDURES);
    expect(first.kind).toBe('migrated');
    const second = decodeStoredGarageState(
      JSON.stringify(first.state),
      safeState,
      NX200_PROCEDURES,
    );
    expect(second.kind).toBe('current');
    expect(second.state).toEqual(first.state);
  });

  it('detects schema 3 and migrates it exactly once', () => {
    const first = decodeStoredGarageState(JSON.stringify(stateV3), safeState, NX200_PROCEDURES);
    expect(first.kind).toBe('migrated');
    expect(first.state.schemaVersion).toBe(4);
    const second = decodeStoredGarageState(
      JSON.stringify(first.state),
      safeState,
      NX200_PROCEDURES,
    );
    expect(second.kind).toBe('current');
    expect(second.state).toEqual(first.state);
  });

  it('preserves invalid raw content and uses safe state only in memory', () => {
    const rawValue = '{"schemaVersion":3,"motorcycle":null}';
    const decoded = decodeStoredGarageState(rawValue, safeState, NX200_PROCEDURES);
    expect(decoded.kind).toBe('invalid-state');
    expect('rawValue' in decoded ? decoded.rawValue : null).toBe(rawValue);
    expect(decoded.state).toBe(safeState);
  });

  it('does not accept a future schema version', () => {
    expect(decodeStoredGarageState('{"schemaVersion":99}', safeState).kind).toBe('future-version');
  });

  it('rejects invalid execution references and duplicate active executions', () => {
    const procedure = NX200_PROCEDURES[0]!;
    const execution = {
      id: 'execution-1',
      motorcycleId: motorcycle.id,
      procedureSlug: procedure.slug,
      status: 'in-progress' as const,
      startedAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
      completedStepIds: ['missing-step'],
      completedFinalCheckIds: [],
      acknowledgedWarningIds: procedure.safetyWarnings.map((warning) => warning.id),
      currentStepId: procedure.steps[0]!.id,
    };
    expect(
      validateGarageState({ ...safeState, procedureExecutions: [execution] }, NX200_PROCEDURES)
        .valid,
    ).toBe(false);
    expect(
      validateGarageState(
        {
          ...safeState,
          procedureExecutions: [
            { ...execution, completedStepIds: [] },
            { ...execution, id: 'execution-2', completedStepIds: [] },
          ],
        },
        NX200_PROCEDURES,
      ).valid,
    ).toBe(false);
  });

  it('rejects invalid daily-use records without replacing the safe state', () => {
    const invalid = {
      ...safeState,
      fuelHistory: [
        {
          id: 'fuel-1',
          motorcycleId: motorcycle.id,
          fueledAt: 'invalid',
          mileage: 10_000,
          liters: 0,
          totalCost: 50,
          fullTank: true,
          createdAt: '2026-08-02T10:00:00.000Z',
        },
      ],
    };
    const decoded = decodeStoredGarageState(JSON.stringify(invalid), safeState, NX200_PROCEDURES);
    expect(decoded.kind).toBe('invalid-state');
    expect(decoded.state).toBe(safeState);
  });
});
