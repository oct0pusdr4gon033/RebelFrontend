import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DiaNoLaborableRequest,
  DiaNoLaborableResponse,
} from '../../../api/Dtos/DiaNoLaborable';
import type { SedeDto } from '../../../api/Dtos/Sede';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import '../DiasNoLaborables.css';

interface DiaNoLaborableFormModalProps {
  sedes: SedeDto[];
  dia: DiaNoLaborableResponse | null;
  diasExistentes: DiaNoLaborableResponse[];
  onClose: () => void;
  onSave: (
    request: DiaNoLaborableRequest,
    diaExistente: DiaNoLaborableResponse | null,
  ) => Promise<void>;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export default function DiaNoLaborableFormModal({
  sedes,
  dia,
  diasExistentes,
  onClose,
  onSave,
}: DiaNoLaborableFormModalProps) {
  const [fecha, setFecha] = useState('');
  const [alcance, setAlcance] = useState<'global' | 'sede'>('global');
  const [sedeId, setSedeId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFecha(dia?.fecha ?? '');
    setAlcance(dia?.sedeId === null ? 'global' : dia ? 'sede' : 'global');
    setSedeId(dia?.sedeId === null || dia === null ? '' : String(dia.sedeId));
    setDescripcion(dia?.descripcion ?? '');
    setValidationError(null);
    setApiError(null);
    setSaving(false);
  }, [dia]);

  const handleScopeChange = (value: 'global' | 'sede') => {
    setAlcance(value);
    setValidationError(null);
    if (value === 'global') setSedeId('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    setApiError(null);

    if (!isValidDate(fecha)) {
      setValidationError('Ingresa una fecha válida en formato YYYY-MM-DD.');
      return;
    }

    const descripcionLimpia = descripcion.trim();
    if (!descripcionLimpia) {
      setValidationError('La descripción es obligatoria y no puede contener solo espacios.');
      return;
    }
    if (descripcionLimpia.length > 250) {
      setValidationError('La descripción no puede superar los 250 caracteres.');
      return;
    }

    let sedeIdRequest: number | null = null;
    if (alcance === 'sede') {
      if (!sedeId) {
        setValidationError('Selecciona una sede para el ámbito específico.');
        return;
      }

      sedeIdRequest = Number(sedeId);
      if (!Number.isInteger(sedeIdRequest) || sedeIdRequest <= 0) {
        setValidationError('Selecciona una sede válida.');
        return;
      }
      if (!sedes.some((sede) => sede.id === sedeIdRequest && sede.activo)) {
        setValidationError('La sede debe estar activa para registrar o actualizar el día no laborable.');
        return;
      }
    }

    const request: DiaNoLaborableRequest = {
      fecha,
      sedeId: alcance === 'global' ? null : sedeIdRequest,
      descripcion: descripcionLimpia,
    };

    const duplicate = diasExistentes.find((current) =>
      current.id !== dia?.id &&
      current.fecha === request.fecha &&
      current.sedeId === request.sedeId,
    );
    if (duplicate) {
      setValidationError(
        'Ya existe un día no laborable para esa fecha y ámbito. Un registro global y otro específico de sede sí pueden coexistir.',
      );
      return;
    }

    setSaving(true);
    try {
      await onSave(request, dia);
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : 'No se pudo guardar el día no laborable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="dia-no-laborable-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        className="dia-no-laborable-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dia-no-laborable-modal-title"
      >
        <header className="dia-no-laborable-modal-header">
          <div>
            <span className="dias-no-laborables-eyebrow">Configuración de asistencias</span>
            <h2 id="dia-no-laborable-modal-title">
              {dia ? 'Editar día no laborable' : 'Registrar día no laborable'}
            </h2>
          </div>
          <button
            type="button"
            className="dia-no-laborable-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar"
          >
            <GoogleIcon name="close" size={20} color="currentColor" />
          </button>
        </header>

        {(validationError || apiError) && (
          <div className="dias-no-laborables-alert" role="alert">
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{validationError ?? apiError}</span>
          </div>
        )}

        <form className="dia-no-laborable-form" onSubmit={handleSubmit} noValidate>
          <div className="dia-no-laborable-form-field">
            <label htmlFor="dia-no-laborable-fecha">Fecha</label>
            <input
              id="dia-no-laborable-fecha"
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              required
            />
          </div>

          <fieldset className="dia-no-laborable-scope">
            <legend>Ámbito del día no laborable</legend>
            <label>
              <input
                type="radio"
                name="dia-no-laborable-alcance"
                value="global"
                checked={alcance === 'global'}
                onChange={() => handleScopeChange('global')}
              />
              Global
            </label>
            <label>
              <input
                type="radio"
                name="dia-no-laborable-alcance"
                value="sede"
                checked={alcance === 'sede'}
                onChange={() => handleScopeChange('sede')}
              />
              Sede específica
            </label>
          </fieldset>

          {alcance === 'sede' && (
            <div className="dia-no-laborable-form-field">
              <label htmlFor="dia-no-laborable-sede">Sede activa</label>
              <select
                id="dia-no-laborable-sede"
                value={sedeId}
                onChange={(event) => setSedeId(event.target.value)}
                required
              >
                <option value="">Seleccionar sede</option>
                {dia?.sedeId !== null && dia && !sedes.some((sede) => sede.id === dia.sedeId) && (
                  <option value={dia.sedeId}>Sede #{dia.sedeId} (no activa)</option>
                )}
                {sedes.filter((sede) => sede.activo).map((sede) => (
                  <option value={sede.id} key={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div className="dia-no-laborable-form-field">
            <label htmlFor="dia-no-laborable-descripcion">Descripción</label>
            <textarea
              id="dia-no-laborable-descripcion"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              maxLength={250}
              rows={4}
              required
            />
            <small>{descripcion.length}/250 caracteres</small>
          </div>

          {alcance === 'global' && (
            <p className="dia-no-laborable-global-note">
              Este registro se aplicará globalmente. Se enviará sin sede asociada.
            </p>
          )}

          <footer className="dia-no-laborable-modal-footer">
            <button type="button" className="dia-no-laborable-button-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="dia-no-laborable-button-primary" disabled={saving}>
              <GoogleIcon name={saving ? 'hourglass_top' : 'save'} size={18} color="#fff" />
              {saving ? 'Guardando...' : dia ? 'Guardar cambios' : 'Registrar día'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
