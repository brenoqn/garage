import type { QueryResultRow } from 'pg';

export function instant(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  throw new Error('Invalid timestamp from PostgreSQL');
}

export function civilDate(value: unknown): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    // node-postgres materializes DATE at local midnight; UTC can shift the day.
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  throw new Error('Invalid date from PostgreSQL');
}

export function safeInteger(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Unsafe integer from PostgreSQL');
  return number;
}

export function decimal(value: unknown): number {
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value)) {
    throw new Error('Invalid decimal from PostgreSQL');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER) {
    throw new Error('Invalid decimal from PostgreSQL');
  }
  // The domain contract is number. Reject database values that number would round silently.
  const normalize = (input: string): string => {
    const [mantissa, power = '0'] = input.toLowerCase().split('e');
    const [whole, fraction = ''] = mantissa!.replace(/^-/, '').split('.');
    const digits = `${whole}${fraction}`.replace(/^0+/, '').replace(/0+$/, '') || '0';
    const exponent =
      Number(power) -
      fraction.length +
      `${whole}${fraction}`.length -
      `${whole}${fraction}`.replace(/0+$/, '').length;
    return `${mantissa!.startsWith('-') && digits !== '0' ? '-' : ''}${digits}e${exponent}`;
  };
  if (normalize(value) !== normalize(String(number))) {
    throw new Error('Decimal precision exceeds Garage number contract');
  }
  return number;
}

export function ids(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || !item.trim()) ||
    new Set(value).size !== value.length
  ) {
    throw new Error('Invalid identifier array from PostgreSQL');
  }
  return value as string[];
}

export function optional<T>(value: unknown, convert: (input: unknown) => T): T | undefined {
  return value === null || value === undefined ? undefined : convert(value);
}

export function text(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid text from PostgreSQL');
  return value;
}

export function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new Error('Invalid boolean from PostgreSQL');
  return value;
}

export function row(result: readonly QueryResultRow[]): QueryResultRow {
  const first = result[0];
  if (!first) throw new Error('Expected PostgreSQL row');
  return first;
}
