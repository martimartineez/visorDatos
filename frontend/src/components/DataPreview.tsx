import { formatCell } from '../lib/numbers';
import type { ParsedTable } from '../types';

const PREVIEW_ROWS = 30;

interface Props {
  parsed: ParsedTable;
  totalRows: number;
}

export default function DataPreview({ parsed, totalRows }: Props) {
  const rows = parsed.rows.slice(0, PREVIEW_ROWS);

  return (
    <section className="card">
      <div className="preview-head">
        <h2 className="card-title">Vista previa</h2>
        <span className="muted">
          {rows.length < parsed.rows.length && `${rows.length} de `}
          {parsed.rows.length.toLocaleString('es-AR')} filas
          {parsed.rows.length !== totalRows &&
            ` · filtradas de ${totalRows.toLocaleString('es-AR')}`}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="hint">
          La tabla no tiene filas debajo del encabezado. Probá elegir otra fila de encabezado.
        </p>
      ) : (
        <div className="preview-wrap">
          <table className="preview">
            <thead>
              <tr>
                {parsed.columns.map((column) => (
                  <th key={column.index} title={`${column.name} · ${column.unique} valores distintos`}>
                    <span className={`type-dot ${column.type}`} aria-hidden="true" />
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {parsed.columns.map((column) => {
                    const text = formatCell(row[column.index] ?? null);
                    return (
                      <td key={column.index} title={text}>
                        {text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="hint legend-hint">
        <span className="type-dot number" aria-hidden="true" /> numérica
        <span className="type-dot text" aria-hidden="true" /> texto
        <span className="type-dot empty" aria-hidden="true" /> vacía
      </p>
    </section>
  );
}
