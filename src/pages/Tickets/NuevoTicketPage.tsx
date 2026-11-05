import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AREAS_TICKET,
  CATEGORIAS_TICKET,
  ETIQUETAS_AREA_TICKET,
  ETIQUETAS_CATEGORIA_TICKET,
  ETIQUETAS_PRIORIDAD_TICKET,
  PRIORIDADES_TICKET,
  TICKET_MAX_ARCHIVOS,
  TICKET_MAX_TAMANO_BYTES,
  TICKET_TIPOS_ARCHIVO_PERMITIDOS,
} from '../../api/Dtos/Ticket';
import type {
  AreaTicket,
  CategoriaTicket,
  PrioridadTicket,
} from '../../api/Dtos/Ticket';
import { crearTicketConEvidencias } from '../../api/services/ticket.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import '../Solicitudes/Solicitudes.css';
import './Tickets.css';

interface NuevoTicketPageProps {
  basePath: string;
}

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fileValidationError(files: File[]): string | null {
  if (files.length > TICKET_MAX_ARCHIVOS) {
    return `Puedes adjuntar hasta ${TICKET_MAX_ARCHIVOS} archivos.`;
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

function selectedEnum<T extends readonly number[]>(
  values: T,
  value: string,
): T[number] | undefined {
  return values.find((candidate) => candidate === Number(value));
}

export default function NuevoTicketPage({ basePath }: NuevoTicketPageProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [area, setArea] = useState<AreaTicket>(0);
  const [categoria, setCategoria] = useState<CategoriaTicket>(0);
  const [prioridad, setPrioridad] = useState<PrioridadTicket>(1);
  const [descripcion, setDescripcion] = useState('');
  const [evidenciaReferencia, setEvidenciaReferencia] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const nextFiles = [...archivos, ...selected];
    const validationError = fileValidationError(nextFiles);
    if (validationError) {
      setError(validationError);
      event.target.value = '';
      return;
    }
    setError(null);
    setArchivos(nextFiles);
    event.target.value = '';
  };

  const removeFile = (index: number) => {
    setArchivos((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const cleanDescription = descripcion.trim();
    const cleanReference = evidenciaReferencia.trim();
    if (!cleanDescription) {
      setError('La descripción es obligatoria.');
      return;
    }
    if (cleanDescription.length > 4000) {
      setError('La descripción admite hasta 4000 caracteres.');
      return;
    }
    if (cleanReference.length > 1000) {
      setError('La referencia admite hasta 1000 caracteres.');
      return;
    }
    const validationError = fileValidationError(archivos);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const ticket = await crearTicketConEvidencias({
        area,
        categoria,
        prioridad,
        descripcion: cleanDescription,
        evidenciaReferencia: cleanReference || null,
        archivos,
      });
      navigate(`${basePath}/tickets/${ticket.id}`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="support_agent" size={18} color="#2563eb" />
            Tickets
          </div>
          <h1>Crear ticket</h1>
          <p>Describe el problema y agrega evidencia si ayuda a resolverlo.</p>
        </div>
        <Link className="solicitudes-secondary-button" to={`${basePath}/tickets`}>
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Mis tickets
        </Link>
      </header>

      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      <form className="solicitudes-form" onSubmit={handleSubmit}>
        <div className="solicitudes-form-grid ticket-form-grid--three">
          <div className="solicitudes-field">
            <label htmlFor="ticket-area">Área</label>
            <select
              id="ticket-area"
              value={area}
              onChange={(event) => {
                const value = selectedEnum(AREAS_TICKET, event.target.value);
                if (value !== undefined) setArea(value);
              }}
              disabled={saving}
            >
              {AREAS_TICKET.map((value) => (
                <option key={value} value={value}>{ETIQUETAS_AREA_TICKET[value]}</option>
              ))}
            </select>
          </div>
          <div className="solicitudes-field">
            <label htmlFor="ticket-categoria">Categoría</label>
            <select
              id="ticket-categoria"
              value={categoria}
              onChange={(event) => {
                const value = selectedEnum(CATEGORIAS_TICKET, event.target.value);
                if (value !== undefined) setCategoria(value);
              }}
              disabled={saving}
            >
              {CATEGORIAS_TICKET.map((value) => (
                <option key={value} value={value}>{ETIQUETAS_CATEGORIA_TICKET[value]}</option>
              ))}
            </select>
          </div>
          <div className="solicitudes-field">
            <label htmlFor="ticket-prioridad">Prioridad</label>
            <select
              id="ticket-prioridad"
              value={prioridad}
              onChange={(event) => {
                const value = selectedEnum(PRIORIDADES_TICKET, event.target.value);
                if (value !== undefined) setPrioridad(value);
              }}
              disabled={saving}
            >
              {PRIORIDADES_TICKET.map((value) => (
                <option key={value} value={value}>{ETIQUETAS_PRIORIDAD_TICKET[value]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="ticket-descripcion">Descripción detallada</label>
          <textarea
            id="ticket-descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            maxLength={4000}
            rows={6}
            required
            disabled={saving}
          />
          <span className="solicitudes-character-count">{descripcion.length}/4000</span>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="ticket-referencia">Referencia adicional (opcional)</label>
          <input
            id="ticket-referencia"
            value={evidenciaReferencia}
            onChange={(event) => setEvidenciaReferencia(event.target.value)}
            maxLength={1000}
            disabled={saving}
          />
          <span className="solicitudes-character-count">{evidenciaReferencia.length}/1000</span>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="ticket-archivos">Archivos adjuntos (opcional)</label>
          <input
            id="ticket-archivos"
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            multiple
            onChange={handleFilesChange}
            disabled={saving || archivos.length >= TICKET_MAX_ARCHIVOS}
          />
          <span className="solicitudes-field-hint">
            Hasta 3 archivos PDF, JPG o PNG. Tamaño combinado máximo: 5 MB.
          </span>
          {archivos.map((file, index) => (
            <div className="solicitudes-file-selected" key={`${file.name}-${file.lastModified}-${index}`}>
              <span>
                <strong>{file.name}</strong>
                <small>{file.type} · {formatFileSize(file.size)}</small>
              </span>
              <button
                type="button"
                className="solicitudes-file-remove"
                onClick={() => removeFile(index)}
                disabled={saving}
                aria-label={`Quitar ${file.name}`}
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
            {saving ? 'Registrando...' : 'Registrar ticket'}
          </button>
          <Link className="solicitudes-secondary-button" to={`${basePath}/tickets`}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
