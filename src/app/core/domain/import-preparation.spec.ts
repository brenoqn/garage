import { describe, expect, it } from 'vitest';
import { INITIAL_GARAGE_STATE, NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { NX200_MAINTENANCE_PLAN } from '../../data/nx200/maintenance-plan/nx200-maintenance-plan.data';
import { GarageState } from '../models/garage-state.model';
import { createGarageBackup } from './backup';
import { canonicalJson, comparableImportState, prepareImport } from './import-preparation';

const configured: GarageState = {
  ...INITIAL_GARAGE_STATE,
  motorcycle: { ...INITIAL_GARAGE_STATE.motorcycle, currentMileage: 30_000 },
  setup: { completed: true, demoData: false },
  serviceHistory: [
    {
      id: 'service-1',
      title: 'Troca de óleo',
      date: '2026-10-01',
      mileage: 29_500,
      maintenancePlanId: 'engine-oil',
      parts: [],
      createdAt: '2026-10-01T12:00:00.000Z',
    },
  ],
};

function backupOf(state: GarageState): string {
  return JSON.stringify({
    product: 'garage',
    schemaVersion: 5,
    exportedAt: '2026-11-26T12:00:00.000Z',
    state,
  });
}

describe('import preparation', () => {
  it('accepts a configured backup and summarizes it', () => {
    const result = prepareImport(
      createGarageBackup(configured, '2026-11-26T12:00:00.000Z'),
      NX200_PROCEDURES,
      NX200_MAINTENANCE_PLAN,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.serviceHistory).toHaveLength(1);
    expect(result.summary.serviceRecords).toBe(1);
    expect(result.excludedDemoServices).toBe(0);
  });

  it('refuses a backup whose setup was never completed', () => {
    const result = prepareImport(
      backupOf(INITIAL_GARAGE_STATE),
      NX200_PROCEDURES,
      NX200_MAINTENANCE_PLAN,
    );
    expect(result).toMatchObject({ ok: false });
  });

  it('excludes demonstration services and reports how many', () => {
    const withDemo: GarageState = {
      ...configured,
      serviceHistory: [
        ...configured.serviceHistory,
        { ...configured.serviceHistory[0]!, id: 'demo-oil', isDemo: true },
      ],
    };
    const result = prepareImport(backupOf(withDemo), NX200_PROCEDURES, NX200_MAINTENANCE_PLAN);
    expect(result.ok && result.excludedDemoServices).toBe(1);
    expect(result.ok && result.state.serviceHistory.map((s) => s.id)).toEqual(['service-1']);
  });

  it('refuses unknown catalog items and promoted technical sources', () => {
    const unknown: GarageState = {
      ...configured,
      maintenancePlan: [
        ...configured.maintenancePlan,
        { ...configured.maintenancePlan[0]!, id: 'mystery', title: 'Mistério' },
      ],
    };
    expect(prepareImport(backupOf(unknown), NX200_PROCEDURES, NX200_MAINTENANCE_PLAN).ok).toBe(
      false,
    );
    const promoted: GarageState = {
      ...configured,
      maintenancePlan: configured.maintenancePlan.map((item) =>
        item.id === 'engine-oil'
          ? { ...item, technicalSource: { status: 'confirmed', label: 'Promovida' } }
          : item,
      ),
    };
    expect(prepareImport(backupOf(promoted), NX200_PROCEDURES, NX200_MAINTENANCE_PLAN).ok).toBe(
      false,
    );
  });

  it('compares states independently of order, settings and undefined fields', () => {
    const reordered: GarageState = {
      ...configured,
      maintenancePlan: [...configured.maintenancePlan].reverse(),
      settings: { maintenanceAlertsEnabled: false, theme: 'light' },
    };
    expect(comparableImportState(reordered)).toBe(comparableImportState(configured));
    expect(canonicalJson({ b: 1, a: undefined, c: [2, { z: 1, y: 2 }] })).toBe(
      '{"b":1,"c":[2,{"y":2,"z":1}]}',
    );
  });
});
