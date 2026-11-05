import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DiaSemana,
  HorarioSedeRequest,
  HorarioSedeResponse,
} from '../../../api/Dtos/HorarioSede';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import './HorariosSede.css';

interface HorarioSedeFormModalProps {
  sedeId: number;
  sedeNombre: string;
  diaSemana: DiaSemana;
  diaNombre: string;
  horario: HorarioSedeResponse | null;
  onClose: () => void;
  onSave: (request: HorarioSedeRequest, horarioExistente: HorarioSedeResponse | null) => Promise<void>;
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

function toSeconds(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

export default function HorarioSedeFormModal({
  sedeId,
  sedeNombre,
  diaSemana,
  diaNombre,
  horario,
  onClose,
  onSave,
}: HorarioSedeFormModalProps) {
  const [esLaborable, setEsLaborable] = useState(true);
  const [fields, setFields] = useState<HorarioFields>(EMPTY_FIELDS);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEsLaborable(horario?.esLaborable ?? true);
    setFields(horario ? {
      horaIngreso1: toTimeInput(horario.horaIngreso1),
      horaSalida1: toTimeInput(horario.horaSalida1),
      horaIngreso2: toTimeInput(horario.horaIngreso2),
      horaSalida2: toTimeInput(horario.horaSalida2),
    } : EMPTY_FIELDS);
    setValidationError(null);
    setApiError(null);
    setSaving(false);
  }, [horario, diaSemana]);

  const handleWorkingDayChange = (checked: boolean) => {
    setEsLaborable(checked);
    setValidationError(null);
    if (!checked) setFields(EMPTY_FIELDS);
  };

  const handleTimeChange = (field: keyof HorarioFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setValidationError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (esLaborable) {
      const values = [
        fields.horaIngreso1,
        fields.horaSalida1,
        fields.horaIngreso2,
        fields.horaSalida2,
      ];
      if (values.some((value) => !value)) {
        setValidationError('Completa los cuatro horarios para un día laborable.');
        return;
      }

      const minutes = values.map((value) => {
        const [hours, mins] = value.split(':').map(Number);
        return hours * 60 + mins;
      });
      if (!minutes.every((value, index) => index === 0 || minutes[index - 1] < value)) {
        setValidationError('El orden debe ser ingreso 1 < salida 1 < ingreso 2 < salida 2. No se permiten horarios que crucen medianoche.');
        return;
      }
    }

    const request: HorarioSedeRequest = {
      sedeId,
      diaSemana,
      esLaborable,
      horaIngreso1: esLaborable ? toSeconds(fields.horaIngreso1) : null,
      horaSalida1: esLaborable ? toSeconds(fields.horaSalida1) : null,
      horaIngreso2: esLaborable ? toSeconds(fields.horaIngreso2) : null,
      horaSalida2: esLaborable ? toSeconds(fields.horaSalida2) : null,
    };

    setSaving(true);
    try {
      await onSave(request, horario);
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'No se pudo guardar el horario.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="horario-modal-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <section
        className="horario-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="horario-modal-title"
      >
        <header className="horario-modal-header">
          <div>
            <span className="horario-modal-eyebrow">{sedeNombre}</span>
            <h2 id="horario-modal-title">
              {horario ? 'Editar horario' : 'Configurar horario'} · {diaNombre}
            </h2>
          </div>
          <button type="button" className="horario-modal-close" onClick={onClose} disabled={saving} aria-label="Cerrar">
            <GoogleIcon name="close" size={20} color="currentColor" />
          </button>
        </header>

        {(validationError || apiError) && (
          <div className="horario-form-error" role="alert">
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{validationError ?? apiError}</span>
          </div>
        )}

        <form className="horario-form" onSubmit={handleSubmit} noValidate>
          <label className="horario-working-toggle">
            <input
              type="checkbox"
              checked={esLaborable}
              onChange={(event) => handleWorkingDayChange(event.target.checked)}
            />
            <span>
              <strong>Día laborable</strong>
              <small>{esLaborable ? 'Se requiere configurar los cuatro horarios.' : 'Las horas quedarán vacías.'}</small>
            </span>
          </label>

          {esLaborable && (
            <div className="horario-time-grid">
              <div className="horario-time-field">
                <label htmlFor="hora-ingreso-1">Ingreso 1</label>
                <input id="hora-ingreso-1" type="time" value={fields.horaIngreso1} required onChange={(event) => handleTimeChange('horaIngreso1', event.target.value)} />
              </div>
              <div className="horario-time-field">
                <label htmlFor="hora-salida-1">Salida 1</label>
                <input id="hora-salida-1" type="time" value={fields.horaSalida1} required onChange={(event) => handleTimeChange('horaSalida1', event.target.value)} />
              </div>
              <div className="horario-time-field">
                <label htmlFor="hora-ingreso-2">Ingreso 2</label>
                <input id="hora-ingreso-2" type="time" value={fields.horaIngreso2} required onChange={(event) => handleTimeChange('horaIngreso2', event.target.value)} />
              </div>
              <div className="horario-time-field">
                <label htmlFor="hora-salida-2">Salida 2</label>
                <input id="hora-salida-2" type="time" value={fields.horaSalida2} required onChange={(event) => handleTimeChange('horaSalida2', event.target.value)} />
              </div>
            </div>
          )}

          {!esLaborable && (
            <div className="horario-nonworking-note">
              <GoogleIcon name="event_busy" size={20} color="#64748b" />
              <span>Este día se guardará como no laborable, sin horas asignadas.</span>
            </div>
          )}

          <footer className="horario-modal-footer">
            <button type="button" className="horario-button-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="horario-button-primary" disabled={saving}>
              <GoogleIcon name={saving ? 'hourglass_top' : 'save'} size={18} color="#fff" />
              {saving ? 'Guardando...' : horario ? 'Guardar cambios' : 'Registrar horario'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
