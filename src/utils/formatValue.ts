/**
 * Format a value for display, handling nulls gracefully.
 * Returns "—" for null/undefined values.
 */
export function formatValue(
  value: number | string | null | undefined,
  formatter?: (v: number | string) => string
): string {
  if (value === null || value === undefined) return "—";
  if (formatter) return formatter(value);
  return String(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value}%`;
}

export function isNull(value: unknown): boolean {
  return value === null || value === undefined;
}
