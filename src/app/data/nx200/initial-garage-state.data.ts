import { GarageState } from '../../core/models/garage-state.model';
import { NX200_MAINTENANCE_PLAN } from './maintenance-plan/nx200-maintenance-plan.data';

/**
 * Estado de primeiro uso. Não contém serviços, execuções nem quilometragem inventados:
 * a moto só passa a ter dados depois da configuração inicial confirmada pelo usuário.
 */
export const INITIAL_GARAGE_STATE: GarageState = {
  schemaVersion: 5,
  motorcycle: {
    id: 'nx200-primary',
    manufacturer: 'Honda',
    model: 'NX200',
    nickname: 'Minha NX200',
    year: 1997,
    currentMileage: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  maintenancePlan: NX200_MAINTENANCE_PLAN,
  serviceHistory: [],
  odometerHistory: [],
  procedureExecutions: [],
  fuelHistory: [],
  expenseHistory: [],
  occurrenceHistory: [],
  safetyCheckHistory: [],
  settings: { maintenanceAlertsEnabled: true, theme: 'dark' },
  setup: { completed: false, demoData: false },
};
