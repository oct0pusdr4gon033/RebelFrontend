import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ExcepcionHorarioEmpleadoRequest,
  ExcepcionHorarioEmpleadoResponse,
} from '../../../api/Dtos/ExcepcionHorarioEmpleado';
import type { CatalogoAsistenciaEmpleadoDto } from '../../../api/Dtos/CatalogoAsistenciaEmpleado';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import '../ExcepcionesHorario.css';

interface ExcepcionHorarioFormModalProps {
  empleado: CatalogoAsistenciaEmpleadoDto;
  excepciones: ExcepcionHorarioEmpleadoResponse[];
  excepcion: ExcepcionHorarioEmpleadoResponse | null;
  onClose: () => void;
  onSave: (
    request: ExcepcionHorarioEmpleadoRequest,
    excepcionExistente: ExcepcionHorarioEmpleadoResponse | null,
  ) => Promise<void>;
}

interface HorarioFields {
  horaIngreso1: string;
  horaSalida1: string;
  horaIngreso2: string;
  horaSalida2: string;
}

const EMPTY_FIELDS: HorarioFields = {
  horaIngreso1: '',
  horaSalida1: '',
  horaIngreso2: '',
  horaSalida2: '',
};

function toTimeInput(value: string | null): string {
  return value?.slice(0, 5) ?? '';
}

function toTimeWithSeconds(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export default function ExcepcionHorarioFormModal({
  empleado,
  excepciones,
  excepcion,
  onClose,
  onSave,
}: ExcepcionHorarioFormModalProps) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [esLaborable, setEsLaborable] = useState(true);
  const [fields, setFields] = useState<HorarioFields>(EMPTY_FIELDS);
  const [motivo, setMotivo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFechaInicio(excepcion?.fechaInicio ?? '');
    setFechaFin(excepcion?.fechaFin ?? '');
    setEsLaborable(excepcion?.esLaborable ?? true);
    setFields(excepcion ? {
      horaIngreso1: toTimeInput(excepcion.horaIngreso1),
      horaSalida1: toTimeInput(excepcion.horaSalida1),
      horaIngreso2: toTimeInput(excepcion.horaIngreso2),
      horaSalida2: toTimeInput(excepcion.horaSalida2),
    } : EMPTY_FIELDS);
    setMotivo(excepcion?.motivo ?? '');
    setValidationError(null);
    setApiError(null);
    setSaving(false);
  }, [empleado.id, excepcion]);

  const handleWorkingDayChange = (checked: boolean) => {
    setEsLaborable(checked);
    setValidationError(null);
    if (!checked) setFields(EMPTY_FIELDS);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) {
      setValidationError('Ingresa un rango de fechas válido. La fecha inicial no puede ser posterior a la final.');
      return;
    }

    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      setValidationError('El motivo es obligatorio y no puede contener solo espacios.');
      return;
    }
    if (motivoLimpio.length > 500) {
      setValidationError('El motivo no puede superar los 500 caracteres.');
      return;
    }

    if (esLaborable) {
      const values = [
        fields.horaIngreso1,
        fields.horaSalida1,
        fields.horaIngreso2,
        fields.horaSalida2,
      ];

      if (values.some((value) => !value)) {
        setValidationError('Completa los cuatro horarios para una excepción laborable.');
        return;
      }

      if (values.some((value) => !isValidTime(value))) {
        setValidationError('Ingresa horarios válidos en formato de 24 horas.');
        return;
      }

      const minutes = values.map(toMinutes);
      if (!minutes.every((value, index) => index === 0 || minutes[index - 1] < value)) {
        setValidationError('El orden debe ser ingreso 1 < salida 1 < ingreso 2 < salida 2. No se permiten horarios que crucen medianoche.');
        return;
      }
    }

    const request: ExcepcionHorarioEmpleadoRequest = {
      empleadoId: empleado.id,
      fechaInicio,
      fechaFin,
      esLaborable,
      horaIngreso1: esLaborable ? toTimeWithSeconds(fields.horaIngreso1) : null,
      horaSalida1: esLaborable ? toTimeWithSeconds(fields.horaSalida1) : null,
      horaIngreso2: esLaborable ? toTimeWithSeconds(fields.horaIngreso2) : null,
      horaSalida2: esLaborable ? toTimeWithSeconds(fields.horaSalida2) : null,
      motivo: motivoLimpio,
    };

    const overlapping = excepciones.find((current) =>
      current.id !== excepcion?.id &&
      current.fechaInicio <= request.fechaFin &&
      current.fechaFin >= request.fechaInicio,
    );
    if (overlapping) {
      setValidationError(
        `El rango se solapa con una excepción existente (${overlapping.fechaInicio} al ${overlapping.fechaFin}). Los límites de fecha también cuentan como solapamiento.`,
      );
      return;
    }

    setSaving(true);
    try {
      await onSave(request, excepcion);
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'No se pudo guardar la excepción.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="excepcion-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="excepcion-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="excepcion-modal-title"
      >
        <header className="excepcion-modal-header">
          <div>
            <span className="excepcion-modal-eyebrow">Configuración de asistencias</span>
            <h2 id="excepcion-modal-title">
              {excepcion ? 'Editar excepción' : 'Registrar excepción'}
            </h2>
          </div>
          <button
            type="button"
            className="excepcion-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <GoogleIcon name="close" size={20} color="currentColor" />
          </button>
        </header>

        {(validationError || apiError) && (
          <div className="excepcion-form-error" role="alert">
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{validationError ?? apiError}</span>
          </div>
        )}

        <form className="excepcion-form" onSubmit={handleSubmit} noValidate>
          <div className="excepcion-form-field">
            <label htmlFor="excepcion-empleado">Empleado</label>
            <input id="excepcion-empleado" value={empleado.nombreCompleto} readOnly />
          </div>

          <div className="excepcion-date-grid">
            <div className="excepcion-form-field">
              <label htmlFor="excepcion-fecha-inicio">Fecha de inicio</label>
              <input
                id="excepcion-fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(event) => setFechaInicio(event.target.value)}
                required
              />
            </div>
            <div className="excepcion-form-field">
              <label htmlFor="excepcion-fecha-fin">Fecha de fin</label>
              <input
                id="excepcion-fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(event) => setFechaFin(event.target.value)}
                required
              />
            </div>
          </div>

          <label className="excepcion-working-toggle">
            <input
              type="checkbox"
              checked={esLaborable}
              onChange={(event) => handleWorkingDayChange(event.target.checked)}
            />
            <span>
              <strong>Rango laborable</strong>
              <small>{esLaborable ? 'Se requieren los cuatro horarios.' : 'Las horas se enviarán vacías.'}</small>
            </span>
          </label>

          {esLaborable && (
            <div className="excepcion-time-grid">
              <div className="excepcion-form-field">
                <label htmlFor="excepcion-ingreso-1">Ingreso 1</label>
                <input id="excepcion-ingreso-1" type="time" value={fields.horaIngreso1} onChange={(event) => setFields((current) => ({ ...current, horaIngreso1: event.target.value }))} required />
              </div>
              <div className="excepcion-form-field">
                <label htmlFor="excepcion-salida-1">Salida 1</label>
                <input id="excepcion-salida-1" type="time" value={fields.horaSalida1} onChange={(event) => setFields((current) => ({ ...current, horaSalida1: event.target.value }))} required />
              </div>
              <div className="excepcion-form-field">
                <label htmlFor="excepcion-ingreso-2">Ingreso 2</label>
                <input id="excepcion-ingreso-2" type="time" value={fields.horaIngreso2} onChange={(event) => setFields((current) => ({ ...current, horaIngreso2: event.target.value }))} required />
              </div>
              <div className="excepcion-form-field">
                <label htmlFor="excepcion-salida-2">Salida 2</label>
                <input id="excepcion-salida-2" type="time" value={fields.horaSalida2} onChange={(event) => setFields((current) => ({ ...current, horaSalida2: event.target.value }))} required />
              </div>
            </div>
          )}

          {!esLaborable && (
            <div className="excepcion-nonworking-note">
              <GoogleIcon name="event_busy" size={20} color="#64748b" />
              <span>El rango será no laborable y se guardará sin horarios.</span>
            </div>
          )}

          <div className="excepcion-form-field">
            <label htmlFor="excepcion-motivo">Motivo</label>
            <textarea
              id="excepcion-motivo"
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              maxLength={500}
              rows={3}
              required
            />
            <small className="excepcion-character-count">{motivo.length}/500</small>
          </div>

          <footer className="excepcion-modal-footer">
            <button type="button" className="excepcion-button-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="excepcion-button-primary" disabled={saving}>
              <GoogleIcon name={saving ? 'hourglass_top' : 'save'} size={18} color="#fff" />
              {saving ? 'Guardando...' : excepcion ? 'Guardar cambios' : 'Registrar excepción'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
