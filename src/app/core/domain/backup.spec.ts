import { describe, expect, it } from 'vitest';
import { NX200_PROCEDURES } from '../../data/nx200-demo.data';
import { GarageState } from '../models/garage-state.model';
import { createGarageBackup, parseGarageBackup } from './backup';

const state: GarageState = {
  schemaVersion: 3,
  motorcycle: {
    id: 'nx200-primary',
    manufacturer: 'Honda',
    model: 'NX200',
    nickname: 'Trilha',
    year: 1997,
    currentMileage: 18_500,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  },
  maintenancePlan: [],
  serviceHistory: [],
  odometerHistory: [],
  procedureExecutions: [],
  settings: { maintenanceAlertsEnabled: true },
  setup: { completed: true, demoData: false },
};

describe('Garage backup', () => {
  it('exports schema 3 with every user-owned collection', () => {
    const content = createGarageBackup(state, '2026-07-30T12:00:00.000Z');
    const parsed = JSON.parse(content) as Record<string, unknown>;
    expect(parsed['product']).toBe('garage');
    expect(parsed['schemaVersion']).toBe(3);
    expect(parsed['exportedAt']).toBe('2026-07-30T12:00:00.000Z');
    expect(parsed['state']).toEqual(state);
    expect(content).not.toContain('NX200_PROCEDURES');
  });

  it('omits reconstructible demonstration services from the exported state', () => {
    const content = createGarageBackup(
      {
        ...state,
        maintenancePlan: [
          {
            id: 'oil',
            title: 'Óleo',
            category: 'engine',
            technicalSource: { status: 'needs-confirmation', label: 'Demonstração' },
            lastExecution: { date: '2026-01-01', mileage: 1_000, serviceRecordId: 'demo-oil' },
          },
        ],
        serviceHistory: [
          {
            id: 'demo-oil',
            title: 'Serviço demonstrativo',
            date: '2026-01-01',
            mileage: 1_000,
            parts: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            isDemo: true,
          },
        ],
      },
      '2026-07-30T12:00:00.000Z',
    );
    const result = parseGarageBackup(content, NX200_PROCEDURES);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.state.serviceHistory).toEqual([]);
      expect(result.backup.state.maintenancePlan[0]?.lastExecution).toBeUndefined();
    }
  });

  it('validates and summarizes execution records', () => {
    const result = parseGarageBackup(
      createGarageBackup(state, '2026-07-30T12:00:00.000Z'),
      NX200_PROCEDURES,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.motorcycle).toBe('Honda NX200');
      expect(result.summary.currentMileage).toBe(18_500);
      expect(result.summary.procedureExecutions).toBe(0);
    }
  });

  it('accepts a valid schema 2 backup and migrates it to schema 3', () => {
    const legacyState = { ...state, schemaVersion: 2 } as Record<string, unknown>;
    delete legacyState['procedureExecutions'];
    const result = parseGarageBackup(
      JSON.stringify({
        product: 'garage',
        schemaVersion: 2,
        exportedAt: '2026-07-30T12:00:00.000Z',
        state: legacyState,
      }),
      NX200_PROCEDURES,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.schemaVersion).toBe(3);
      expect(result.backup.state.procedureExecutions).toEqual([]);
    }
  });

  it('rejects malformed, foreign, future and internally inconsistent backups', () => {
    expect(parseGarageBackup('{invalid').ok).toBe(false);
    expect(
      parseGarageBackup(
        JSON.stringify({ product: 'other', schemaVersion: 3, exportedAt: '', state }),
      ).ok,
    ).toBe(false);
    expect(
      parseGarageBackup(
        JSON.stringify({
          product: 'garage',
          schemaVersion: 99,
          exportedAt: '2026-07-30T12:00:00.000Z',
          state,
        }),
      ).ok,
    ).toBe(false);
    expect(
      parseGarageBackup(
        JSON.stringify({
          product: 'garage',
          schemaVersion: 3,
          exportedAt: '2026-07-30T12:00:00.000Z',
          state: { ...state, motorcycle: null },
        }),
        NX200_PROCEDURES,
      ).ok,
    ).toBe(false);
  });
});
