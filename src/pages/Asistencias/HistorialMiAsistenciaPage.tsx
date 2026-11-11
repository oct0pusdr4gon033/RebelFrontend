import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AsistenciaDiariaResponseDto,
} from '../../api/Dtos/Asistencia';
import { obtenerMiHistorialAsistencia } from '../../api/services/asistencia.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './MiAsistencia.css';
import AsistenciaJornadaDetails from './components/AsistenciaJornadaDetails';

function getPeruDateParts(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
}

function getToday(): string {
  const { year, month, day } = getPeruDateParts(new Date());
  return `${year}-${month}-${day}`;
}

function getMonthStart(): string {
  const { year, month } = getPeruDateParts(new Date());
  return `${year}-${month}-01`;
}

export default function HistorialMiAsistenciaPage() {
  const [fechaInicio, setFechaInicio] = useState(getMonthStart);
  const [fechaFin, setFechaFin] = useState(getToday);
  const [query, setQuery] = useState(() => ({
    fechaInicio: getMonthStart(),
    fechaFin: getToday(),
  }));
  const [historial, setHistorial] = useState<AsistenciaDiariaResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangoValido = Boolean(fechaInicio && fechaFin && fechaInicio <= fechaFin);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHistorial(await obtenerMiHistorialAsistencia(query.fechaInicio, query.fechaFin));
    } catch (reason) {
      setHistorial([]);
      setError(reason instanceof Error ? reason.message : 'No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  }, [query.fechaFin, query.fechaInicio]);

  useEffect(() => {
    void load();
  }, [load]);

  const jornadas = useMemo(
    () => [...historial].sort((a, b) => b.fechaJornada.localeCompare(a.fechaJornada)),
    [historial],
  );

  return (
    <div className="asistencia-page asistencia-page--personal">
      <div className="asistencia-header">
        <div>
          <div className="asistencia-eyebrow">
            <GoogleIcon name="history" size={18} color="#2563eb" />
            Asistencias
          </div>
          <h1>Historial de mi asistencia</h1>
          <p>Consulta tus jornadas registradas en el periodo seleccionado.</p>
        </div>
      </div>

      <form
        className="asistencia-date-toolbar asistencia-history-filters"
        onSubmit={(event) => {
          event.preventDefault();
          if (rangoValido) {
            setQuery({ fechaInicio, fechaFin });
          }
        }}
      >
        <label htmlFor="historial-fecha-inicio">Desde</label>
        <input
          id="historial-fecha-inicio"
          type="date"
          value={fechaInicio}
          onChange={(event) => setFechaInicio(event.target.value)}
          required
        />
        <label htmlFor="historial-fecha-fin">Hasta</label>
        <input
          id="historial-fecha-fin"
          type="date"
          value={fechaFin}
          onChange={(event) => setFechaFin(event.target.value)}
          required
        />
        <button type="submit" className="asistencia-refresh-button" disabled={loading || !rangoValido}>
          <GoogleIcon name="search" size={18} color="#2563eb" />
          Consultar
        </button>
      </form>

      {!rangoValido && (
        <div className="asistencia-alert asistencia-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>Selecciona ambas fechas y verifica que la fecha inicial no sea posterior a la final.</span>
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
          <p>Cargando historial...</p>
        </div>
      )}

      {!loading && !error && jornadas.length === 0 && (
        <div className="asistencia-state">
          <GoogleIcon name="event_note" size={36} color="#94a3b8" />
          <p>No hay jornadas registradas en el periodo seleccionado.</p>
        </div>
      )}

      {!loading && !error && jornadas.length > 0 && (
        <div className="asistencia-history-list">
          {jornadas.map((jornada) => (
            <AsistenciaJornadaDetails
              asistencia={jornada}
              key={`${jornada.empleadoId}-${jornada.fechaJornada}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
