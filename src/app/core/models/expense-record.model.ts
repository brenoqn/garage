export type ExpenseCategory = 'parts' | 'document' | 'parking' | 'accessory' | 'other';

export interface ExpenseRecord {
  readonly id: string;
  readonly motorcycleId: string;
  readonly date: string;
  readonly title: string;
  readonly category: ExpenseCategory;
  readonly amount: number;
  readonly mileage?: number;
  readonly notes?: string;
  readonly createdAt: string;
}

export type NewExpenseRecord = Omit<ExpenseRecord, 'id' | 'motorcycleId' | 'createdAt'>;
