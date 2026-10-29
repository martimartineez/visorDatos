/** Descarga un Blob con el nombre indicado, sin dejar rastros en el DOM. */
export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Damos margen para que el navegador empiece la descarga antes de liberar la URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
