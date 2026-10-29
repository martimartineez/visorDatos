import type { Cell, Column, ExtractedTable, ParsedTable } from '../types';
import { parseNumber } from './numbers';

const MAX_UNIQUE_SCAN = 4000;

function cellKey(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  return String(value).trim();
}

/** A partir de la grilla cruda y la fila de encabezado, arma columnas y filas. */
export function parseTable(table: ExtractedTable, headerRow: number): ParsedTable {
  const width = table.columnCount;
  const header = table.grid[headerRow] ?? [];
  const rows = table.grid.slice(headerRow + 1).filter((row) => row.some((cell) => cellKey(cell) !== ''));

  const columns: Column[] = Array.from({ length: width }, (_, index) => {
    let filled = 0;
    let numeric = 0;
    const unique = new Set<string>();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const cell = rows[rowIndex][index] ?? null;
      const key = cellKey(cell);
      if (!key) continue;
      filled += 1;
      if (rowIndex < MAX_UNIQUE_SCAN) unique.add(key);
      if (parseNumber(cell) !== null) numeric += 1;
    }

    const numericRatio = filled === 0 ? 0 : numeric / filled;
    const headerName = cellKey(header[index] ?? null) || `Columna ${index + 1}`;

    return {
      index,
      name: headerName,
      type: filled === 0 ? 'empty' : numericRatio >= 0.7 ? 'number' : 'text',
      filled,
      unique: unique.size,
      numericRatio,
    };
  });

  return { headerRow, columns, rows };
}

export function numericColumns(parsed: ParsedTable): Column[] {
  return parsed.columns.filter((column) => column.type === 'number');
}

export function isNumericColumn(parsed: ParsedTable, index: number | null): boolean {
  if (index === null) return false;
  return parsed.columns[index]?.type === 'number';
}
