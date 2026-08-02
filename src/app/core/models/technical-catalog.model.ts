import { MaintenancePlanItem } from './maintenance.model';
import { Procedure } from './procedure.model';
import { TechnicalSpecification } from './specification.model';
import { TechnicalClaim, TechnicalDocumentSource } from './technical-source.model';

export interface TechnicalCatalog {
  readonly sources: readonly TechnicalDocumentSource[];
  readonly claims: readonly TechnicalClaim[];
  readonly specifications: readonly TechnicalSpecification[];
  readonly procedures: readonly Procedure[];
  readonly maintenancePlan: readonly MaintenancePlanItem[];
}
