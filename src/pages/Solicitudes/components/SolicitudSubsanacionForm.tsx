import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import {
  ETIQUETAS_TIPO_SOLICITUD,
  TIPOS_SOLICITUD,
} from '../../../api/Dtos/Solicitud';
import type { SolicitudResponse, TipoSolicitud } from '../../../api/Dtos/Solicitud';
import { subsanarSolicitud } from '../../../api/services/solicitud.service';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';

interface SolicitudSubsanacionFormProps {
  solicitud: SolicitudResponse;
  onSubmitted: () => Promise<void>;
}

const MAX_FILES = 3;
const MAX_TOTAL_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

function isTipoSolicitud(value: number): value is TipoSolicitud {
  return TIPOS_SOLICITUD.some((tipo) => tipo === value);
}

function toDateInputValue(value: string): string {
  return value.slice(0, 10);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatContentType(file: File): string {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'PDF';
  if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) return 'JPG';
  if (file.type === 'image/png' || /\.png$/i.test(file.name)) return 'PNG';
  return file.type || 'Tipo no disponible';
}

export default function SolicitudSubsanacionForm({
  solicitud,
  onSubmitted,
}: SolicitudSubsanacionFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoSolicitud>(solicitud.tipo);
  const [titulo, setTitulo] = useState(solicitud.titulo);
  const [descripcion, setDescripcion] = useState(solicitud.descripcion);
  const [fechaInicio, setFechaInicio] = useState(toDateInputValue(solicitud.fechaInicio));
  const [fechaFin, setFechaFin] = useState(toDateInputValue(solicitud.fechaFin));
  const [evidenciaReferencia, setEvidenciaReferencia] = useState(
    solicitud.evidenciaReferencia ?? '',
  );
  const [comentario, setComentario] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const seleccionados = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!seleccionados.length) return;

    const candidatos = [...archivos, ...seleccionados];
    if (candidatos.length > MAX_FILES) {
      setError('Puedes adjuntar hasta 3 archivos por subsanación.');
      return;
    }
    if (candidatos.some((file) => !/\.(pdf|jpe?g|png)$/i.test(file.name))) {
      setError('Los archivos deben tener formato PDF, JPG, JPEG o PNG.');
      return;
    }
    if (candidatos.some((file) => file.size <= 0)) {
      setError('Los archivos adjuntos no pueden estar vacíos.');
      return;
    }
    if (candidatos.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_SIZE) {
      setError('El tamaño total de los archivos no puede superar los 5 MB.');
      return;
    }

    setArchivos(candidatos);
    setError(null);
  };

  const removeFile = (index: number) => {
    setArchivos((selected) => selected.filter((_, fileIndex) => fileIndex !== index));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion.trim();
    const comentarioLimpio = comentario.trim();

    if (!isTipoSolicitud(tipo)) {
      setError('Selecciona un tipo de solicitud válido.');
      return;
    }
    if (!tituloLimpio || !descripcionLimpia) {
      setError('El título y la descripción son obligatorios.');
      return;
    }
    if (tituloLimpio.length > 200 || descripcionLimpia.length > 2000) {
      setError('El título admite hasta 200 caracteres y la descripción hasta 2000.');
      return;
    }
    if (evidenciaReferencia.length > 1000) {
      setError('La referencia de evidencia no puede superar los 1000 caracteres.');
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError('Las fechas de inicio y fin son obligatorias.');
      return;
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (!comentarioLimpio) {
      setError('El comentario de subsanación es obligatorio.');
      return;
    }
    if (comentarioLimpio.length > 2000) {
      setError('El comentario no puede superar los 2000 caracteres.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await subsanarSolicitud(solicitud.id, {
        tipo,
        titulo: tituloLimpio,
        descripcion: descripcionLimpia,
        fechaInicio,
        fechaFin,
        evidenciaReferencia,
        comentario: comentarioLimpio,
        archivos,
      });
      await Swal.fire({
        icon: 'success',
        title: 'Subsanación enviada',
        text: 'La solicitud volvió a estado pendiente y el servidor confirmó el envío.',
        confirmButtonColor: '#2563eb',
      });
      setComentario('');
      setArchivos([]);
      if (inputRef.current) inputRef.current.value = '';
      await onSubmitted();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo enviar la subsanación.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="solicitudes-form solicitud-subsanacion" onSubmit={handleSubmit}>
      <div>
        <h3>Subsanar solicitud</h3>
        <p>Corrige los datos de la solicitud, explica los cambios y adjunta hasta 3 documentos.</p>
      </div>

      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      <div className="solicitudes-form-grid">
        <div className="solicitudes-field">
          <label htmlFor="solicitud-subsanacion-tipo">Tipo</label>
          <select
            id="solicitud-subsanacion-tipo"
            value={tipo}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (isTipoSolicitud(value)) setTipo(value);
            }}
            required
            disabled={saving}
          >
            {TIPOS_SOLICITUD.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_TIPO_SOLICITUD[value]}</option>
            ))}
          </select>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="solicitud-subsanacion-titulo">Título</label>
          <input
            id="solicitud-subsanacion-titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            maxLength={200}
            required
            disabled={saving}
          />
          <span className="solicitudes-character-count">{titulo.length}/200</span>
        </div>
      </div>

      <div className="solicitudes-field">
        <label htmlFor="solicitud-subsanacion-descripcion">Descripción</label>
        <textarea
          id="solicitud-subsanacion-descripcion"
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          maxLength={2000}
          rows={4}
          required
          disabled={saving}
        />
        <span className="solicitudes-character-count">{descripcion.length}/2000</span>
      </div>

      <div className="solicitudes-form-grid">
        <div className="solicitudes-field">
          <label htmlFor="solicitud-subsanacion-fecha-inicio">Fecha de inicio</label>
          <input
            id="solicitud-subsanacion-fecha-inicio"
            type="date"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            required
            disabled={saving}
          />
        </div>
        <div className="solicitudes-field">
          <label htmlFor="solicitud-subsanacion-fecha-fin">Fecha de fin</label>
          <input
            id="solicitud-subsanacion-fecha-fin"
            type="date"
            value={fechaFin}
            onChange={(event) => setFechaFin(event.target.value)}
            required
            disabled={saving}
          />
        </div>
      </div>

      <div className="solicitudes-field">
        <label htmlFor="solicitud-subsanacion-referencia">Referencia de evidencia (opcional)</label>
        <input
          id="solicitud-subsanacion-referencia"
          value={evidenciaReferencia}
          onChange={(event) => setEvidenciaReferencia(event.target.value)}
          maxLength={1000}
          disabled={saving}
        />
        <span className="solicitudes-character-count">{evidenciaReferencia.length}/1000</span>
      </div>

      <div className="solicitudes-field">
        <label htmlFor="solicitud-subsanacion-comentario">Respuesta de subsanación</label>
        <textarea
          id="solicitud-subsanacion-comentario"
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          maxLength={2000}
          rows={4}
          required
          disabled={saving}
        />
        <span className="solicitudes-character-count">{comentario.length}/2000</span>
      </div>

      <div className="solicitudes-field">
        <label htmlFor="solicitud-subsanacion-archivos">Documentos (opcional)</label>
        <input
          ref={inputRef}
          id="solicitud-subsanacion-archivos"
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          onChange={handleFilesChange}
          disabled={saving || archivos.length >= MAX_FILES}
        />
        <span className="solicitudes-field-hint">
          PDF, JPG/JPEG o PNG. Hasta 3 archivos y 5 MB en total.
        </span>
        {archivos.map((archivo, index) => (
          <div className="solicitudes-file-selected" key={`${archivo.name}-${archivo.size}-${index}`}>
            <span>
              <strong>{archivo.name}</strong>
              <small>{formatContentType(archivo)} · {formatFileSize(archivo.size)}</small>
            </span>
            <button
              type="button"
              className="solicitudes-file-remove"
              onClick={() => removeFile(index)}
              disabled={saving}
              aria-label={`Quitar ${archivo.name}`}
            >
              <GoogleIcon name="close" size={18} />
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="solicitudes-form-actions">
        <button type="submit" className="solicitudes-primary-button" disabled={saving}>
          <GoogleIcon name={saving ? 'hourglass_top' : 'send'} size={18} color="#fff" />
          {saving ? 'Enviando...' : 'Enviar subsanación'}
        </button>
      </div>
    </form>
  );
}
