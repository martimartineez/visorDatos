import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartBuildResult } from '../lib/chart';
import { PALETTE, chartHasData } from '../lib/chart';
import { formatCompact, formatNumber } from '../lib/numbers';
import { usePrefersDark } from '../lib/theme';
import type { ChartConfig, ParsedTable } from '../types';

const AGG_LABEL: Record<ChartConfig['aggregation'], string> = {
  sum: 'Suma',
  mean: 'Promedio',
  count: 'Conteo',
  max: 'Máximo',
  min: 'Mínimo',
};

interface Props {
  parsed: ParsedTable;
  totalRows: number;
  config: ChartConfig;
  result: ChartBuildResult;
  onDownload: () => void;
}

function truncate(text: string, max = 18): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function ChartView({ parsed, totalRows, config, result, onDownload }: Props) {
  const dark = usePrefersDark();
  const theme = dark
    ? { grid: '#2b3445', axis: '#9aa7bd', surface: '#111826', text: '#e8edf7', tooltipBg: '#151d2c', tooltipBorder: '#2b3445' }
    : { grid: '#e6e9ef', axis: '#64748b', surface: '#ffffff', text: '#111827', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0' };

  const { data, series } = result;
  const xName = config.xIndex !== null ? parsed.columns[config.xIndex]?.name ?? '—' : '—';
  const seriesNames = series.map((meta) => meta.name).join(' y ');

  const title =
    config.aggregation === 'count'
      ? `Conteo de filas por ${xName}`
      : `${AGG_LABEL[config.aggregation]} de ${seriesNames || '—'} por ${xName}`;

  const hasData = chartHasData(result);
  const pieTotal = data.reduce((sum, datum) => {
    const value = datum.value;
    return typeof value === 'number' ? sum + value : sum;
  }, 0);

  const tooltip = {
    contentStyle: {
      background: theme.tooltipBg,
      border: `1px solid ${theme.tooltipBorder}`,
      borderRadius: 10,
      fontSize: 12,
      color: theme.text,
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
    },
    labelStyle: { color: theme.axis, fontSize: 11.5, marginBottom: 4 },
    itemStyle: { color: theme.text, fontSize: 12 },
    formatter: (value: unknown) => formatNumber(Number(value)),
    cursor: { fill: dark ? 'rgba(148,163,184,0.08)' : 'rgba(79,70,229,0.06)' },
  };

  const legend = (
    <Legend
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 12, paddingTop: 10, color: theme.axis }}
    />
  );

  const tickStyle = { fontSize: 11.5, fill: theme.axis };
  const rotated = data.length > 8;

  const categoryAxis = (
    <XAxis
      dataKey="x"
      tick={tickStyle}
      tickLine={false}
      axisLine={{ stroke: theme.grid }}
      interval={0}
      angle={rotated ? -32 : 0}
      textAnchor={rotated ? 'end' : 'middle'}
      height={rotated ? 78 : 30}
      tickFormatter={(value: unknown) => truncate(String(value))}
    />
  );

  const valueAxis = (
    <YAxis
      tick={tickStyle}
      tickLine={false}
      axisLine={false}
      width={58}
      tickFormatter={(value: unknown) => formatCompact(Number(value))}
    />
  );

  const renderChart = () => {
    switch (config.type) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            {categoryAxis}
            {valueAxis}
            <Tooltip {...tooltip} />
            {legend}
            {series.map((meta) => (
              <Bar
                key={meta.key}
                dataKey={meta.key}
                name={meta.name}
                fill={meta.color}
                radius={[6, 6, 0, 0]}
                maxBarSize={64}
              />
            ))}
          </BarChart>
        );

      case 'barHorizontal':
        return (
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
          >
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={tickStyle}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              tickFormatter={(value: unknown) => formatCompact(Number(value))}
            />
            <YAxis
              type="category"
              dataKey="x"
              width={118}
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: unknown) => truncate(String(value), 16)}
            />
            <Tooltip {...tooltip} />
            {legend}
            {series.map((meta) => (
              <Bar
                key={meta.key}
                dataKey={meta.key}
                name={meta.name}
                fill={meta.color}
                radius={[0, 6, 6, 0]}
                maxBarSize={44}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            {categoryAxis}
            {valueAxis}
            <Tooltip {...tooltip} />
            {legend}
            {series.map((meta) => (
              <Line
                key={meta.key}
                type="monotone"
                dataKey={meta.key}
                name={meta.name}
                stroke={meta.color}
                strokeWidth={2.4}
                dot={{ r: 2.5, strokeWidth: 0, fill: meta.color }}
                activeDot={{ r: 4.5 }}
                connectNulls
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              {series.map((meta) => (
                <linearGradient key={meta.key} id={`area-${meta.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" vertical={false} />
            {categoryAxis}
            {valueAxis}
            <Tooltip {...tooltip} />
            {legend}
            {series.map((meta) => (
              <Area
                key={meta.key}
                type="monotone"
                dataKey={meta.key}
                name={meta.name}
                stroke={meta.color}
                strokeWidth={2.2}
                fill={`url(#area-${meta.key})`}
                connectNulls
              />
            ))}
          </AreaChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <Tooltip {...tooltip} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="x"
              innerRadius={config.type === 'donut' ? '58%' : 0}
              outerRadius="78%"
              paddingAngle={config.type === 'donut' ? 1.5 : 0.6}
              stroke={theme.surface}
              strokeWidth={1.5}
            >
              {data.map((datum, index) => (
                <Cell key={String(datum.x)} fill={PALETTE[index % PALETTE.length]} />
              ))}
            </Pie>
            {legend}
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="xValue"
              name={xName}
              tick={tickStyle}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              tickFormatter={(value: unknown) => formatCompact(Number(value))}
            />
            <YAxis
              type="number"
              tick={tickStyle}
              tickLine={false}
              axisLine={false}
              width={58}
              tickFormatter={(value: unknown) => formatCompact(Number(value))}
            />
            <Tooltip {...tooltip} />
            {legend}
            {series.map((meta) => (
              <Scatter
                key={meta.key}
                data={data}
                dataKey={meta.key}
                name={meta.name}
                fill={meta.color}
                fillOpacity={0.75}
              />
            ))}
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  return (
    <section className="card chart-card">
      <div className="chart-head">
        <div>
          <h2 className="chart-title">{title}</h2>
          <p className="chart-sub">
            {data.length.toLocaleString('es-AR')} categorías ·{' '}
            {parsed.rows.length.toLocaleString('es-AR')}
            {parsed.rows.length !== totalRows &&
              ` de ${totalRows.toLocaleString('es-AR')} filas (filtradas)`}
            {parsed.rows.length === totalRows && ' filas analizadas'}
            {result.skipped > 0 && ` · ${result.skipped.toLocaleString('es-AR')} con datos incompletos`}
          </p>
        </div>
        <button type="button" className="btn ghost small" onClick={onDownload} disabled={!hasData}>
          Descargar CSV
        </button>
      </div>

      <div className="chart-area">
        {hasData ? (
          <div className="chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart() ?? <div />}
            </ResponsiveContainer>
            {config.type === 'donut' && (
              <div className="donut-total" aria-hidden="true">
                <span>Total</span>
                <strong>{formatCompact(pieTotal)}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="empty">
            <strong>Sin datos para graficar</strong>
            <span>
              Revisá la columna del eje X y los valores del eje Y, o cambiá la agregación a
              «Conteo de filas».
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
