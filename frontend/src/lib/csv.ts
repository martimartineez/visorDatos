import type { ChartDatum, SeriesMeta } from '../types';
import { formatNumber } from './numbers';

function escapeCell(value: string | number | null): string {
  if (value === null) return '';
  const text = typeof value === 'number' ? formatNumber(value) : value;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV (separador ; para que Excel en español lo abra en columnas). */
export function chartToCsv(data: ChartDatum[], series: SeriesMeta[]): string {
  const header = ['Categoría', ...series.map((meta) => meta.name)];
  const lines = [header.map(escapeCell).join(';')];

  for (const datum of data) {
    const cells = [escapeCell(datum.x)];
    for (const meta of series) {
      const value = datum[meta.key];
      cells.push(escapeCell(typeof value === 'number' ? value : null));
    }
    lines.push(cells.join(';'));
  }

  return lines.join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
