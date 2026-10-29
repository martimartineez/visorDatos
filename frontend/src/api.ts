import type { ExtractResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)))
        .join(' · ');
    }
  } catch {
    /* respuesta sin JSON */
  }
  return `Error ${response.status}: ${response.statusText}`;
}

export async function extractFile(file: File, signal?: AbortSignal): Promise<ExtractResponse> {
  const body = new FormData();
  body.append('file', file);

  const response = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    body,
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as ExtractResponse;
}

export function tableCsvUrl(uploadId: string, tableId: string): string {
  return `${API_BASE}/api/tables/${uploadId}/${tableId}.csv`;
}
