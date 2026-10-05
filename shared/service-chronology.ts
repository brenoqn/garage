import { MaintenanceExecution } from './garage';
import { ServiceRecord } from './garage';

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
