export type Cell = string | number | boolean | null;

export type FileKind = 'excel' | 'pdf' | 'csv';
export type TableKind = 'sheet' | 'page' | 'csv';

export interface ColumnInfo {
  index: number;
  name: string;
}

export interface ExtractedTable {
  id: string;
  label: string;
  kind: TableKind;
  location: string | null;
  headerRow: number;
  columnCount: number;
  rowCount: number;
  truncated: boolean;
  columns: ColumnInfo[];
  grid: Cell[][];
}

export interface ExtractResponse {
  uploadId: string;
  filename: string;
  kind: FileKind;
  tables: ExtractedTable[];
  warnings: string[];
}

export type ColumnType = 'number' | 'text' | 'empty';

export interface Column {
  index: number;
  name: string;
  type: ColumnType;
  filled: number;
  unique: number;
  numericRatio: number;
}

export interface ParsedTable {
  headerRow: number;
  columns: Column[];
  rows: Cell[][];
}

export type ChartType = 'bar' | 'barHorizontal' | 'line' | 'area' | 'pie' | 'donut' | 'scatter';

export type Aggregation = 'sum' | 'mean' | 'count' | 'max' | 'min';

export type SortOrder = 'none' | 'asc' | 'desc';

export interface ChartConfig {
  type: ChartType;
  xIndex: number | null;
  yIndexes: number[];
  aggregation: Aggregation;
  sort: SortOrder;
  limit: number;
}

export interface SeriesMeta {
  key: string;
  name: string;
  color: string;
}

export interface ChartDatum {
  x: string;
  xValue: number | null;
  [key: string]: string | number | null;
}
