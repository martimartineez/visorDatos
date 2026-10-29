import type { ChartConfig, ParsedTable } from '../types';

export const DEFAULT_CONFIG: ChartConfig = {
  type: 'bar',
  xIndex: null,
  yIndexes: [],
  aggregation: 'sum',
  sort: 'none',
  limit: 0,
};

function sameConfig(a: ChartConfig, b: ChartConfig): boolean {
  return (
    a.type === b.type &&
    a.xIndex === b.xIndex &&
    a.aggregation === b.aggregation &&
    a.sort === b.sort &&
    a.limit === b.limit &&
    a.yIndexes.length === b.yIndexes.length &&
    a.yIndexes.every((value, index) => value === b.yIndexes[index])
  );
}

/** Ajusta la configuración a las columnas realmente disponibles en la tabla. */
export function normalizeConfig(previous: ChartConfig, parsed: ParsedTable): ChartConfig {
  const { columns } = parsed;
  const numeric = columns.filter((column) => column.type === 'number');
  const filled = columns.filter((column) => column.type !== 'empty');

  let xIndex = previous.xIndex;
  if (xIndex === null || !columns[xIndex] || columns[xIndex].type === 'empty') {
    const preferred =
      filled.find((column) => column.type === 'text' && column.unique > 1) ??
      filled.find((column) => column.type === 'text') ??
      filled[0];
    xIndex = preferred ? preferred.index : null;
  }

  let yIndexes = previous.yIndexes.filter(
    (index) => columns[index]?.type === 'number' && index !== xIndex,
  );

  const numericOthers = numeric.filter((column) => column.index !== xIndex);
  if (yIndexes.length === 0 && numericOthers.length > 0) {
    yIndexes = [numericOthers[0].index];
  }
  if (previous.type === 'pie' || previous.type === 'donut') {
    yIndexes = yIndexes.slice(0, 1);
  }

  const aggregation =
    previous.aggregation !== 'count' && numeric.length === 0 ? 'count' : previous.aggregation;

  const next: ChartConfig = { ...previous, xIndex, yIndexes, aggregation };
  return sameConfig(previous, next) ? previous : next;
}

/** Para dispersión el eje X tiene que ser numérico. */
export function ensureScatterAxis(config: ChartConfig, parsed: ParsedTable): ChartConfig {
  if (config.type !== 'scatter') return config;

  const current = config.xIndex !== null ? parsed.columns[config.xIndex] : null;
  if (current?.type === 'number') return config;

  const candidate = parsed.columns.find(
    (column) => column.type === 'number' && !config.yIndexes.includes(column.index),
  );
  return candidate ? { ...config, xIndex: candidate.index } : config;
}
