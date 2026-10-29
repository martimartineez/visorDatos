import type { Cell, Filter, ParsedTable } from '../types';
import { formatCell, formatNumber, parseNumber } from './numbers';

/** Clave canónica de una celda, para comparar valores entre filas. */
export function cellKey(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

export interface DistinctValue {
  key: string;
  label: string;
  count: number;
}

export interface DistinctResult {
  values: DistinctValue[];
  total: number;
}

export function distinctValues(
  parsed: ParsedTable,
  columnIndex: number,
  limit = 400,
): DistinctResult {
  const map = new Map<string, DistinctValue>();

  for (const row of parsed.rows) {
    const value = row[columnIndex] ?? null;
    const key = cellKey(value);
    if (!key) continue;

    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { key, label: formatCell(value), count: 1 });
    }
  }

  const values = [...map.values()].sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { numeric: true }),
  );

  return { values: values.slice(0, limit), total: values.length };
}

/** Un filtro sin condiciones no debe afectar el resultado. */
export function isFilterActive(filter: Filter): boolean {
  if (filter.kind === 'range') return filter.min !== null || filter.max !== null;
  return filter.excluded.length > 0;
}

export function activeFilterCount(filters: Filter[]): number {
  return filters.filter(isFilterActive).length;
}

export function applyFilters(rows: Cell[][], filters: Filter[]): Cell[][] {
  const active = filters.filter(isFilterActive);
  if (active.length === 0) return rows;

  return rows.filter((row) =>
    active.every((filter) => {
      const value = row[filter.column] ?? null;

      if (filter.kind === 'values') {
        return !filter.excluded.includes(cellKey(value));
      }

      const number = parseNumber(value);
      if (number === null) return false;
      if (filter.min !== null && number < filter.min) return false;
      if (filter.max !== null && number > filter.max) return false;
      return true;
    }),
  );
}

export function describeFilter(filter: Filter, parsed: ParsedTable): string {
  const name = parsed.columns[filter.column]?.name ?? 'Columna';

  if (filter.kind === 'values') {
    return `${name}: ${filter.excluded.length} valor(es) excluido(s)`;
  }

  if (filter.min !== null && filter.max !== null) {
    return `${name}: ${formatNumber(filter.min)} – ${formatNumber(filter.max)}`;
  }
  if (filter.min !== null) return `${name}: ≥ ${formatNumber(filter.min)}`;
  return `${name}: ≤ ${formatNumber(filter.max ?? 0)}`;
}
