import { useState } from 'react';
import type {
  EvidenciaSolicitud,
  SolicitudEvidenciaMetadatos,
} from '../../../api/Dtos/Solicitud';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';

interface SolicitudEvidenciaProps {
  solicitudId: number;
  tieneEvidencia?: boolean;
  nombreArchivo?: string | null;
  contentType?: string | null;
  tamanoBytes?: number | null;
  descargar: (
    solicitudId: number,
    nombreArchivoFallback?: string | null,
  ) => Promise<EvidenciaSolicitud>;
  evidencias?: SolicitudEvidenciaMetadatos[];
  emptyLabel?: string;
  descargarPorId?: (
    solicitudId: number,
    evidenciaId: number,
    nombreArchivoFallback?: string | null,
  ) => Promise<EvidenciaSolicitud>;
}

interface SolicitudEvidenciaArchivoProps {
  solicitudId: number;
  archivo: SolicitudEvidenciaMetadatos;
  descargar: (
    solicitudId: number,
    evidenciaId: number,
    nombreArchivoFallback?: string | null,
  ) => Promise<EvidenciaSolicitud>;
}

export function SolicitudEvidenciaBadge() {
  return (
    <span className="solicitud-evidence-badge" title="Tiene evidencia adjunta">
      <GoogleIcon name="attach_file" size={15} color="#2563eb" />
      Con adjunto
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatContentType(contentType: string | null | undefined): string {
  if (contentType === 'application/pdf') return 'PDF';
  if (contentType === 'image/jpeg') return 'JPG';
  if (contentType === 'image/png') return 'PNG';
  return contentType || 'Formato no disponible';
}

export function SolicitudEvidenciaArchivo({
  solicitudId,
  archivo,
  descargar,
}: SolicitudEvidenciaArchivoProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const evidence = await descargar(solicitudId, archivo.id, archivo.nombreArchivo);
      const objectUrl = URL.createObjectURL(evidence.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = evidence.nombreArchivo;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo descargar la evidencia.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="solicitud-evidence">
      <div className="solicitud-evidence__info">
        <GoogleIcon name="description" size={20} color="#2563eb" />
        <div>
          <strong>{archivo.nombreArchivo || 'Archivo adjunto'}</strong>
          <small>
            {formatContentType(archivo.contentType)} · {formatFileSize(archivo.tamanoBytes)}
          </small>
        </div>
      </div>
      <button
        type="button"
        className="solicitudes-secondary-button solicitud-evidence__download"
        onClick={() => void handleDownload()}
        disabled={downloading}
      >
        <GoogleIcon name={downloading ? 'hourglass_top' : 'download'} size={18} color="#2563eb" />
        {downloading ? 'Descargando...' : 'Descargar'}
      </button>
      {error && (
        <p className="solicitud-evidence__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function SolicitudEvidencia({
  solicitudId,
  tieneEvidencia,
  nombreArchivo,
  contentType,
  tamanoBytes,
  descargar,
  evidencias,
  descargarPorId,
  emptyLabel,
}: SolicitudEvidenciaProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      const evidencia = await descargar(solicitudId, nombreArchivo);
      const objectUrl = URL.createObjectURL(evidencia.blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = evidencia.nombreArchivo;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo descargar la evidencia.');
    } finally {
      setDownloading(false);
    }
  };

  if (evidencias !== undefined && descargarPorId) {
    if (evidencias.length === 0) {
      return (
        <p className="solicitud-evidence-empty">
          {emptyLabel || 'Sin evidencia adjunta'}
        </p>
      );
    }
    return (
      <div className="solicitud-evidence-list">
        {evidencias.map((archivo) => (
          <SolicitudEvidenciaArchivo
            key={archivo.id}
            solicitudId={solicitudId}
            archivo={archivo}
            descargar={descargarPorId}
          />
        ))}
      </div>
    );
  }

  if (!tieneEvidencia) {
    return <p className="solicitud-evidence-empty">Sin evidencia adjunta</p>;
  }

  return (
    <div className="solicitud-evidence">
      <div className="solicitud-evidence__info">
        <GoogleIcon name="description" size={20} color="#2563eb" />
        <div>
          <strong>Evidencia adjunta</strong>
          <span>{nombreArchivo || 'Archivo adjunto'}</span>
          <small>
            {formatContentType(contentType)}
            {tamanoBytes != null ? ` · ${formatFileSize(tamanoBytes)}` : ''}
          </small>
        </div>
      </div>
      <button
        type="button"
        className="solicitudes-secondary-button solicitud-evidence__download"
        onClick={() => void handleDownload()}
        disabled={downloading}
      >
        <GoogleIcon name={downloading ? 'hourglass_top' : 'download'} size={18} color="#2563eb" />
        {downloading ? 'Descargando...' : 'Descargar'}
      </button>
      {error && (
        <p className="solicitud-evidence__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
