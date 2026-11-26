import { describe, expect, it } from 'vitest';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { calculateMaintenanceSchedule } from './maintenance-calculator';
import {
  applyUserSchedule,
  buildUserSchedule,
  createUserMaintenanceItem,
  effectiveMaintenanceInterval,
  isValidUserSchedule,
  planItemIntegrityError,
  planItemRemovalError,
  updateUserMaintenanceItem,
} from './maintenance-plan';

const now = '2026-11-26T10:00:00.000Z';
const transcribed = { status: 'needs-confirmation' as const, label: 'Transcrição pendente' };
const catalogItem: MaintenancePlanItem = {
  id: 'engine-oil',
  title: 'Óleo do motor',
  category: 'engine',
  origin: 'catalog',
  intervalKm: 1500,
  warningKm: 500,
  technicalSource: transcribed,
  lastExecution: { date: '2026-10-01', mileage: 10_000 },
};

describe('user maintenance schedule', () => {
  it('requires at least one interval and warnings smaller than the interval', () => {
    expect(buildUserSchedule({}, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalKm: 0 }, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalKm: 1.5 }, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalKm: 1000, warningKm: 1000 }, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalDays: 30, warningKm: 10 }, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalDays: 4000 }, now).ok).toBe(false);
    expect(buildUserSchedule({ intervalKm: 1000, warningKm: 100, note: '  ' }, now)).toEqual({
      ok: true,
      value: { updatedAt: now, intervalKm: 1000, warningKm: 100 },
    });
  });

  it('validates persisted schedules strictly at runtime', () => {
    expect(isValidUserSchedule({ intervalKm: 1000, updatedAt: now })).toBe(true);
    expect(isValidUserSchedule({ intervalKm: 1000 })).toBe(false);
    expect(isValidUserSchedule({ intervalKm: 1000, updatedAt: now, extra: 1 })).toBe(false);
    expect(isValidUserSchedule({ intervalKm: 1000, updatedAt: now, note: ' x ' })).toBe(false);
    expect(isValidUserSchedule({ warningKm: 10, updatedAt: now })).toBe(false);
  });
});

describe('effective maintenance interval', () => {
  it('keeps transcribed catalog intervals out of reminders', () => {
    expect(effectiveMaintenanceInterval(catalogItem)).toBeUndefined();
    expect(calculateMaintenanceSchedule(catalogItem, 12_000, '2026-11-26').status).toBe('unknown');
  });

  it('uses the owner interval, labelled as such, even when the source is pending', () => {
    const result = applyUserSchedule(catalogItem, { intervalKm: 1000, warningKm: 200 }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.technicalSource).toEqual(transcribed);
    expect(result.value.intervalKm).toBe(1500);
    expect(effectiveMaintenanceInterval(result.value)).toMatchObject({
      basis: 'user',
      intervalKm: 1000,
    });
    expect(calculateMaintenanceSchedule(result.value, 10_850, '2026-11-26')).toMatchObject({
      status: 'upcoming',
      nextMileage: 11_000,
      remainingKm: 150,
    });
    expect(calculateMaintenanceSchedule(result.value, 11_200, '2026-11-26').status).toBe('overdue');
  });

  it('prefers the owner interval over a confirmed source and can return to the catalog', () => {
    const confirmed: MaintenancePlanItem = {
      ...catalogItem,
      technicalSource: { status: 'confirmed', label: 'Fonte revisada' },
    };
    expect(effectiveMaintenanceInterval(confirmed)?.basis).toBe('confirmed-source');
    const withUser = applyUserSchedule(confirmed, { intervalDays: 90 }, now);
    expect(withUser.ok && effectiveMaintenanceInterval(withUser.value)?.basis).toBe('user');
    const cleared = withUser.ok ? applyUserSchedule(withUser.value, null, now) : withUser;
    expect(cleared.ok && cleared.value.userSchedule).toBeUndefined();
    expect(cleared.ok && effectiveMaintenanceInterval(cleared.value)?.basis).toBe(
      'confirmed-source',
    );
  });
});

describe('owner-created plan items', () => {
  const created = createUserMaintenanceItem(
    { title: '  Calibragem  ', category: 'general', intervalDays: 15 },
    'user-1',
    now,
  );

  it('creates an item without technical source claims or catalog intervals', () => {
    expect(created).toEqual({
      ok: true,
      value: {
        id: 'user-1',
        title: 'Calibragem',
        category: 'general',
        origin: 'user',
        userSchedule: { updatedAt: now, intervalDays: 15 },
        technicalSource: {
          status: 'needs-confirmation',
          label: 'Item criado por você. Não há fonte técnica vinculada.',
        },
      },
    });
    expect(created.ok && planItemIntegrityError(created.value)).toBeNull();
  });

  it('rejects invalid names, categories, ids and missing intervals', () => {
    expect(
      createUserMaintenanceItem({ title: ' ', category: 'general', intervalKm: 1 }, 'user-1', now)
        .ok,
    ).toBe(false);
    expect(
      createUserMaintenanceItem(
        { title: 'X', category: 'wheels' as never, intervalKm: 1 },
        'user-1',
        now,
      ).ok,
    ).toBe(false);
    expect(
      createUserMaintenanceItem({ title: 'X', category: 'general', intervalKm: 1 }, 'oil', now).ok,
    ).toBe(false);
    expect(createUserMaintenanceItem({ title: 'X', category: 'general' }, 'user-1', now).ok).toBe(
      false,
    );
  });

  it('keeps the last execution when editing and never clears the interval', () => {
    if (!created.ok) throw new Error('fixture');
    const executed = { ...created.value, lastExecution: { date: '2026-11-01', mileage: 5 } };
    const updated = updateUserMaintenanceItem(
      executed,
      { title: 'Pneus', category: 'general', intervalKm: 500 },
      now,
    );
    expect(updated.ok && updated.value).toMatchObject({
      title: 'Pneus',
      userSchedule: { intervalKm: 500 },
      lastExecution: { date: '2026-11-01', mileage: 5 },
    });
    expect(applyUserSchedule(executed, null, now).ok).toBe(false);
    expect(
      updateUserMaintenanceItem(catalogItem, { title: 'X', category: 'engine', intervalKm: 1 }, now)
        .ok,
    ).toBe(false);
  });

  it('detects integrity problems between origin, id and source', () => {
    if (!created.ok) throw new Error('fixture');
    expect(planItemIntegrityError({ ...catalogItem, id: 'user-oil' })).not.toBeNull();
    expect(planItemIntegrityError({ ...created.value, id: 'oil' })).not.toBeNull();
    expect(planItemIntegrityError({ ...created.value, intervalKm: 10 })).not.toBeNull();
    expect(
      planItemIntegrityError({ ...created.value, procedureSlug: 'troca-de-oleo' }),
    ).not.toBeNull();
    expect(
      planItemIntegrityError({
        ...created.value,
        technicalSource: { status: 'confirmed', label: 'Inventada' },
      }),
    ).not.toBeNull();
    const withoutSchedule = { ...created.value };
    delete (withoutSchedule as { userSchedule?: unknown }).userSchedule;
    expect(planItemIntegrityError(withoutSchedule)).not.toBeNull();
  });

  it('only removes owner items that no service references', () => {
    if (!created.ok) throw new Error('fixture');
    expect(planItemRemovalError(created.value, [])).toBeNull();
    expect(planItemRemovalError(created.value, [{ maintenancePlanId: 'user-1' }])).not.toBeNull();
    expect(planItemRemovalError(catalogItem, [])).not.toBeNull();
  });
});
