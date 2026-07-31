import { describe, expect, it } from 'vitest';
import { GarageState } from '../models/garage-state.model';
import { createGarageBackup, parseGarageBackup } from './backup';

const state: GarageState = {
  schemaVersion: 2,
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
  settings: { maintenanceAlertsEnabled: true },
  setup: { completed: true, demoData: false },
};

describe('Garage backup', () => {
  it('exports a versioned envelope with all user state', () => {
    const content = createGarageBackup(state, '2026-07-30T12:00:00.000Z');
    const parsed = JSON.parse(content) as Record<string, unknown>;

    expect(parsed['product']).toBe('garage');
    expect(parsed['schemaVersion']).toBe(2);
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
            lastExecution: {
              date: '2026-01-01',
              mileage: 1_000,
              serviceRecordId: 'demo-oil',
            },
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
    const result = parseGarageBackup(content);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.backup.state.serviceHistory).toEqual([]);
      expect(result.backup.state.maintenancePlan[0]?.lastExecution).toBeUndefined();
    }
  });

  it('validates and summarizes a compatible backup', () => {
    const result = parseGarageBackup(createGarageBackup(state, '2026-07-30T12:00:00.000Z'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.summary.motorcycle).toBe('Honda NX200');
      expect(result.summary.currentMileage).toBe(18_500);
      expect(result.summary.serviceRecords).toBe(0);
    }
  });

  it('rejects malformed JSON without side effects', () => {
    expect(parseGarageBackup('{invalid').ok).toBe(false);
  });

  it('rejects another product or schema version', () => {
    expect(
      parseGarageBackup(
        JSON.stringify({ product: 'other', schemaVersion: 2, exportedAt: '', state }),
      ).ok,
    ).toBe(false);
    expect(
      parseGarageBackup(
        JSON.stringify({
          product: 'garage',
          schemaVersion: 3,
          exportedAt: '2026-07-30T12:00:00.000Z',
          state,
        }),
      ).ok,
    ).toBe(false);
  });

  it('rejects a backup whose state does not match schema 2', () => {
    const result = parseGarageBackup(
      JSON.stringify({
        product: 'garage',
        schemaVersion: 2,
        exportedAt: '2026-07-30T12:00:00.000Z',
        state: { ...state, motorcycle: null },
      }),
    );

    expect(result.ok).toBe(false);
  });
});
