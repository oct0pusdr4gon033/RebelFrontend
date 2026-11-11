import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  TICKET_MAX_ARCHIVOS,
  TICKET_MAX_TAMANO_BYTES,
  TICKET_TIPOS_ARCHIVO_PERMITIDOS,
  type TicketEvidenciaContenido,
  type TicketEvidenciaResponseDto,
} from '../../../api/Dtos/Ticket';
import {
  descargarTicketEvidencia,
  visualizarTicketEvidencia,
} from '../../../api/services/ticket.service';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';

interface TicketEvidenciasProps {
  ticketId: number;
  evidencias: TicketEvidenciaResponseDto[];
  loadError: string | null;
  editable: boolean;
  uploading: boolean;
  uploadError: string | null;
  onUpload: (files: File[]) => Promise<boolean>;
}

interface TicketEvidenciaItemProps {
  ticketId: number;
  evidencia: TicketEvidenciaResponseDto;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(date);
}

function getFileValidationError(files: File[]): string | null {
  if (files.length > TICKET_MAX_ARCHIVOS) {
    return `Puedes adjuntar hasta ${TICKET_MAX_ARCHIVOS} archivos por envío.`;
  }
  let totalSize = 0;
  for (const file of files) {
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const expectedType = TICKET_TIPOS_ARCHIVO_PERMITIDOS[
      extension as keyof typeof TICKET_TIPOS_ARCHIVO_PERMITIDOS
    ];
    if (!expectedType || file.type.toLowerCase() !== expectedType) {
      return 'Solo se permiten archivos PDF, JPG, JPEG y PNG con tipo de archivo válido.';
    }
    if (file.size === 0) return `El archivo "${file.name}" está vacío.`;
    totalSize += file.size;
    if (totalSize > TICKET_MAX_TAMANO_BYTES) {
      return 'El tamaño combinado de los archivos no puede superar 5 MB.';
    }
  }
  return null;
}

function startDownload(file: TicketEvidenciaContenido): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.nombreArchivo;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TicketEvidenciaItem({ ticketId, evidencia }: TicketEvidenciaItemProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState('');
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isImage = evidencia.contentType.startsWith('image/');
  const isPdf = evidencia.contentType === 'application/pdf';

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handlePreview = async () => {
    if (previewUrl) {
      setPreviewUrl(null);
      setPreviewType('');
      return;
    }
    setBusy('preview');
    setError(null);
    try {
      const file = await visualizarTicketEvidencia(
        ticketId,
        evidencia.id,
        evidencia.nombreOriginal,
      );
      setPreviewType(file.contentType);
      setPreviewUrl(URL.createObjectURL(file.blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo abrir el archivo.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async () => {
    setBusy('download');
    setError(null);
    try {
      const file = await descargarTicketEvidencia(
        ticketId,
        evidencia.id,
        evidencia.nombreOriginal,
      );
      startDownload(file);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo descargar el archivo.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="ticket-evidence">
      <div className="ticket-evidence__meta">
        <GoogleIcon name={isImage ? 'image' : 'description'} size={21} color="#2563eb" />
        <div>
          <strong>{evidencia.nombreOriginal}</strong>
          <small>
            {evidencia.contentType} · {formatFileSize(evidencia.tamanoBytes)}
            {' · '}{formatDate(evidencia.fechaUtc)}
          </small>
        </div>
      </div>
      <div className="ticket-evidence__actions">
        {(isImage || isPdf) && (
          <button
            type="button"
            className="solicitudes-secondary-button"
            onClick={() => void handlePreview()}
            disabled={busy !== null}
          >
            <GoogleIcon name={previewUrl ? 'visibility_off' : 'visibility'} size={18} color="#2563eb" />
            {busy === 'preview' ? 'Abriendo...' : previewUrl ? 'Cerrar vista' : 'Vista previa'}
          </button>
        )}
        {isPdf && previewUrl && (
          <a
            className="solicitudes-secondary-button"
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
          >
            <GoogleIcon name="open_in_new" size={18} color="#2563eb" />
            Abrir PDF
          </a>
        )}
        <button
          type="button"
          className="solicitudes-secondary-button"
          onClick={() => void handleDownload()}
          disabled={busy !== null}
        >
          <GoogleIcon name={busy === 'download' ? 'hourglass_top' : 'download'} size={18} color="#2563eb" />
          {busy === 'download' ? 'Descargando...' : 'Descargar'}
        </button>
      </div>
      {previewUrl && previewType.startsWith('image/') && (
        <div className="ticket-evidence__preview">
          <img src={previewUrl} alt={`Vista previa de ${evidencia.nombreOriginal}`} />
        </div>
      )}
      {previewUrl && previewType === 'application/pdf' && (
        <div className="ticket-evidence__preview ticket-evidence__preview--pdf">
          <iframe src={previewUrl} title={`Vista previa de ${evidencia.nombreOriginal}`} />
        </div>
      )}
      {error && <p className="ticket-inline-error" role="alert">{error}</p>}
    </article>
  );
}

export default function TicketEvidencias({
  ticketId,
  evidencias,
  loadError,
  editable,
  uploading,
  uploadError,
  onUpload,
}: TicketEvidenciasProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const nextFiles = [...files, ...selected];
    const validationError = getFileValidationError(nextFiles);
    if (validationError) {
      setSelectionError(validationError);
      event.target.value = '';
      return;
    }
    setFiles(nextFiles);
    setSelectionError(null);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setSelectionError(null);
  };

  const submitFiles = async () => {
    if (files.length === 0) {
      setSelectionError('Selecciona al menos un archivo para adjuntar.');
      return;
    }
    if (await onUpload(files)) {
      setFiles([]);
      setSelectionError(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <section className="ticket-panel" aria-labelledby="ticket-evidence-title">
      <div className="ticket-panel__heading">
        <div>
          <h3 id="ticket-evidence-title">Evidencias adjuntas</h3>
          <p>Archivos relacionados con el ticket.</p>
        </div>
        <GoogleIcon name="attach_file" size={20} color="#2563eb" />
      </div>

      {loadError ? (
        <p className="ticket-empty-inline" role="status">
          No se pudieron mostrar las evidencias. Vuelve a intentarlo.
        </p>
      ) : evidencias.length === 0 ? (
        <p className="ticket-empty-inline">Este ticket no tiene archivos adjuntos.</p>
      ) : (
        <div className="ticket-evidence-list">
          {evidencias.map((evidencia) => (
            <TicketEvidenciaItem
              key={evidencia.id}
              ticketId={ticketId}
              evidencia={evidencia}
            />
          ))}
        </div>
      )}

      {editable && (
        <div className="ticket-upload">
          <div className="solicitudes-field">
            <label htmlFor="ticket-add-evidence">Adjuntar más archivos</label>
            <input
              id="ticket-add-evidence"
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              onChange={handleFileChange}
              disabled={uploading || files.length >= TICKET_MAX_ARCHIVOS}
            />
            <span className="solicitudes-field-hint">
              Hasta 3 por envío, PDF/JPG/PNG y 5 MB combinados.
            </span>
          </div>
          {files.map((file, index) => (
            <div className="solicitudes-file-selected" key={`${file.name}-${file.lastModified}-${index}`}>
              <span>
                <strong>{file.name}</strong>
                <small>{file.type} · {formatFileSize(file.size)}</small>
              </span>
              <button
                type="button"
                className="solicitudes-file-remove"
                onClick={() => removeFile(index)}
                disabled={uploading}
                aria-label={`Quitar ${file.name}`}
              >
                <GoogleIcon name="close" size={18} />
                Quitar
              </button>
            </div>
          ))}
          {(selectionError || uploadError) && (
            <p className="ticket-inline-error" role="alert">{selectionError || uploadError}</p>
          )}
          <button
            type="button"
            className="solicitudes-primary-button"
            onClick={() => void submitFiles()}
            disabled={uploading || files.length === 0}
          >
            <GoogleIcon name={uploading ? 'hourglass_top' : 'upload_file'} size={18} color="#fff" />
            {uploading ? 'Adjuntando...' : 'Subir archivos'}
          </button>
        </div>
      )}
      {!editable && (
        <p className="ticket-readonly-note">
          No se pueden agregar archivos porque el ticket está cerrado.
        </p>
      )}
    </section>
  );
}
