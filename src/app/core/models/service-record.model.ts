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
  readonly maintenancePlanId?: string;
  readonly cost?: number;
  readonly parts: readonly ServicePart[];
  readonly notes?: string;
  readonly createdAt: string;
}

export type NewServiceRecord = Omit<ServiceRecord, 'id' | 'createdAt'>;
