export interface ServicePart {
  readonly name: string;
  readonly quantity?: number;
}

export interface ServiceRecord {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly mileage: number;
  readonly procedureSlug?: string;
  readonly procedureExecutionId?: string;
  readonly maintenancePlanId?: string;
  readonly cost?: number;
  readonly parts: readonly ServicePart[];
  readonly notes?: string;
  readonly createdAt: string;
  readonly isDemo?: boolean;
}

export type NewServiceRecord = Omit<ServiceRecord, 'id' | 'createdAt'>;
