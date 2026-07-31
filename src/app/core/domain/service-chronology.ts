import { MaintenanceExecution } from '../models/maintenance.model';
import { ServiceRecord } from '../models/service-record.model';

export function shouldReplaceMaintenanceExecution(
  current: MaintenanceExecution | undefined,
  candidate: Pick<ServiceRecord, 'date' | 'mileage'>,
): boolean {
  if (!current) {
    return true;
  }
  if (candidate.date !== current.date) {
    return candidate.date > current.date;
  }
  return candidate.mileage > current.mileage;
}
