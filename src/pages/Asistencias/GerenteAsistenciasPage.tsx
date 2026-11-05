import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { AsistenciaDiariaResponseDto } from '../../api/Dtos/Asistencia';
import type {
  CatalogoAsistenciaEmpleadoDto,
  EstadoCatalogoAsistencia,
} from '../../api/Dtos/CatalogoAsistenciaEmpleado';
import type { SedeDto } from '../../api/Dtos/Sede';
import {
  obtenerAsistenciasPorEmpleado,
  obtenerAsistenciasPorSede,
} from '../../api/services/asistencia.service';
import { getCatalogoAsistenciaEmpleados } from '../../api/services/empleado.service';
import { getSedes } from '../../api/services/sede.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './MiAsistencia.css';
import AsistenciaJornadaDetails from './components/AsistenciaJornadaDetails';

interface AsistenciaEmpleadoGroup {
  empleadoId: number;
  empleadoNombre: string;
  jornadas: AsistenciaDiariaResponseDto[];
}

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

export default function GerenteAsistenciasPage() {
  const [empleados, setEmpleados] = useState<CatalogoAsistenciaEmpleadoDto[]>([]);
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [sedesLoading, setSedesLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sedesError, setSedesError] = useState<string | null>(null);
  const [estadoEmpleados, setEstadoEmpleados] = useState<EstadoCatalogoAsistencia>('activo');
  const [empleadoId, setEmpleadoId] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [fechaInicio, setFechaInicio] = useState(getMonthStart);
  const [fechaFin, setFechaFin] = useState(getToday);
  const [historial, setHistorial] = useState<AsistenciaDiariaResponseDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError(null);
    getCatalogoAsistenciaEmpleados({ estado: estadoEmpleados })
      .then((employees) => {
        if (!active) return;
        setEmpleados(employees);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setEmpleados([]);
        setCatalogError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo de empleados.');
      })
      .finally(() => {
        if (active) setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [estadoEmpleados]);

  useEffect(() => {
    let active = true;
    setSedesLoading(true);
    setSedesError(null);
    getSedes()
      .then((locations) => {
        if (active) setSedes(locations);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setSedesError(reason instanceof Error ? reason.message : 'No se pudieron cargar las sedes.');
      })
      .finally(() => {
        if (active) setSedesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const empleadoNombres = useMemo(
    () => new Map(empleados.map((empleado) => [empleado.id, empleado.nombreCompleto])),
    [empleados],
  );

  const groups = useMemo<AsistenciaEmpleadoGroup[]>(() => {
    const grouped = new Map<number, AsistenciaEmpleadoGroup>();

    for (const asistencia of historial) {
      const attendanceName = asistencia.marcaciones.find((marcacion) => marcacion.empleadoNombre)?.empleadoNombre;
      const empleadoNombre =
        attendanceName ?? empleadoNombres.get(asistencia.empleadoId) ?? `Empleado #${asistencia.empleadoId}`;
      const group = grouped.get(asistencia.empleadoId) ?? {
        empleadoId: asistencia.empleadoId,
        empleadoNombre,
        jornadas: [],
      };
      group.jornadas.push(asistencia);
      grouped.set(asistencia.empleadoId, group);
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        jornadas: [...group.jornadas].sort((a, b) => b.fechaJornada.localeCompare(a.fechaJornada)),
      }))
      .sort((a, b) => a.empleadoNombre.localeCompare(b.empleadoNombre, 'es'));
  }, [empleadoNombres, historial]);

  const dateRangeValid = Boolean(fechaInicio && fechaFin && fechaInicio <= fechaFin);

  const clearResults = () => {
    setHistorial([]);
    setHasSearched(false);
    setError(null);
  };

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setHistorial([]);
    setHasSearched(false);

    if (!empleadoId && !sedeId) {
      setError('Selecciona un empleado o una sede para consultar. No se realizará una consulta global.');
      return;
    }

    if (!dateRangeValid) {
      setError('Selecciona ambas fechas y verifica que la fecha inicial no sea posterior a la final.');
      return;
    }

    setLoading(true);
    try {
      const results = empleadoId
        ? await obtenerAsistenciasPorEmpleado(Number(empleadoId), fechaInicio, fechaFin)
        : await obtenerAsistenciasPorSede(Number(sedeId), fechaInicio, fechaFin);
      setHistorial(results);
      setHasSearched(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar las asistencias.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="asistencia-page">
      <div className="asistencia-header">
        <div>
          <div className="asistencia-eyebrow">
            <GoogleIcon name="event_available" size={18} color="#2563eb" />
            Supervisión de Asistencias
          </div>
          <h1>Consultar asistencias</h1>
          <p>Consulta jornadas por empleado o sede dentro de un periodo.</p>
        </div>
      </div>

      {(catalogError || sedesError) && (
        <div className="asistencia-alert asistencia-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{[catalogError, sedesError].filter(Boolean).join(' ')}</span>
        </div>
      )}

      <form className="asistencia-date-toolbar gerente-asistencia-filters" onSubmit={handleSearch}>
        <div className="gerente-asistencia-filter">
          <label htmlFor="gerente-asistencia-estado">Estado del empleado</label>
          <select
            id="gerente-asistencia-estado"
            value={estadoEmpleados}
            onChange={(event) => {
              const nextStatus = event.target.value;
              if (nextStatus !== 'activo' && nextStatus !== 'inactivo') return;
              setEstadoEmpleados(nextStatus);
              setEmpleadoId('');
              clearResults();
            }}
            disabled={catalogLoading || loading}
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="gerente-asistencia-filter">
          <label htmlFor="gerente-asistencia-sede">Sede</label>
          <select
            id="gerente-asistencia-sede"
            value={sedeId}
            onChange={(event) => {
              setSedeId(event.target.value);
              clearResults();
            }}
            disabled={sedesLoading}
          >
            <option value="">Seleccionar sede</option>
            {sedes.map((sede) => (
              <option value={sede.id} key={sede.id}>{sede.nombre}</option>
            ))}
          </select>
        </div>

        <div className="gerente-asistencia-filter">
          <label htmlFor="gerente-asistencia-empleado">Empleado</label>
          <select
            id="gerente-asistencia-empleado"
            value={empleadoId}
            onChange={(event) => {
              setEmpleadoId(event.target.value);
              clearResults();
            }}
            disabled={catalogLoading || loading}
          >
            <option value="">Seleccionar empleado</option>
            {empleados.map((empleado) => (
              <option value={empleado.id} key={empleado.id}>
                {empleado.nombreCompleto}
                {empleado.sedeNombre ? ` — ${empleado.sedeNombre}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="gerente-asistencia-filter gerente-asistencia-filter--date">
          <label htmlFor="gerente-asistencia-desde">Desde</label>
          <input
            id="gerente-asistencia-desde"
            type="date"
            value={fechaInicio}
            onChange={(event) => {
              setFechaInicio(event.target.value);
              clearResults();
            }}
            required
          />
        </div>

        <div className="gerente-asistencia-filter gerente-asistencia-filter--date">
          <label htmlFor="gerente-asistencia-hasta">Hasta</label>
          <input
            id="gerente-asistencia-hasta"
            type="date"
            value={fechaFin}
            onChange={(event) => {
              setFechaFin(event.target.value);
              clearResults();
            }}
            required
          />
        </div>

        <button
          type="submit"
          className="asistencia-refresh-button"
          disabled={catalogLoading || (sedesLoading && !empleadoId) || loading || !dateRangeValid}
        >
          <GoogleIcon name="search" size={18} color="#2563eb" />
          Consultar
        </button>
      </form>

      {empleadoId && sedeId && (
        <p className="gerente-asistencia-hint">
          Al seleccionar un empleado, la consulta se realizará por empleado; el filtro de sede no se aplica al mismo tiempo.
        </p>
      )}

      {!catalogError && !sedesError && !catalogLoading && !sedesLoading && !empleadoId && !sedeId && (
        <div className="asistencia-state">
          <GoogleIcon name="filter_alt" size={34} color="#94a3b8" />
          <p>Selecciona un empleado o una sede para consultar asistencias.</p>
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
          <p>Consultando asistencias...</p>
        </div>
      )}

      {hasSearched && !loading && !error && groups.length === 0 && (
        <div className="asistencia-state">
          <GoogleIcon name="event_note" size={36} color="#94a3b8" />
          <p>No se encontraron jornadas para los filtros seleccionados.</p>
        </div>
      )}

      {hasSearched && !loading && !error && groups.length > 0 && (
        <div className="gerente-asistencia-results">
          <p className="gerente-asistencia-result-count">
            {groups.length} {groups.length === 1 ? 'empleado' : 'empleados'} · {historial.length}{' '}
            {historial.length === 1 ? 'jornada' : 'jornadas'}
          </p>
          {groups.map((group) => (
            <section className="gerente-asistencia-employee" key={group.empleadoId}>
              <h2>{group.empleadoNombre}</h2>
              <div className="asistencia-history-list">
                {group.jornadas.map((jornada) => (
                  <AsistenciaJornadaDetails
                    asistencia={jornada}
                    key={`${jornada.empleadoId}-${jornada.fechaJornada}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
