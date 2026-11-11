import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MarcacionAsistenciaDto,
  MiAsistenciaDiariaDto,
  TipoMarcacionAsistencia,
} from '../../api/Dtos/Asistencia';
import { ETIQUETAS_MARCACION, TIPOS_MARCACION } from '../../api/Dtos/Asistencia';
import {
  obtenerMiAsistenciaDiaria,
  registrarMiMarcacion,
} from '../../api/services/asistencia.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './MiAsistencia.css';

function getToday(): string {
  const now = new Date();
  const year = now.toLocaleString('en-CA', { timeZone: 'America/Lima', year: 'numeric' });
  const month = now.toLocaleString('en-CA', { timeZone: 'America/Lima', month: '2-digit' });
  const day = now.toLocaleString('en-CA', { timeZone: 'America/Lima', day: '2-digit' });
  return `${year}-${month}-${day}`;
}

function formatTime(fechaHoraUtc: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(fechaHoraUtc));
}

function formatDate(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeZone: 'America/Lima',
  }).format(new Date(`${year}-${month}-${day}T12:00:00-05:00`));
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return 'Sin datos';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours} h ${remainder} min` : `${remainder} min`;
}

function getMarcacionByType(
  marcaciones: MarcacionAsistenciaDto[],
  tipo: TipoMarcacionAsistencia,
): MarcacionAsistenciaDto | undefined {
  return marcaciones.find((marcacion) => marcacion.tipo === tipo);
}

export default function MiAsistenciaPage() {
  const [fecha, setFecha] = useState(getToday);
  const [today, setToday] = useState(getToday);
  const [asistencia, setAsistencia] = useState<MiAsistenciaDiariaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setToday(getToday()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAsistencia(await obtenerMiAsistenciaDiaria(fecha));
    } catch (reason) {
      setAsistencia(null);
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar la asistencia.');
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    void load();
  }, [load]);

  const marcaciones = asistencia?.marcaciones ?? [];
  const hasCompletedAllMarks = useMemo(
    () => TIPOS_MARCACION.every((tipo) => getMarcacionByType(marcaciones, tipo)),
    [marcaciones],
  );
  const nextMark = TIPOS_MARCACION.find((tipo) => !getMarcacionByType(marcaciones, tipo));
  const isToday = fecha === today;
  const canMark = Boolean(
    asistencia &&
    isToday &&
    !asistencia.esNoLaborable &&
    asistencia.tieneHorario &&
    !hasCompletedAllMarks
  );

  const handleMark = async () => {
    if (fecha !== getToday()) {
      setError('Solo puedes marcar la asistencia del día actual en Lima.');
      return;
    }

    setMarking(true);
    setError(null);
    try {
      await registrarMiMarcacion();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la marcación.');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="asistencia-page asistencia-page--personal">
      <div className="asistencia-header">
        <div>
          <div className="asistencia-eyebrow">
            <GoogleIcon name="schedule" size={18} color="#2563eb" />
            Asistencias
          </div>
          <h1>Mi asistencia</h1>
          <p>Consulta tu jornada y registra la siguiente marcación disponible.</p>
        </div>
        <button
          type="button"
          className="asistencia-primary-button"
          onClick={handleMark}
          disabled={!canMark || marking || loading}
        >
          <GoogleIcon name="touch_app" size={18} color="#fff" />
          {marking ? 'Registrando...' : 'Marcar asistencia'}
        </button>
      </div>

      <div className="asistencia-date-toolbar">
        <label htmlFor="asistencia-fecha">Fecha de jornada</label>
        <input
          id="asistencia-fecha"
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
        />
        <button type="button" className="asistencia-refresh-button" onClick={() => void load()} disabled={loading}>
          <GoogleIcon name="refresh" size={18} color="#2563eb" />
          Actualizar
        </button>
      </div>

      {!isToday && (
        <div className="asistencia-alert asistencia-alert--info" role="status">
          <GoogleIcon name="info" size={20} color="#2563eb" />
          <span>Solo puedes marcar la asistencia del día actual en Lima. Puedes consultar esta fecha, pero no registrar marcaciones.</span>
        </div>
      )}

      {error && (
        <div className="asistencia-alert asistencia-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="asistencia-state">
          <span className="asistencia-spinner" aria-hidden="true" />
          <p>Cargando asistencia...</p>
        </div>
      )}

      {!loading && asistencia && (
        <>
          {(asistencia.esNoLaborable || !asistencia.tieneHorario || hasCompletedAllMarks) && (
            <div className="asistencia-alert asistencia-alert--info">
              <GoogleIcon name={asistencia.esNoLaborable ? 'event_busy' : 'info'} size={20} color="#2563eb" />
              <span>
                {asistencia.esNoLaborable
                  ? asistencia.motivoNoLaborable || 'Este día no es laborable.'
                  : !asistencia.tieneHorario
                    ? 'No tienes un horario configurado para esta jornada.'
                    : 'Ya registraste las cuatro marcaciones de esta jornada.'}
              </span>
            </div>
          )}

          <div className="asistencia-summary-grid">
            <div className="asistencia-summary-card">
              <span>Jornada</span>
              <strong>{formatDate(asistencia.fechaJornada)}</strong>
            </div>
            <div className="asistencia-summary-card">
              <span>Tiempo trabajado</span>
              <strong>{formatMinutes(asistencia.minutosTrabajados)}</strong>
            </div>
            <div className="asistencia-summary-card">
              <span>Descanso</span>
              <strong>{formatMinutes(asistencia.minutosDescanso)}</strong>
            </div>
          </div>

          <section className="asistencia-card" aria-labelledby="marcaciones-title">
            <div className="asistencia-card-header">
              <div>
                <h2 id="marcaciones-title">Marcaciones de la jornada</h2>
                <p>Hora local de Perú (UTC-5).</p>
                <p>
                  {nextMark === undefined
                    ? 'Jornada completa.'
                    : `Siguiente marcación: ${ETIQUETAS_MARCACION[nextMark]}.`}
                </p>
              </div>
              <span className="asistencia-count">{marcaciones.length}/4</span>
            </div>
            <div className="asistencia-marks-grid">
              {TIPOS_MARCACION.map((tipo) => {
                const marcacion = getMarcacionByType(marcaciones, tipo);
                return (
                  <div className={`asistencia-mark${marcacion ? ' asistencia-mark--done' : ''}`} key={tipo}>
                    <span className="asistencia-mark-icon">
                      <GoogleIcon name={marcacion ? 'check_circle' : 'radio_button_unchecked'} size={22} />
                    </span>
                    <div>
                      <strong>{ETIQUETAS_MARCACION[tipo]}</strong>
                      <span>{marcacion ? formatTime(marcacion.fechaHoraUtc) : 'Pendiente'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {!loading && !asistencia && !error && (
        <div className="asistencia-state">
          <GoogleIcon name="event_note" size={36} color="#94a3b8" />
          <p>No hay información de asistencia para la fecha seleccionada.</p>
        </div>
      )}
    </div>
  );
}
