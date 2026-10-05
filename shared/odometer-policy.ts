import { OdometerUpdateRequest, OdometerUpdateResult } from './garage';

export function evaluateOdometerUpdate(
  currentMileage: number,
  request: OdometerUpdateRequest,
): OdometerUpdateResult {
  if (
    !Number.isFinite(request.mileage) ||
    request.mileage < 0 ||
    !Number.isInteger(request.mileage)
  ) {
    return {
      status: 'blocked',
      previousMileage: currentMileage,
      requestedMileage: request.mileage,
      impact: 'Informe uma quilometragem inteira e não negativa.',
    };
  }

  if (request.mileage < currentMileage && !request.confirmedRegression) {
    return {
      status: 'confirmation-required',
      previousMileage: currentMileage,
      requestedMileage: request.mileage,
      impact:
        'A leitura atual será reduzida. O histórico existente será preservado e a ocorrência ficará registrada como correção.',
    };
  }

  if (
    request.mileage < currentMileage &&
    request.source !== 'correction' &&
    request.source !== 'panel-replacement'
  ) {
    return {
      status: 'blocked',
      previousMileage: currentMileage,
      requestedMileage: request.mileage,
      impact: 'Classifique a redução como correção ou troca do painel.',
    };
  }

  return {
    status: 'updated',
    previousMileage: currentMileage,
    requestedMileage: request.mileage,
  };
}
