export type SafetyCheckItemStatus = 'ok' | 'issue';

export interface SafetyCheckItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly sourceId: string;
  readonly page: number;
  readonly section: string;
}

export interface SafetyCheckResponse {
  readonly itemId: string;
  readonly status: SafetyCheckItemStatus;
}

export interface SafetyCheckRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly checkedAt: string;
  readonly responses: readonly SafetyCheckResponse[];
  readonly notes?: string;
  readonly createdAt: string;
}

export type NewSafetyCheckRecord = Omit<SafetyCheckRecord, 'id' | 'motorcycleId' | 'createdAt'>;
