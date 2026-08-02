import {
  FuelConsumptionEntry,
  FuelRecord,
  FuelSummary,
  NewFuelRecord,
} from '../models/fuel-record.model';

export type FuelRecordValidation =
  { readonly valid: true } | { readonly valid: false; readonly error: string };

export function validateNewFuelRecord(
  input: NewFuelRecord,
  currentMileage: number,
): FuelRecordValidation {
  if (!Number.isInteger(input.mileage) || input.mileage < 0) {
    return { valid: false, error: 'Informe uma quilometragem inteira e não negativa.' };
  }
  if (!Number.isFinite(input.liters) || input.liters <= 0) {
    return { valid: false, error: 'Informe uma quantidade de combustível maior que zero.' };
  }
  if (!Number.isFinite(input.totalCost) || input.totalCost < 0) {
    return { valid: false, error: 'Informe um custo total válido.' };
  }
  if (Number.isNaN(Date.parse(input.fueledAt))) {
    return { valid: false, error: 'Informe uma data e hora válidas.' };
  }
  if (input.mileage < currentMileage && !input.confirmedHistoricalMileage) {
    return {
      valid: false,
      error:
        'Essa leitura é inferior ao odômetro atual. Confirme que o abastecimento é histórico para continuar sem reduzir a quilometragem da moto.',
    };
  }
  return { valid: true };
}

export function calculateFuelConsumption(
  records: readonly FuelRecord[],
): readonly FuelConsumptionEntry[] {
  const chronological = [...records].sort(
    (a, b) => a.fueledAt.localeCompare(b.fueledAt) || a.createdAt.localeCompare(b.createdAt),
  );
  let previousFullTank: FuelRecord | undefined;
  let partialLiters = 0;

  return chronological.map((record) => {
    if (!record.fullTank) {
      if (previousFullTank) partialLiters += record.liters;
      return { fuelRecordId: record.id, reason: 'partial-tank' };
    }
    if (!previousFullTank) {
      previousFullTank = record;
      partialLiters = 0;
      return { fuelRecordId: record.id, reason: 'first-full-tank' };
    }

    const previous = previousFullTank;
    const intervalLiters = partialLiters + record.liters;
    previousFullTank = record;
    partialLiters = 0;
    const distanceKm = record.mileage - previous.mileage;
    if (distanceKm <= 0) {
      return {
        fuelRecordId: record.id,
        previousFuelRecordId: previous.id,
        reason: 'invalid-odometer-sequence',
      };
    }
    return {
      fuelRecordId: record.id,
      previousFuelRecordId: previous.id,
      distanceKm,
      intervalLiters,
      kmPerLiter: distanceKm / intervalLiters,
    };
  });
}

export function summarizeFuelHistory(records: readonly FuelRecord[]): FuelSummary {
  const entries = calculateFuelConsumption(records).filter(
    (entry): entry is FuelConsumptionEntry & { distanceKm: number; kmPerLiter: number } =>
      entry.distanceKm !== undefined && entry.kmPerLiter !== undefined,
  );
  const totalDistance = entries.reduce((total, entry) => total + entry.distanceKm, 0);
  const intervalLiters = entries.reduce((total, entry) => total + (entry.intervalLiters ?? 0), 0);
  return {
    totalLiters: records.reduce((total, record) => total + record.liters, 0),
    totalCost: records.reduce((total, record) => total + record.totalCost, 0),
    validIntervals: entries.length,
    averageKmPerLiter: intervalLiters > 0 ? totalDistance / intervalLiters : undefined,
    latestKmPerLiter: entries.at(-1)?.kmPerLiter,
  };
}
