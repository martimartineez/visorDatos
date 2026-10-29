import type { Cell } from '../types';

const THOUSANDS_ONLY = /^-?\d{1,3}(\.\d{3})+$/;
const DECIMAL_COMMA = /^-?\d{1,3}(\.\d{3})*,\d+$/;

/**
 * Convierte texto numérico "humano" a número: acepta 1.234,56 · 1,234.56 ·
 * $ 1.234 · 12 % · (123) como negativo.
 */
export function parseNumber(value: Cell): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string') return null;

  let text = value.trim();
  if (!text) return null;

  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  text = text.replace(/\s|\u00a0/g, '').replace(/[%$€£]/g, '');
  if (!text) return null;

  if (text.startsWith('-')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  if (!/^[\d.,]+$/.test(text)) return null;

  let normalized: string;
  if (DECIMAL_COMMA.test(text)) {
    normalized = text.replace(/\./g, '').replace(',', '.');
  } else if (THOUSANDS_ONLY.test(text)) {
    normalized = text.replace(/\./g, '');
  } else if (text.includes(',') && text.includes('.')) {
    // El último separador es el decimal.
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    normalized =
      lastComma > lastDot
        ? text.replace(/\./g, '').replace(',', '.')
        : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    const parts = text.split(',');
    normalized = parts.length === 2 ? `${parts[0]}.${parts[1]}` : text.replace(/,/g, '');
  } else {
    normalized = text;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
}

const numberFormatter = new Intl.NumberFormat('es-AR', {
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat('es-AR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatCompact(value: number): string {
  return Math.abs(value) >= 10_000 ? compactFormatter.format(value) : numberFormatter.format(value);
}

export function formatCell(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

export function formatDate(value: Cell): string {
  if (typeof value !== 'string') return formatCell(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!iso) return value;
  const [, year, month, day] = iso;
  return `${day}/${month}/${year}`;
}
