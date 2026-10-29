import { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  busy: boolean;
}

export default function UploadDropzone({ onFile, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  const openPicker = () => {
    if (!busy) inputRef.current?.click();
  };

  return (
    <div
      className={`dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy) handleFiles(event.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      aria-label="Subir archivo PDF, Excel o CSV"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xlsm,.csv,.tsv,.txt"
        hidden
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          <strong>Leyendo el archivo…</strong>
          <span className="muted">Detectando tablas y encabezados</span>
        </>
      ) : (
        <>
          <span className="dropzone-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3.5A1.5 1.5 0 005.5 20h13a1.5 1.5 0 001.5-1.5V15" strokeLinecap="round" />
            </svg>
          </span>
          <strong>Arrastrá tu archivo o hacé clic para elegirlo</strong>
          <span className="muted">PDF (digital), XLSX, CSV o TSV · hasta 30 MB</span>
        </>
      )}
    </div>
  );
}
