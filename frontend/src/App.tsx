import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractFile } from './api';
import ChartControls from './components/ChartControls';
import ChartView from './components/ChartView';
import DataPreview from './components/DataPreview';
import FilterPanel from './components/FilterPanel';
import SourcePanel from './components/SourcePanel';
import UploadDropzone from './components/UploadDropzone';
import { buildChartData } from './lib/chart';
import { DEFAULT_CONFIG, ensureScatterAxis, normalizeConfig } from './lib/config';
import { chartToCsv, downloadCsv } from './lib/csv';
import { applyFilters } from './lib/filters';
import { parseTable } from './lib/table';
import type { ChartConfig, ExtractResponse, Filter } from './types';

function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'grafico'
  );
}

export default function App() {
  const [document, setDocument] = useState<ExtractResponse | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [headerRow, setHeaderRow] = useState(0);
  const [config, setConfig] = useState<ChartConfig>(DEFAULT_CONFIG);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table = useMemo(
    () => document?.tables.find((item) => item.id === tableId) ?? null,
    [document, tableId],
  );

  const parsed = useMemo(() => (table ? parseTable(table, headerRow) : null), [table, headerRow]);

  const filtered = useMemo(
    () => (parsed ? { ...parsed, rows: applyFilters(parsed.rows, filters) } : null),
    [parsed, filters],
  );

  const result = useMemo(
    () => (filtered ? buildChartData(filtered, config) : { data: [], series: [], skipped: 0 }),
    [filtered, config],
  );

  useEffect(() => {
    setFilters([]);
  }, [document, tableId]);

  useEffect(() => {
    if (!parsed) return;
    setConfig((previous) => ensureScatterAxis(normalizeConfig(previous, parsed), parsed));
  }, [parsed]);

  const handleFile = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const response = await extractFile(file);
      const first = response.tables[0];
      setDocument(response);
      setTableId(first.id);
      setHeaderRow(first.headerRow);
      setConfig((previous) => ({ ...DEFAULT_CONFIG, type: previous.type }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  }, []);

  const updateConfig = useCallback(
    (patch: Partial<ChartConfig>) => {
      setConfig((previous) => {
        let next: ChartConfig = { ...previous, ...patch };
        if (parsed) next = ensureScatterAxis(next, parsed);
        if ((next.type === 'pie' || next.type === 'donut') && next.yIndexes.length > 1) {
          next = { ...next, yIndexes: next.yIndexes.slice(0, 1) };
        }
        return next;
      });
    },
    [parsed],
  );

  const handleTableChange = (id: string) => {
    const target = document?.tables.find((item) => item.id === id);
    if (!target) return;
    setTableId(id);
    setHeaderRow(target.headerRow);
    setError(null);
  };

  const reset = () => {
    setDocument(null);
    setTableId(null);
    setHeaderRow(0);
    setConfig((previous) => ({ ...DEFAULT_CONFIG, type: previous.type }));
    setError(null);
  };

  const handleDownload = () => {
    if (!parsed) return;
    const base = (document?.filename ?? 'datos').replace(/\.[^.]+$/, '');
    const xName =
      config.xIndex !== null ? parsed.columns[config.xIndex]?.name ?? 'categorias' : 'categorias';
    downloadCsv(`${base}-${config.type}-${slug(xName)}.csv`, chartToCsv(result.data, result.series));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="12" width="4.5" height="9" rx="1.2" />
              <rect x="9.8" y="6" width="4.5" height="15" rx="1.2" opacity="0.85" />
              <rect x="16.6" y="15" width="4.5" height="6" rx="1.2" opacity="0.7" />
            </svg>
          </span>
          <div className="brand-text">
            <strong>Visor de Datos</strong>
            <span>PDF · Excel · CSV → gráficos</span>
          </div>
        </div>

        <div className="topbar-actions">
          <a className="btn ghost small" href="/api/docs" target="_blank" rel="noreferrer">
            API
          </a>
          {document && (
            <button type="button" className="btn small" onClick={reset}>
              Subir otro archivo
            </button>
          )}
        </div>
      </header>

      {!document ? (
        <main className="landing">
          <div className="hero">
            <h1>Convertí tablas en gráficos</h1>
            <p>
              Subí un PDF, un Excel o un CSV. Detectamos las tablas, los encabezados y las columnas
              numéricas: filtrás filas por columna y elegís el gráfico.
            </p>
          </div>

          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}

          <UploadDropzone onFile={handleFile} busy={busy} />

          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <strong>Subí el archivo</strong>
              <p>PDF digital, .xlsx/.xlsm o .csv/.tsv. Se procesa en tu equipo.</p>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <strong>Elegí la tabla</strong>
              <p>Si hay varias hojas o tablas, seleccionás la que te interesa.</p>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <strong>Armá el gráfico</strong>
              <p>Filtrá filas por columna y elegí barras, líneas, torta, dona, área o dispersión.</p>
            </div>
          </div>
        </main>
      ) : (
        <main className="workspace">
          <aside className="sidebar">
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {table && (
              <SourcePanel
                document={document}
                table={table}
                headerRow={headerRow}
                onHeaderRowChange={setHeaderRow}
                onTableChange={handleTableChange}
              />
            )}
            {parsed && (
              <FilterPanel parsed={parsed} filters={filters} onChange={setFilters} />
            )}
            {parsed && <ChartControls parsed={parsed} config={config} onChange={updateConfig} />}
          </aside>

          <div className="content">
            {parsed && filtered && (
              <ChartView
                parsed={filtered}
                totalRows={parsed.rows.length}
                config={config}
                result={result}
                onDownload={handleDownload}
              />
            )}
            {parsed && filtered && (
              <DataPreview parsed={filtered} totalRows={parsed.rows.length} />
            )}
          </div>
        </main>
      )}

      <footer className="footer">
        Visor de Datos · los archivos se procesan localmente y no se envían a ningún servicio externo.
      </footer>
    </div>
  );
}
