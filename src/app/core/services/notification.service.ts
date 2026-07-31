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

@Injectable()
export class InAppNotificationService implements NotificationService {
  buildAlerts(
    items: readonly MaintenancePlanItem[],
    currentMileage: number,
    today: string,
  ): readonly MaintenanceAlert[] {
    return items.flatMap((item) => {
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
          message: this.describe(schedule),
        },
      ];
    });
  }

  private describe(schedule: MaintenanceSchedule): string {
    const parts: string[] = [];
    if (schedule.remainingKm !== undefined) {
      parts.push(
        schedule.remainingKm < 0
          ? `${Math.abs(schedule.remainingKm).toLocaleString('pt-BR')} km acima`
          : `${schedule.remainingKm.toLocaleString('pt-BR')} km restantes`,
      );
    }
    if (schedule.remainingDays !== undefined) {
      parts.push(
        schedule.remainingDays < 0
          ? `${Math.abs(schedule.remainingDays)} dias em atraso`
          : `${schedule.remainingDays} dias restantes`,
      );
    }
    return parts.join(' · ');
  }
}
