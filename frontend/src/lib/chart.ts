import type {
  ChartConfig,
  ChartDatum,
  ParsedTable,
  SeriesMeta,
} from '../types';
import { formatCell, formatNumber, parseNumber } from './numbers';

export const PALETTE = [
  '#4f46e5',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#64748b',
];

export const MAX_SERIES = 4;

interface Accumulator {
  sum: number;
  count: number;
  min: number;
  max: number;
}

function emptyAccumulator(): Accumulator {
  return { sum: 0, count: 0, min: Number.POSITIVE_INFINITY, max: Number.NEGATIVE_INFINITY };
}

function reduce(acc: Accumulator, aggregation: ChartConfig['aggregation']): number | null {
  if (aggregation === 'count') return acc.count;
  if (acc.count === 0) return null;
  switch (aggregation) {
    case 'sum':
      return acc.sum;
    case 'mean':
      return acc.sum / acc.count;
    case 'max':
      return acc.max;
    case 'min':
      return acc.min;
    default:
      return null;
  }
}

export interface ChartBuildResult {
  data: ChartDatum[];
  series: SeriesMeta[];
  skipped: number;
}

export function buildChartData(parsed: ParsedTable, config: ChartConfig): ChartBuildResult {
  const { xIndex, aggregation, type } = config;
  const empty: ChartBuildResult = { data: [], series: [], skipped: 0 };
  if (xIndex === null) return empty;

  const singleSeries = type === 'pie' || type === 'donut';
  const counting = aggregation === 'count';

  const yIndexes = counting
    ? []
    : (singleSeries ? config.yIndexes.slice(0, 1) : config.yIndexes.slice(0, MAX_SERIES));

  if (!counting && yIndexes.length === 0) return empty;

  const series: SeriesMeta[] = counting
    ? [{ key: 'value', name: 'Cantidad', color: PALETTE[0] }]
    : yIndexes.map((columnIndex, position) => ({
        key: singleSeries ? 'value' : `y${position}`,
        name: parsed.columns[columnIndex]?.name ?? `Serie ${position + 1}`,
        color: PALETTE[position % PALETTE.length],
      }));

  // Dispersión: un punto por fila, sin agrupar.
  if (type === 'scatter') {
    const data: ChartDatum[] = [];
    let skipped = 0;
    for (const row of parsed.rows) {
      const xValue = parseNumber(row[xIndex] ?? null);
      if (xValue === null) {
        skipped += 1;
        continue;
      }
      const datum: ChartDatum = { x: formatNumber(xValue), xValue };
      yIndexes.forEach((columnIndex, position) => {
        const value = parseNumber(row[columnIndex] ?? null);
        datum[`y${position}`] = value;
      });
      data.push(datum);
    }
    return { data, series, skipped };
  }

  interface Group {
    label: string;
    accs: Accumulator[];
    count: number;
  }

  const groups = new Map<string, Group>();
  let skipped = 0;

  for (const row of parsed.rows) {
    const rawX = row[xIndex] ?? null;
    const numericX = parseNumber(rawX);
    const label = formatCell(rawX);
    if (numericX === null && !label) {
      skipped += 1;
      continue;
    }

    const values = counting ? [] : yIndexes.map((columnIndex) => parseNumber(row[columnIndex] ?? null));
    if (!counting && values.every((value) => value === null)) {
      skipped += 1;
      continue;
    }

    const key = numericX !== null ? `n:${numericX}` : `s:${label.toLowerCase()}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        label,
        accs: yIndexes.map(() => emptyAccumulator()),
        count: 0,
      };
      groups.set(key, group);
    }

    group.count += 1;

    if (counting) continue;

    values.forEach((value, position) => {
      if (value === null) return;
      const acc = group!.accs[position];
      acc.sum += value;
      acc.count += 1;
      if (value < acc.min) acc.min = value;
      if (value > acc.max) acc.max = value;
    });
  }

  const valueKey = series[0]?.key ?? 'value';

  let data: ChartDatum[] = Array.from(groups.values()).map((group) => {
    const datum: ChartDatum = {
      x: group.label,
      xValue: Number.parseFloat(group.label.replace(/[^\d.-]/g, '')) || null,
    };
    if (counting) {
      datum.value = group.count;
    } else {
      group.accs.forEach((acc, position) => {
        datum[series[position].key] = reduce(acc, aggregation);
      });
    }
    return datum;
  });

  if (config.sort !== 'none') {
    const direction = config.sort === 'asc' ? 1 : -1;
    data.sort((a, b) => {
      const first = (a[valueKey] as number | null) ?? Number.NEGATIVE_INFINITY;
      const second = (b[valueKey] as number | null) ?? Number.NEGATIVE_INFINITY;
      return (first - second) * direction;
    });
  }

  if (config.limit > 0) {
    data = data.slice(0, config.limit);
  }

  return { data, series, skipped };
}

export function chartHasData(result: ChartBuildResult): boolean {
  return result.data.some((datum) =>
    result.series.some((meta) => typeof datum[meta.key] === 'number'),
  );
}
