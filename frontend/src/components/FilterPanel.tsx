import { useMemo, useState } from 'react';
import { distinctValues } from '../lib/filters';
import { formatNumber, parseNumber } from '../lib/numbers';
import type { Filter, ParsedTable, RangeFilter, ValueFilter } from '../types';

interface Props {
  parsed: ParsedTable;
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
}

function newId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function ValuesBody({
  parsed,
  filter,
  onChange,
}: {
  parsed: ParsedTable;
  filter: ValueFilter;
  onChange: (filter: ValueFilter) => void;
}) {
  const [search, setSearch] = useState('');
  const { values, total } = useMemo(
    () => distinctValues(parsed, filter.column),
    [parsed, filter.column],
  );

  const term = search.trim().toLowerCase();
  const shown = term ? values.filter((item) => item.label.toLowerCase().includes(term)) : values;
  const excluded = new Set(filter.excluded);

  const toggle = (key: string) => {
    const next = excluded.has(key)
      ? filter.excluded.filter((item) => item !== key)
      : [...filter.excluded, key];
    onChange({ ...filter, excluded: next });
  };

  return (
    <div className="filter-body">
      <input
        type="search"
        placeholder="Buscar valor…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="filter-search"
      />

      <ul className="check-list">
        {shown.map((item) => {
          const checked = !excluded.has(item.key);
          return (
            <li key={item.key}>
              <label>
                <input type="checkbox" checked={checked} onChange={() => toggle(item.key)} />
                <span className="check-label" title={item.label}>
                  {item.label}
                </span>
                <span className="check-count">{item.count.toLocaleString('es-AR')}</span>
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="check-empty">Sin coincidencias</li>}
      </ul>

      <div className="filter-foot">
        <span>
          {values.length - filter.excluded.length} de {values.length}
          {total > values.length && ` (${total.toLocaleString('es-AR')} en total)`}
        </span>
        <div className="filter-actions">
          <button type="button" className="link-btn" onClick={() => onChange({ ...filter, excluded: [] })}>
            Todos
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => onChange({ ...filter, excluded: values.map((item) => item.key) })}
          >
            Ninguno
          </button>
        </div>
      </div>
    </div>
  );
}

function RangeBody({
  parsed,
  filter,
  onChange,
}: {
  parsed: ParsedTable;
  filter: RangeFilter;
  onChange: (filter: RangeFilter) => void;
}) {
  const bounds = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const row of parsed.rows) {
      const number = parseNumber(row[filter.column] ?? null);
      if (number === null) continue;
      if (number < min) min = number;
      if (number > max) max = number;
    }
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
    };
  }, [parsed, filter.column]);

  const update = (patch: Partial<RangeFilter>) => onChange({ ...filter, ...patch });

  const toNumber = (raw: string): number | null => {
    const text = raw.trim();
    if (!text) return null;
    const value = Number(text.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
  };

  return (
    <div className="filter-body">
      <div className="range-grid">
        <label>
          Mínimo
          <input
            type="number"
            step="any"
            inputMode="decimal"
            placeholder={bounds.min !== null ? formatNumber(bounds.min) : '—'}
            value={filter.min ?? ''}
            onChange={(event) => update({ min: toNumber(event.target.value) })}
          />
        </label>
        <label>
          Máximo
          <input
            type="number"
            step="any"
            inputMode="decimal"
            placeholder={bounds.max !== null ? formatNumber(bounds.max) : '—'}
            value={filter.max ?? ''}
            onChange={(event) => update({ max: toNumber(event.target.value) })}
          />
        </label>
      </div>
      <div className="filter-foot">
        <span>Dejá un campo vacío para no limitar ese extremo.</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => update({ min: null, max: null })}
          disabled={filter.min === null && filter.max === null}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}

export default function FilterPanel({ parsed, filters, onChange }: Props) {
  const available = parsed.columns.filter((column) => column.type !== 'empty');
  const active = filters.filter((filter) =>
    filter.kind === 'range' ? filter.min !== null || filter.max !== null : filter.excluded.length > 0,
  ).length;

  const addFilter = (columnIndex: number) => {
    const column = parsed.columns[columnIndex];
    if (!column) return;
    const filter: Filter =
      column.type === 'number'
        ? { id: newId(), column: columnIndex, kind: 'range', min: null, max: null }
        : { id: newId(), column: columnIndex, kind: 'values', excluded: [] };
    onChange([...filters, filter]);
  };

  const replace = (updated: Filter) => {
    onChange(filters.map((filter) => (filter.id === updated.id ? updated : filter)));
  };

  return (
    <section className="card">
      <div className="panel-head">
        <h2 className="card-title">
          Filtros
          {active > 0 && <span className="badge">{active}</span>}
        </h2>
        {filters.length > 0 && (
          <button type="button" className="link-btn" onClick={() => onChange([])}>
            Limpiar todo
          </button>
        )}
      </div>

      {filters.map((filter) => {
        const column = parsed.columns[filter.column];
        const isActive =
          filter.kind === 'range'
            ? filter.min !== null || filter.max !== null
            : filter.excluded.length > 0;

        return (
          <div key={filter.id} className={`filter-item${isActive ? ' is-active' : ''}`}>
            <div className="filter-item-head">
              <strong title={column?.name}>{column?.name ?? 'Columna'}</strong>
              <button
                type="button"
                className="delete-btn"
                aria-label={`Quitar filtro de ${column?.name ?? 'columna'}`}
                onClick={() => onChange(filters.filter((item) => item.id !== filter.id))}
              >
                ×
              </button>
            </div>

            {filter.kind === 'values' ? (
              <ValuesBody parsed={parsed} filter={filter} onChange={replace} />
            ) : (
              <RangeBody parsed={parsed} filter={filter} onChange={replace} />
            )}
          </div>
        );
      })}

      <div className="field no-margin">
        <label htmlFor="add-filter">Agregar filtro</label>
        <select
          id="add-filter"
          value=""
          onChange={(event) => {
            if (event.target.value === '') return;
            addFilter(Number(event.target.value));
            event.target.value = '';
          }}
        >
          <option value="">Elegí una columna…</option>
          {available.map((column) => (
            <option key={column.index} value={column.index}>
              {column.name}
              {column.type === 'number' ? ' · numérica' : ''}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
