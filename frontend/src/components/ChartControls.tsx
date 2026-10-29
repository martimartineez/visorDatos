import type { ChartConfig, ChartType, ParsedTable } from '../types';
import ChartIcon from './ChartIcon';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Barras' },
  { value: 'barHorizontal', label: 'Barras H' },
  { value: 'line', label: 'Líneas' },
  { value: 'area', label: 'Área' },
  { value: 'pie', label: 'Torta' },
  { value: 'donut', label: 'Dona' },
  { value: 'scatter', label: 'Dispersión' },
];

const AGGREGATIONS: { value: ChartConfig['aggregation']; label: string }[] = [
  { value: 'sum', label: 'Suma' },
  { value: 'mean', label: 'Promedio' },
  { value: 'count', label: 'Conteo de filas' },
  { value: 'max', label: 'Máximo' },
  { value: 'min', label: 'Mínimo' },
];

const LIMITS = [
  { value: 0, label: 'Todas las categorías' },
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
  { value: 50, label: 'Top 50' },
];

const SORTS: { value: ChartConfig['sort']; label: string }[] = [
  { value: 'none', label: 'Orden del archivo' },
  { value: 'desc', label: 'Mayor a menor' },
  { value: 'asc', label: 'Menor a mayor' },
];

interface Props {
  parsed: ParsedTable;
  config: ChartConfig;
  onChange: (patch: Partial<ChartConfig>) => void;
}

export default function ChartControls({ parsed, config, onChange }: Props) {
  const numeric = parsed.columns.filter((column) => column.type === 'number');
  const counting = config.aggregation === 'count';
  const singleSeries = config.type === 'pie' || config.type === 'donut';
  const xColumn = config.xIndex !== null ? parsed.columns[config.xIndex] : null;
  const maxSeries = singleSeries ? 1 : 4;

  const toggleY = (index: number) => {
    const selected = config.yIndexes.includes(index);
    if (selected) {
      if (config.yIndexes.length === 1) return;
      onChange({ yIndexes: config.yIndexes.filter((value) => value !== index) });
      return;
    }
    const next = singleSeries ? [index] : [...config.yIndexes, index].slice(-maxSeries);
    onChange({ yIndexes: next });
  };

  return (
    <section className="card">
      <h2 className="card-title">Gráfico</h2>

      <div className="segmented" role="group" aria-label="Tipo de gráfico">
        {CHART_TYPES.map((item) => (
          <button
            key={item.value}
            type="button"
            className="segmented-item"
            aria-pressed={config.type === item.value}
            onClick={() => onChange({ type: item.value })}
            title={item.label}
          >
            <ChartIcon type={item.value} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="x-axis">Categoría (eje X)</label>
        <select
          id="x-axis"
          value={config.xIndex ?? ''}
          onChange={(event) => onChange({ xIndex: Number(event.target.value) })}
        >
          {parsed.columns.map((column) => (
            <option key={column.index} value={column.index}>
              {column.name}
              {column.type === 'number' ? ' · numérica' : ''}
            </option>
          ))}
        </select>
        {xColumn && xColumn.unique > 40 && config.limit === 0 && (
          <p className="hint">
            «{xColumn.name}» tiene {xColumn.unique.toLocaleString('es-AR')} valores distintos. Probá
            limitar a «Top 10».
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="aggregation">Agregación</label>
        <select
          id="aggregation"
          value={config.aggregation}
          onChange={(event) =>
            onChange({ aggregation: event.target.value as ChartConfig['aggregation'] })
          }
        >
          {AGGREGATIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {counting ? (
        <p className="hint">
          Cada categoría muestra cuántas filas tiene, sin necesidad de una columna numérica.
        </p>
      ) : numeric.length === 0 ? (
        <p className="hint warn">
          No hay columnas numéricas detectadas. Cambiá la agregación a «Conteo de filas».
        </p>
      ) : (
        <div className="field">
          <label htmlFor="y-values">
            Valores (eje Y){singleSeries ? ' · una sola serie' : ` · hasta ${maxSeries}`}
          </label>
          <div className="chips" id="y-values">
            {numeric.map((column) => {
              const active = config.yIndexes.includes(column.index);
              return (
                <button
                  key={column.index}
                  type="button"
                  className="chip"
                  aria-pressed={active}
                  onClick={() => toggleY(column.index)}
                  title={column.name}
                >
                  {column.name}
                </button>
              );
            })}
          </div>
          {singleSeries && config.yIndexes.length > 1 && (
            <p className="hint">La torta y la dona usan la primera serie seleccionada.</p>
          )}
        </div>
      )}

      {config.type !== 'scatter' && (
        <>
          <div className="field">
            <label htmlFor="sort">Orden</label>
            <select
              id="sort"
              value={config.sort}
              onChange={(event) => onChange({ sort: event.target.value as ChartConfig['sort'] })}
            >
              {SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="limit">Mostrar</label>
            <select
              id="limit"
              value={config.limit}
              onChange={(event) => onChange({ limit: Number(event.target.value) })}
            >
              {LIMITS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </section>
  );
}
