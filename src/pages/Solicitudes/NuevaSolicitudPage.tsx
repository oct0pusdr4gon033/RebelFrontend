import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ETIQUETAS_TIPO_SOLICITUD,
  TIPOS_SOLICITUD,
} from '../../api/Dtos/Solicitud';
import type { CrearSolicitudRequest, TipoSolicitud } from '../../api/Dtos/Solicitud';
import { crearSolicitud } from '../../api/services/solicitud.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './Solicitudes.css';

interface NuevaSolicitudPageProps {
  basePath: string;
}

function isTipoSolicitud(value: number): value is TipoSolicitud {
  return TIPOS_SOLICITUD.some((tipo) => tipo === value);
}

const MAX_EVIDENCE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_EVIDENCE_TYPES = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NuevaSolicitudPage({ basePath }: NuevaSolicitudPageProps) {
  const navigate = useNavigate();
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<TipoSolicitud>(0);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEvidenceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setError(null);
    if (!selectedFile) {
      setArchivo(null);
      return;
    }

    if (!/\.(pdf|jpe?g|png)$/i.test(selectedFile.name)) {
      setArchivo(null);
      event.target.value = '';
      setError('El archivo debe ser PDF, JPG o PNG.');
      return;
    }
    if (selectedFile.size > MAX_EVIDENCE_SIZE) {
      setArchivo(null);
      event.target.value = '';
      setError('El archivo no puede superar los 5 MB.');
      return;
    }

    setArchivo(selectedFile);
  };

  const removeEvidence = () => {
    setArchivo(null);
    if (evidenceInputRef.current) evidenceInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const tituloLimpio = titulo.trim();
    const descripcionLimpia = descripcion.trim();

    if (!tituloLimpio || !descripcionLimpia) {
      setError('El título y la descripción son obligatorios.');
      return;
    }
    if (tituloLimpio.length > 200 || descripcionLimpia.length > 2000) {
      setError('El título admite hasta 200 caracteres y la descripción hasta 2000.');
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
    const request: CrearSolicitudRequest = {
      tipo,
      titulo: tituloLimpio,
      descripcion: descripcionLimpia,
      fechaInicio,
      fechaFin,
      archivo,
    };

    setSaving(true);
    try {
      await crearSolicitud(request);
      await Swal.fire({
        icon: 'success',
        title: 'Solicitud registrada',
        text: 'Tu solicitud se registró correctamente.',
        confirmButtonColor: '#2563eb',
      });
      navigate(`${basePath}/solicitudes`, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="assignment" size={18} color="#2563eb" />
            Solicitudes
          </div>
          <h1>Nueva solicitud</h1>
          <p>Completa la información para registrar tu solicitud.</p>
        </div>
        <Link className="solicitudes-secondary-button" to={`${basePath}/solicitudes`}>
          <GoogleIcon name="arrow_back" size={18} color="#2563eb" />
          Mis solicitudes
        </Link>
      </header>

      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      <form className="solicitudes-form" onSubmit={handleSubmit}>
        <div className="solicitudes-field">
          <label htmlFor="solicitud-tipo">Tipo</label>
          <select
            id="solicitud-tipo"
            value={tipo}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (isTipoSolicitud(value)) setTipo(value);
            }}
            disabled={saving}
          >
            {TIPOS_SOLICITUD.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_TIPO_SOLICITUD[value]}</option>
            ))}
          </select>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="solicitud-titulo">Título</label>
          <input
            id="solicitud-titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            maxLength={200}
            required
            disabled={saving}
          />
          <span className="solicitudes-character-count">{titulo.length}/200</span>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="solicitud-descripcion">Descripción</label>
          <textarea
            id="solicitud-descripcion"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            maxLength={2000}
            rows={5}
            required
            disabled={saving}
          />
          <span className="solicitudes-character-count">{descripcion.length}/2000</span>
        </div>

        <div className="solicitudes-form-grid">
          <div className="solicitudes-field">
            <label htmlFor="solicitud-fecha-inicio">Fecha de inicio</label>
            <input
              id="solicitud-fecha-inicio"
              type="date"
              value={fechaInicio}
              onChange={(event) => setFechaInicio(event.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="solicitudes-field">
            <label htmlFor="solicitud-fecha-fin">Fecha de fin</label>
            <input
              id="solicitud-fecha-fin"
              type="date"
              value={fechaFin}
              onChange={(event) => setFechaFin(event.target.value)}
              required
              disabled={saving}
            />
          </div>
        </div>

        <div className="solicitudes-field">
          <label htmlFor="solicitud-evidencia">Evidencia (opcional)</label>
          <input
            id="solicitud-evidencia"
            ref={evidenceInputRef}
            type="file"
            accept={ACCEPTED_EVIDENCE_TYPES}
            onChange={handleEvidenceChange}
            disabled={saving}
            aria-describedby="solicitud-evidencia-ayuda"
          />
          <span id="solicitud-evidencia-ayuda" className="solicitudes-field-hint">
            Formatos permitidos: PDF, JPG o PNG. Tamaño máximo: 5 MB.
          </span>
          {archivo && (
            <div className="solicitudes-file-selected">
              <span>
                <strong>{archivo.name}</strong>
                <small>{formatFileSize(archivo.size)}</small>
              </span>
              <button
                type="button"
                className="solicitudes-file-remove"
                onClick={removeEvidence}
                disabled={saving}
                aria-label="Quitar archivo seleccionado"
              >
                <GoogleIcon name="close" size={18} />
                Quitar
              </button>
            </div>
          )}
        </div>

        <div className="solicitudes-form-actions">
          <button type="submit" className="solicitudes-primary-button" disabled={saving}>
            <GoogleIcon name={saving ? 'hourglass_top' : 'send'} size={18} color="#fff" />
            {saving ? 'Registrando...' : 'Registrar solicitud'}
          </button>
          <Link className="solicitudes-secondary-button" to={`${basePath}/solicitudes`}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
