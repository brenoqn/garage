import { describe, expect, it } from 'vitest';
import { MaintenancePlanItem } from '../models/maintenance.model';
import { InAppNotificationService } from './notification.service';

const confirmed = { status: 'confirmed' as const, label: 'Fonte confirmada de teste' };

function item(id: string, changes: Partial<MaintenancePlanItem> = {}): MaintenancePlanItem {
  return {
    id,
    title: `Item ${id}`,
    category: 'general',
    intervalKm: 1_000,
    warningKm: 200,
    lastExecution: { date: '2026-07-01', mileage: 10_000 },
    technicalSource: confirmed,
    ...changes,
  };
}

describe('InAppNotificationService', () => {
  const service = new InAppNotificationService();

  it('includes reason, forecast and remaining distance', () => {
    const [alert] = service.buildAlerts([item('chain')], 10_900, '2026-07-30');

    expect(alert?.status).toBe('upcoming');
    expect(alert?.reason).toContain('antecedência por quilometragem');
    expect(alert?.nextMileage).toBe(11_000);
    expect(alert?.remainingKm).toBe(100);
    expect(alert?.actionLabel).toBe('Registrar manutenção');
  });

  it('sorts overdue alerts before upcoming alerts', () => {
    const alerts = service.buildAlerts(
      [
        item('upcoming'),
        item('overdue', { lastExecution: { date: '2026-07-01', mileage: 9_000 } }),
      ],
      10_900,
      '2026-07-30',
    );

    expect(alerts.map((alert) => alert.itemId)).toEqual(['overdue', 'upcoming']);
  });

  it('does not emit alerts for unconfirmed intervals', () => {
    const alerts = service.buildAlerts(
      [
        item('unconfirmed', {
          technicalSource: { status: 'needs-confirmation', label: 'A confirmar' },
        }),
      ],
      99_999,
      '2026-07-30',
    );

    expect(alerts).toEqual([]);
  });
});
