import { Injectable, InjectionToken } from '@angular/core';
import { calculateMaintenanceSchedule } from '../domain/maintenance-calculator';
import {
  MaintenanceAlert,
  MaintenancePlanItem,
  MaintenanceSchedule,
} from '../models/maintenance.model';

export interface NotificationService {
  buildAlerts(
    items: readonly MaintenancePlanItem[],
    currentMileage: number,
    today: string,
  ): readonly MaintenanceAlert[];
}

export const NOTIFICATION_SERVICE = new InjectionToken<NotificationService>('NotificationService');

const STATUS_PRIORITY = { overdue: 3, due: 2, upcoming: 1 } as const;

@Injectable()
export class InAppNotificationService implements NotificationService {
  buildAlerts(
    items: readonly MaintenancePlanItem[],
    currentMileage: number,
    today: string,
  ): readonly MaintenanceAlert[] {
    return items
      .flatMap((item): readonly MaintenanceAlert[] => {
        const schedule = calculateMaintenanceSchedule(item, currentMileage, today);
        if (
          schedule.status !== 'upcoming' &&
          schedule.status !== 'due' &&
          schedule.status !== 'overdue'
        ) {
          return [];
        }

        return [
          {
            itemId: item.id,
            title: item.title,
            status: schedule.status,
            reason: this.reason(item, schedule),
            message: this.describe(schedule),
            nextDate: schedule.nextDate,
            nextMileage: schedule.nextMileage,
            remainingDays: schedule.remainingDays,
            remainingKm: schedule.remainingKm,
            actionLabel: 'Registrar manutenção',
          },
        ];
      })
      .sort((a, b) => {
        const priority = STATUS_PRIORITY[b.status] - STATUS_PRIORITY[a.status];
        if (priority !== 0) {
          return priority;
        }
        return this.urgencyValue(a) - this.urgencyValue(b);
      });
  }

  private urgencyValue(alert: MaintenanceAlert): number {
    const values = [alert.remainingDays, alert.remainingKm].filter(
      (value): value is number => value !== undefined,
    );
    return values.length > 0 ? Math.min(...values) : Number.POSITIVE_INFINITY;
  }

  private reason(item: MaintenancePlanItem, schedule: MaintenanceSchedule): string {
    const reasons: string[] = [];
    if (schedule.remainingKm !== undefined) {
      if (schedule.remainingKm < 0) {
        reasons.push('quilometragem prevista ultrapassada');
      } else if (schedule.remainingKm === 0) {
        reasons.push('quilometragem prevista atingida');
      } else if (item.warningKm !== undefined && schedule.remainingKm <= item.warningKm) {
        reasons.push('dentro da antecedência por quilometragem');
      }
    }
    if (schedule.remainingDays !== undefined) {
      if (schedule.remainingDays < 0) {
        reasons.push('data prevista ultrapassada');
      } else if (schedule.remainingDays === 0) {
        reasons.push('data prevista atingida');
      } else if (item.warningDays !== undefined && schedule.remainingDays <= item.warningDays) {
        reasons.push('dentro da antecedência por data');
      }
    }
    return reasons.join(' e ');
  }

  private describe(schedule: MaintenanceSchedule): string {
    const parts: string[] = [];
    if (schedule.remainingKm !== undefined) {
      parts.push(
        schedule.remainingKm < 0
          ? `${Math.abs(schedule.remainingKm).toLocaleString('pt-BR')} km em atraso`
          : schedule.remainingKm === 0
            ? 'quilometragem atingida'
            : `${schedule.remainingKm.toLocaleString('pt-BR')} km restantes`,
      );
    }
    if (schedule.remainingDays !== undefined) {
      parts.push(
        schedule.remainingDays < 0
          ? `${Math.abs(schedule.remainingDays)} dias em atraso`
          : schedule.remainingDays === 0
            ? 'vence hoje'
            : `${schedule.remainingDays} dias restantes`,
      );
    }
    return parts.join(' · ');
  }
}
