import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  ExcepcionHorarioEmpleadoRequest,
  ExcepcionHorarioEmpleadoResponse,
} from '../../api/Dtos/ExcepcionHorarioEmpleado';
import type {
  CatalogoAsistenciaEmpleadoDto,
  EstadoCatalogoAsistencia,
} from '../../api/Dtos/CatalogoAsistenciaEmpleado';
import {
  actualizarExcepcionHorario,
  crearExcepcionHorario,
  obtenerExcepcionesPorEmpleado,
} from '../../api/services/configuracionAsistencia.service';
import { getCatalogoAsistenciaEmpleados } from '../../api/services/empleado.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './ExcepcionesHorario.css';
import ExcepcionHorarioFormModal from './components/ExcepcionHorarioFormModal';

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function formatTime(value: string | null): string {
  return value?.slice(0, 5) ?? '—';
}

export default function ExcepcionesHorarioPage() {
  const [empleados, setEmpleados] = useState<CatalogoAsistenciaEmpleadoDto[]>([]);
  const [estadoCatalogo, setEstadoCatalogo] = useState<EstadoCatalogoAsistencia>('activo');
  const [estadoAplicado, setEstadoAplicado] = useState<EstadoCatalogoAsistencia>('activo');
  const [buscar, setBuscar] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [empleadoId, setEmpleadoId] = useState('');
  const [excepciones, setExcepciones] = useState<ExcepcionHorarioEmpleadoResponse[]>([]);
  const [excepcionesLoading, setExcepcionesLoading] = useState(false);
  const [excepcionesError, setExcepcionesError] = useState<string | null>(null);
  const [excepcionesLoaded, setExcepcionesLoaded] = useState(false);
  const [modalExcepcion, setModalExcepcion] = useState<ExcepcionHorarioEmpleadoResponse | null | undefined>();
  const catalogRequestId = useRef(0);
  const excepcionesRequestId = useRef(0);

  const empleadoSeleccionado = useMemo(
    () => empleados.find((empleado) => empleado.id === Number(empleadoId)) ?? null,
    [empleados, empleadoId],
  );

  const loadCatalog = useCallback(async (
    estado: EstadoCatalogoAsistencia,
    textoBuscar: string,
  ) => {
    const requestId = ++catalogRequestId.current;
    setCatalogLoading(true);
    setCatalogError(null);
    setEmpleados([]);
    setEmpleadoId('');
    setExcepciones([]);
    setExcepcionesLoaded(false);
    setExcepcionesError(null);
    excepcionesRequestId.current += 1;

    try {
      const data = await getCatalogoAsistenciaEmpleados({
        estado,
        buscar: textoBuscar.trim() || undefined,
      });
      if (requestId !== catalogRequestId.current) return;
      setEmpleados(data);
      setEstadoAplicado(estado);
    } catch (reason) {
      if (requestId !== catalogRequestId.current) return;
      setCatalogError(reason instanceof Error ? reason.message : 'No se pudo cargar el catálogo de empleados.');
    } finally {
      if (requestId === catalogRequestId.current) setCatalogLoading(false);
    }
  }, []);

  const loadExcepciones = useCallback(async (id: number): Promise<boolean> => {
    const requestId = ++excepcionesRequestId.current;
    setExcepcionesLoading(true);
    setExcepcionesError(null);
    setExcepcionesLoaded(false);

    try {
      const data = await obtenerExcepcionesPorEmpleado(id);
      if (requestId !== excepcionesRequestId.current) return false;
      setExcepciones(
        [...data].sort((a, b) =>
          a.fechaInicio.localeCompare(b.fechaInicio) ||
          a.fechaFin.localeCompare(b.fechaFin),
        ),
      );
      setExcepcionesLoaded(true);
      return true;
    } catch (reason) {
      if (requestId !== excepcionesRequestId.current) return false;
      setExcepciones([]);
      setExcepcionesError(reason instanceof Error ? reason.message : 'No se pudieron cargar las excepciones.');
      return false;
    } finally {
      if (requestId === excepcionesRequestId.current) setExcepcionesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog('activo', '');
  }, [loadCatalog]);

  useEffect(() => {
    if (!empleadoId) {
      excepcionesRequestId.current += 1;
      setExcepciones([]);
      setExcepcionesLoading(false);
      setExcepcionesLoaded(false);
      setExcepcionesError(null);
      return;
    }

    void loadExcepciones(Number(empleadoId));
    return () => {
      excepcionesRequestId.current += 1;
    };
  }, [empleadoId, loadExcepciones]);

  const handleCatalogSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadCatalog(estadoCatalogo, buscar);
  };

  const handleSave = async (
    request: ExcepcionHorarioEmpleadoRequest,
    existing: ExcepcionHorarioEmpleadoResponse | null,
  ) => {
    if (existing) {
      await actualizarExcepcionHorario(existing.id, request);
    } else {
      await crearExcepcionHorario(request);
    }

    setModalExcepcion(undefined);
    const refreshed = await loadExcepciones(request.empleadoId);
    await Swal.fire({
      icon: refreshed ? 'success' : 'warning',
      title: refreshed ? 'Excepción guardada' : 'Guardado con actualización pendiente',
      text: refreshed
        ? `La excepción se ${existing ? 'actualizó' : 'registró'} correctamente.`
        : 'El servidor confirmó el guardado, pero no se pudo actualizar la lista. Intenta recargarla.',
      confirmButtonColor: '#2563eb',
    });
  };

  return (
    <div className="excepciones-horario-page">
      <header className="excepciones-horario-header">
        <div>
          <div className="excepciones-horario-eyebrow">
            <GoogleIcon name="event_repeat" size={18} color="#2563eb" />
            Configuración de asistencias
          </div>
          <h1>Excepciones de horario</h1>
          <p>Consulta y administra los rangos de horario especiales de cada empleado.</p>
        </div>
      </header>

      <form className="excepciones-catalog-filters" onSubmit={handleCatalogSearch}>
        <div className="excepciones-field">
          <label htmlFor="excepciones-estado">Estado del empleado</label>
          <select
            id="excepciones-estado"
            value={estadoCatalogo}
            onChange={(event) => setEstadoCatalogo(event.target.value as EstadoCatalogoAsistencia)}
            disabled={catalogLoading || modalExcepcion !== undefined}
          >
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>
        <div className="excepciones-field excepciones-search-field">
          <label htmlFor="excepciones-buscar">Buscar empleado</label>
          <input
            id="excepciones-buscar"
            type="search"
            value={buscar}
            onChange={(event) => setBuscar(event.target.value)}
            placeholder="Nombre del empleado"
            disabled={catalogLoading || modalExcepcion !== undefined}
          />
        </div>
        <button
          type="submit"
          className="excepciones-button-secondary"
          disabled={catalogLoading || modalExcepcion !== undefined}
        >
          <GoogleIcon name={catalogLoading ? 'hourglass_top' : 'search'} size={18} color="#2563eb" />
          {catalogLoading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {catalogError && (
        <div className="excepciones-alert" role="alert">
          <GoogleIcon name="error" size={19} color="#dc2626" />
          <span>{catalogError}</span>
          <button type="button" onClick={() => void loadCatalog(estadoAplicado, buscar)}>Reintentar</button>
        </div>
      )}

      <section className="excepciones-employee-selector">
        <div className="excepciones-field">
          <label htmlFor="excepciones-empleado">Empleado</label>
          {catalogLoading ? (
            <div className="excepciones-loading">
              <span className="excepciones-spinner" aria-hidden="true" />
              Cargando catálogo...
            </div>
          ) : (
            <select
              id="excepciones-empleado"
              value={empleadoId}
              onChange={(event) => setEmpleadoId(event.target.value)}
              disabled={Boolean(catalogError) || empleados.length === 0 || modalExcepcion !== undefined}
            >
              <option value="">Seleccionar empleado</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombreCompleto}
                  {empleado.sedeNombre ? ` — ${empleado.sedeNombre}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        {empleadoSeleccionado && (
          <span className={`excepciones-employee-status${empleadoSeleccionado.activo ? '' : ' excepciones-employee-status--inactive'}`}>
            {empleadoSeleccionado.activo ? 'Empleado activo' : 'Empleado inactivo'}
          </span>
        )}
      </section>

      {!catalogLoading && !catalogError && empleados.length === 0 && (
        <div className="excepciones-state">
          <GoogleIcon name="person_search" size={38} color="#94a3b8" />
          <h2>No hay empleados {estadoAplicado === 'activo' ? 'activos' : 'inactivos'} para mostrar</h2>
          <p>Prueba otra búsqueda o cambia el estado del catálogo.</p>
        </div>
      )}

      {empleadoSeleccionado && !empleadoSeleccionado.activo && (
        <div className="excepciones-info" role="status">
          <GoogleIcon name="info" size={19} color="#b45309" />
          <span>Las excepciones existentes se pueden consultar. El backend requiere que el empleado esté activo para registrar o editar.</span>
        </div>
      )}

      {empleadoSeleccionado && (
        <section className="excepciones-results" aria-labelledby="excepciones-list-title">
          <div className="excepciones-results-header">
            <div>
              <h2 id="excepciones-list-title">Excepciones registradas</h2>
              <p>{empleadoSeleccionado.nombreCompleto}</p>
            </div>
            <button
              type="button"
              className="excepciones-button-primary"
              onClick={() => setModalExcepcion(null)}
              disabled={!empleadoSeleccionado.activo || !excepcionesLoaded || excepcionesLoading || modalExcepcion !== undefined}
            >
              <GoogleIcon name="add" size={18} color="#fff" />
              Nueva excepción
            </button>
          </div>

          {excepcionesError && (
            <div className="excepciones-alert" role="alert">
              <GoogleIcon name="error" size={19} color="#dc2626" />
              <span>{excepcionesError}</span>
              <button type="button" onClick={() => void loadExcepciones(empleadoSeleccionado.id)}>Reintentar</button>
            </div>
          )}

          {excepcionesLoading ? (
            <div className="excepciones-state excepciones-state--compact">
              <span className="excepciones-spinner" aria-hidden="true" />
              <p>Cargando excepciones...</p>
            </div>
          ) : excepcionesLoaded && !excepcionesError && excepciones.length === 0 ? (
            <div className="excepciones-state excepciones-state--compact">
              <GoogleIcon name="event_available" size={34} color="#94a3b8" />
              <h3>Sin excepciones registradas</h3>
              <p>Este empleado todavía no tiene excepciones de horario.</p>
            </div>
          ) : excepcionesLoaded && !excepcionesError && (
            <div className="excepciones-list">
              {excepciones.map((excepcion) => (
                <article className="excepcion-card" key={excepcion.id}>
                  <div className="excepcion-card-header">
                    <div>
                      <span className={`excepcion-kind${excepcion.esLaborable ? ' excepcion-kind--working' : ' excepcion-kind--off'}`}>
                        <GoogleIcon
                          name={excepcion.esLaborable ? 'work' : 'event_busy'}
                          size={16}
                          color={excepcion.esLaborable ? '#15803d' : '#475569'}
                        />
                        {excepcion.esLaborable ? 'Laborable' : 'No laborable'}
                      </span>
                      <h3>{formatDate(excepcion.fechaInicio)} – {formatDate(excepcion.fechaFin)}</h3>
                    </div>
                    <button
                      type="button"
                      className="excepciones-button-secondary"
                      onClick={() => setModalExcepcion(excepcion)}
                      disabled={!empleadoSeleccionado.activo || !excepcionesLoaded || modalExcepcion !== undefined}
                    >
                      <GoogleIcon name="edit" size={17} color="#2563eb" />
                      Editar
                    </button>
                  </div>

                  {excepcion.esLaborable && (
                    <div className="excepcion-card-times">
                      <div><span>Ingreso 1</span><strong>{formatTime(excepcion.horaIngreso1)}</strong></div>
                      <div><span>Salida 1</span><strong>{formatTime(excepcion.horaSalida1)}</strong></div>
                      <div><span>Ingreso 2</span><strong>{formatTime(excepcion.horaIngreso2)}</strong></div>
                      <div><span>Salida 2</span><strong>{formatTime(excepcion.horaSalida2)}</strong></div>
                    </div>
                  )}
                  <p className="excepcion-card-reason"><strong>Motivo:</strong> {excepcion.motivo}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {modalExcepcion !== undefined && empleadoSeleccionado && excepcionesLoaded && (
        <ExcepcionHorarioFormModal
          empleado={empleadoSeleccionado}
          excepciones={excepciones}
          excepcion={modalExcepcion}
          onClose={() => setModalExcepcion(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
