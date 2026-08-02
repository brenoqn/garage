export type OccurrenceSeverity = 'note' | 'attention' | 'stop';

export interface OccurrenceRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly occurredAt: string;
  readonly mileage: number;
  readonly title: string;
  readonly severity: OccurrenceSeverity;
  readonly notes?: string;
  readonly createdAt: string;
}

export type NewOccurrenceRecord = Omit<OccurrenceRecord, 'id' | 'motorcycleId' | 'createdAt'>;
