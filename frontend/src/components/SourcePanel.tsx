import { tableCsvUrl } from '../api';
import { formatCell } from '../lib/numbers';
import type { ExtractResponse, ExtractedTable, TableKind } from '../types';

const KIND_LABEL: Record<TableKind, string> = {
  sheet: 'Hoja de Excel',
  page: 'Tabla de PDF',
  csv: 'CSV',
};

interface Props {
  document: ExtractResponse;
  table: ExtractedTable;
  headerRow: number;
  onHeaderRowChange: (row: number) => void;
  onTableChange: (id: string) => void;
}

function rowPreview(row: (string | number | boolean | null)[], max = 46): string {
  const cells = row
    .map((cell) => formatCell(cell))
    .filter((text) => text !== '')
    .slice(0, 4)
    .join(' · ');
  return cells.length > max ? `${cells.slice(0, max - 1)}…` : cells || '(fila vacía)';
}

export default function SourcePanel({
  document,
  table,
  headerRow,
  onHeaderRowChange,
  onTableChange,
}: Props) {
  const headerOptions = table.grid.slice(0, 12);

  return (
    <section className="card">
      <div className="file-row">
        <span className={`file-badge kind-${document.kind}`} aria-hidden="true">
          {document.kind === 'pdf' ? 'PDF' : document.kind === 'excel' ? 'XLS' : 'CSV'}
        </span>
        <div className="file-meta">
          <strong title={document.filename}>{document.filename}</strong>
          <span className="muted">
            {KIND_LABEL[table.kind]} · {document.tables.length}{' '}
            {document.tables.length === 1 ? 'tabla' : 'tablas'} detectadas
          </span>
        </div>
      </div>

      {document.tables.length > 1 && (
        <div className="field">
          <label htmlFor="table-select">Tabla</label>
          <select
            id="table-select"
            value={table.id}
            onChange={(event) => onTableChange(event.target.value)}
          >
            {document.tables.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} · {item.rowCount.toLocaleString('es-AR')} filas
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label htmlFor="header-row">Fila de encabezado</label>
        <select
          id="header-row"
          value={headerRow}
          onChange={(event) => onHeaderRowChange(Number(event.target.value))}
        >
          {headerOptions.map((row, index) => (
            <option key={index} value={index}>
              Fila {index + 1}: {rowPreview(row)}
            </option>
          ))}
        </select>
        {table.headerRow !== headerRow && (
          <p className="hint">Sugerencia detectada: fila {table.headerRow + 1}.</p>
        )}
      </div>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi-value">{table.rowCount.toLocaleString('es-AR')}</span>
          <span className="kpi-label">filas</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{table.columnCount.toLocaleString('es-AR')}</span>
          <span className="kpi-label">columnas</span>
        </div>
        <div className="kpi">
          <span className="kpi-value">{Math.max(table.rowCount - headerRow - 1, 0).toLocaleString('es-AR')}</span>
          <span className="kpi-label">con encabezado</span>
        </div>
      </div>

      {table.truncated && (
        <p className="hint warn">
          La tabla es más grande que el límite del servidor y se muestra recortada.
        </p>
      )}

      <a
        className="btn ghost small block"
        href={tableCsvUrl(document.uploadId, table.id)}
        download
      >
        Descargar tabla completa (CSV)
      </a>

      {document.warnings.length > 0 && (
        <ul className="warnings">
          {document.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
