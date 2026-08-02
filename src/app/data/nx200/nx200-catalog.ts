import { TechnicalCatalog } from '../../core/models/technical-catalog.model';
import { NX200_TECHNICAL_CLAIMS } from './claims/nx200-claims.data';
import { NX200_MAINTENANCE_PLAN } from './maintenance-plan/nx200-maintenance-plan.data';
import { NX200_PROCEDURES } from './procedures/nx200-procedures.data';
import { NX200_TECHNICAL_SOURCES } from './sources/nx200-sources.data';
import { NX200_SPECIFICATIONS } from './specifications/nx200-specifications.data';

export const NX200_TECHNICAL_CATALOG: TechnicalCatalog = {
  sources: NX200_TECHNICAL_SOURCES,
  claims: NX200_TECHNICAL_CLAIMS,
  specifications: NX200_SPECIFICATIONS,
  procedures: NX200_PROCEDURES,
  maintenancePlan: NX200_MAINTENANCE_PLAN,
};

export {
  NX200_MAINTENANCE_PLAN,
  NX200_PROCEDURES,
  NX200_SPECIFICATIONS,
  NX200_TECHNICAL_CLAIMS,
  NX200_TECHNICAL_SOURCES,
};
