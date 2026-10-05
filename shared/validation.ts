import type { GarageErrorCode } from './garage';

export class GarageError extends Error {
  constructor(
    readonly code: GarageErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function fail(message: string, code: GarageErrorCode = 'VALIDATION', status = 400): never {
  throw new GarageError(code, message, status);
}

export function object(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail('Expected an object');
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key))) {
    return fail('Unknown or forbidden field');
  }
  return record;
}

export function string(value: unknown, name: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    return fail(`Invalid ${name}`);
  }
  return value.trim();
}

export function optionalString(value: unknown, name: string, max = 4000): string | undefined {
  return value === undefined ? undefined : string(value, name, max);
}

export function integer(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) return fail(`Invalid ${name}`);
  return value as number;
}

export function amount(value: unknown, name: string, positive = false): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value > Number.MAX_SAFE_INTEGER ||
    value < 0 ||
    (positive && value === 0)
  ) {
    return fail(`Invalid ${name}`);
  }
  return value;
}

export function boolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') return fail(`Invalid ${name}`);
  return value;
}

export function choice<T extends string>(value: unknown, name: string, options: readonly T[]): T {
  if (typeof value !== 'string' || !options.includes(value as T)) return fail(`Invalid ${name}`);
  return value as T;
}

export function date(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return fail(`Invalid ${name}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return fail(`Invalid ${name}`);
  }
  return value;
}

export function timestamp(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value))
    return fail(`Invalid ${name}`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || !/[Zz]|[+-]\d\d:\d\d$/.test(value)) {
    return fail(`Invalid ${name}`);
  }
  return parsed.toISOString();
}

export function strings(value: unknown, name: string): string[] {
  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    value.some((item) => typeof item !== 'string' || !item.trim())
  ) {
    return fail(`Invalid ${name}`);
  }
  if (new Set(value).size !== value.length) return fail(`Duplicate ${name}`);
  return value as string[];
}

export function revision(value: unknown): number {
  if (typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value))
    return fail('Invalid expectedRevision');
  return integer(Number(value), 'expectedRevision');
}
