import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type {
  EstadoTicket,
} from '../../api/Dtos/Ticket';
import {
  AREAS_TICKET,
  CATEGORIAS_TICKET,
  ESTADOS_TICKET,
  ETIQUETAS_AREA_TICKET,
  ETIQUETAS_CATEGORIA_TICKET,
  ETIQUETAS_ESTADO_TICKET,
  ETIQUETAS_PRIORIDAD_TICKET,
  PRIORIDADES_TICKET,
} from '../../api/Dtos/Ticket';
import type { AsistenciaEstadisticasPersonalesResponseDto } from '../../api/Dtos/AsistenciaEstadisticas';
import type {
  AreaTicketEstadisticaDto,
  CategoriaTicketEstadisticaDto,
  EstadoTicketEstadisticaDto,
  FrecuenciaAtencionTicketDto,
  PrioridadTicketEstadisticaDto,
  TicketDashboardGlobalResponseDto,
} from '../../api/Dtos/TicketEstadisticas';
import {
  obtenerEstadisticasGlobalesTickets,
  obtenerEstadisticasPersonalesAsistencia,
  type PeriodoEstadisticas,
} from '../../api/services/dashboardEstadisticas.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import './DashboardsEstadisticas.css';

type PresetPeriodo = 'hoy' | 'semana' | 'mes' | 'personalizado';
type Cargador<T> = (periodo: PeriodoEstadisticas) => Promise<T>;

const ETIQUETAS_PRESET: Record<PresetPeriodo, string> = {
  hoy: 'Hoy',
  semana: 'Esta semana',
  mes: 'Este mes',
  personalizado: 'Periodo personalizado',
};

function hoyEnLima(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find((item) => item.type === tipo)?.value ?? '';
  return `${parte('year')}-${parte('month')}-${parte('day')}`;
}

function diaOrdinal(fecha: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const [year, month, day] = fecha.split('-').map(Number);
  const milliseconds = Date.UTC(year, month - 1, day);
  const date = new Date(milliseconds);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return Math.floor(milliseconds / 86_400_000);
}

function fechaDesdeOrdinal(ordinal: number): string {
  return new Date(ordinal * 86_400_000).toISOString().slice(0, 10);
}

function rangoPreset(preset: Exclude<PresetPeriodo, 'personalizado'>): PeriodoEstadisticas {
  const hoy = hoyEnLima();
  const ordinalHoy = diaOrdinal(hoy) ?? 0;
  if (preset === 'hoy') return { fechaInicio: hoy, fechaFin: hoy };

  if (preset === 'semana') {
    const diaSemana = new Date(ordinalHoy * 86_400_000).getUTCDay();
    const desdeLunes = (diaSemana + 6) % 7;
    return {
      fechaInicio: fechaDesdeOrdinal(ordinalHoy - desdeLunes),
      fechaFin: hoy,
    };
  }

  return {
    fechaInicio: `${hoy.slice(0, 7)}-01`,
    fechaFin: hoy,
  };
}

function validarPeriodo(periodo: PeriodoEstadisticas): string | null {
  const inicio = diaOrdinal(periodo.fechaInicio);
  const fin = diaOrdinal(periodo.fechaFin);
  if (inicio === null || fin === null) return 'Selecciona fechas válidas.';
  if (inicio > fin) return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
  if (fin - inicio + 1 > 366) return 'El periodo no puede superar 366 días.';
  if (periodo.fechaFin === '9999-12-31') return 'Selecciona una fecha de fin anterior al 31/12/9999.';
  return null;
}

function PeriodoSelector({
  periodo,
  alCambiar,
  disabled,
}: {
  periodo: PeriodoEstadisticas;
  alCambiar: (periodo: PeriodoEstadisticas) => void;
  disabled: boolean;
}) {
  const [preset, setPreset] = useState<PresetPeriodo>('semana');
  const [borrador, setBorrador] = useState<PeriodoEstadisticas>(() => rangoPreset('semana'));
  const [error, setError] = useState<string | null>(null);

  const seleccionar = (value: PresetPeriodo) => {
    setPreset(value);
    setError(null);
    if (value === 'personalizado') {
      setBorrador(periodo);
      return;
    }
    alCambiar(rangoPreset(value));
  };

  const aplicarPeriodo = () => {
    const validationError = validarPeriodo(borrador);
    setError(validationError);
    if (!validationError) alCambiar(borrador);
  };

  return (
    <div className="statsdash__period">
      <label htmlFor="statsdash-period-select">Periodo</label>
      <select
        id="statsdash-period-select"
        value={preset}
        onChange={(event) => seleccionar(event.target.value as PresetPeriodo)}
        disabled={disabled}
      >
        {(Object.keys(ETIQUETAS_PRESET) as PresetPeriodo[]).map((value) => (
          <option value={value} key={value}>{ETIQUETAS_PRESET[value]}</option>
        ))}
      </select>
      {preset === 'personalizado' && (
        <div className="statsdash__custom-period">
          <label>
            Desde
            <input
              type="date"
              value={borrador.fechaInicio}
              onChange={(event) => {
                setError(null);
                setBorrador((current) => ({ ...current, fechaInicio: event.target.value }));
              }}
              disabled={disabled}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={borrador.fechaFin}
              onChange={(event) => {
                setError(null);
                setBorrador((current) => ({ ...current, fechaFin: event.target.value }));
              }}
              disabled={disabled}
            />
          </label>
          <button type="button" onClick={aplicarPeriodo} disabled={disabled}>
            Aplicar
          </button>
        </div>
      )}
      {error && <span className="statsdash__period-error" role="alert">{error}</span>}
      <span className="statsdash__period-summary">
        {periodo.fechaInicio} — {periodo.fechaFin}
      </span>
    </div>
  );
}

function useEstadisticas<T>(cargar: Cargador<T>) {
  const [periodo, setPeriodoInterno] = useState<PeriodoEstadisticas>(() => rangoPreset('semana'));
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cambiarPeriodo = (nuevoPeriodo: PeriodoEstadisticas) => {
    const validationError = validarPeriodo(nuevoPeriodo);
    if (validationError) {
      setDatos(null);
      setError(validationError);
      setCargando(false);
      return;
    }

    setDatos(null);
    setCargando(true);
    setError(null);
    setPeriodoInterno(nuevoPeriodo);
  };

  useEffect(() => {
    let vigente = true;
    void cargar(periodo)
      .then((resultado) => {
        if (vigente) setDatos(resultado);
      })
      .catch((reason: unknown) => {
        if (vigente) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las estadísticas.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => { vigente = false; };
  }, [cargar, periodo]);

  return { periodo, setPeriodo: cambiarPeriodo, datos, cargando, error };
}

function EncabezadoDashboard({
  icon,
  titulo,
  descripcion,
  periodo,
  alCambiarPeriodo,
  cargando,
}: {
  icon: string;
  titulo: string;
  descripcion: string;
  periodo: PeriodoEstadisticas;
  alCambiarPeriodo: (periodo: PeriodoEstadisticas) => void;
  cargando: boolean;
}) {
  return (
    <header className="statsdash__header">
      <div>
        <div className="statsdash__eyebrow">
          <GoogleIcon name={icon} size={18} color="#2563eb" />
          Estadísticas
        </div>
        <h1>{titulo}</h1>
        <p>{descripcion}</p>
      </div>
      <PeriodoSelector periodo={periodo} alCambiar={alCambiarPeriodo} disabled={cargando} />
    </header>
  );
}

function EstadoCarga({ cargando, error }: { cargando: boolean; error: string | null }) {
  if (cargando) {
    return (
      <div className="statsdash__state" role="status">
        <span className="statsdash__spinner" aria-hidden="true" />
        Consultando estadísticas…
      </div>
    );
  }
  if (error) {
    return (
      <div className="statsdash__error" role="alert">
        <GoogleIcon name="error" size={20} color="#b91c1c" />
        {error}
      </div>
    );
  }
  return null;
}

function Panel({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
}) {
  return (
    <section className="statsdash__panel">
      <header className="statsdash__panel-header">
        <div>
          <h2>{titulo}</h2>
          {descripcion && <p>{descripcion}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function TarjetaKpi({
  icon,
  titulo,
  valor,
  detalle,
}: {
  icon: string;
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <article className="statsdash__kpi">
      <span className="statsdash__kpi-icon"><GoogleIcon name={icon} size={21} color="#2563eb" /></span>
      <span className="statsdash__kpi-label">{titulo}</span>
      <strong className="statsdash__kpi-value">{valor}</strong>
      {detalle && <span className="statsdash__kpi-detail">{detalle}</span>}
    </article>
  );
}

function ListaDistribucion({ items }: { items: { etiqueta: string; cantidad: number }[] }) {
  if (items.length === 0) return <p className="statsdash__empty">Sin datos para el periodo seleccionado.</p>;
  const maximo = Math.max(1, ...items.map((item) => item.cantidad));
  return (
    <ul className="statsdash__distribution">
      {items.map((item) => (
        <li key={item.etiqueta}>
          <div className="statsdash__distribution-top">
            <span>{item.etiqueta}</span>
            <strong>{item.cantidad}</strong>
          </div>
          <div className="statsdash__track">
            <span style={{ width: `${(item.cantidad / maximo) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function GraficoFrecuencia({
  items,
  mensajeVacio = 'Sin resoluciones para el periodo seleccionado.',
}: {
  items: { fecha: string; cantidad: number }[];
  mensajeVacio?: string;
}) {
  if (items.length === 0) return <p className="statsdash__empty">{mensajeVacio}</p>;
  const maximo = Math.max(1, ...items.map((item) => item.cantidad));
  return (
    <div className="statsdash__chart-scroll">
      <div className="statsdash__bars">
        {items.map((item) => (
          <div className="statsdash__bar-item" key={item.fecha}>
            <strong>{item.cantidad}</strong>
            <div className="statsdash__bar-track">
              <span style={{ height: `${Math.max(3, (item.cantidad / maximo) * 100)}%` }} />
            </div>
            <span>{etiquetaFecha(item.fecha)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function etiquetaFecha(fecha: string): string {
  const ordinal = diaOrdinal(fecha);
  if (ordinal === null) return fecha;
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(ordinal * 86_400_000));
}

function formatoMinutos(valor: number | null): string {
  return valor === null ? 'Sin datos suficientes' : `${new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 1,
  }).format(valor)} min`;
}

function formatoPromedio(valor: number | null): string {
  return valor === null
    ? 'Sin datos suficientes'
    : new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(valor);
}

function formatoHora(valor: string | null): string {
  if (valor === null) return 'Sin datos suficientes';
  const coincidencia = /^(\d{2}):(\d{2})/.exec(valor);
  return coincidencia ? `${coincidencia[1]}:${coincidencia[2]}` : valor;
}

function distribucionEstados(items: EstadoTicketEstadisticaDto[]) {
  return ESTADOS_TICKET.map((estado) => ({
    etiqueta: ETIQUETAS_ESTADO_TICKET[estado],
    cantidad: items.find((item) => item.estado === estado)?.cantidad ?? 0,
  }));
}

function distribucionCategorias(items: CategoriaTicketEstadisticaDto[]) {
  return CATEGORIAS_TICKET.map((categoria) => ({
    etiqueta: ETIQUETAS_CATEGORIA_TICKET[categoria],
    cantidad: items.find((item) => item.categoria === categoria)?.cantidad ?? 0,
  }));
}

function distribucionAreas(items: AreaTicketEstadisticaDto[]) {
  return AREAS_TICKET.map((area) => ({
    etiqueta: ETIQUETAS_AREA_TICKET[area],
    cantidad: items.find((item) => item.area === area)?.cantidad ?? 0,
  }));
}

function distribucionPrioridades(items: PrioridadTicketEstadisticaDto[]) {
  return PRIORIDADES_TICKET.map((prioridad) => ({
    etiqueta: ETIQUETAS_PRIORIDAD_TICKET[prioridad],
    cantidad: items.find((item) => item.prioridad === prioridad)?.cantidad ?? 0,
  }));
}

function frecuencias(items: FrecuenciaAtencionTicketDto[]) {
  return items.map((item) => ({ fecha: item.periodoInicio, cantidad: item.cantidad }));
}

function AreaDeEstado({ cargando, error, children }: {
  cargando: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <>
      <EstadoCarga cargando={cargando} error={error} />
      {!cargando && !error && children}
    </>
  );
}

export function DashboardGlobalTickets() {
  const state = useEstadisticas<TicketDashboardGlobalResponseDto>(obtenerEstadisticasGlobalesTickets);
  const datos = state.datos;
  const obtenerEstadoActual = (estado: EstadoTicket) =>
    datos?.estadoActual.find((item) => item.estado === estado)?.cantidad ?? 0;

  return (
    <div className="statsdash">
      <EncabezadoDashboard
        icon="confirmation_number"
        titulo="Dashboard global de tickets"
        descripcion="Indicadores globales del soporte y sus resoluciones."
        periodo={state.periodo}
        alCambiarPeriodo={state.setPeriodo}
        cargando={state.cargando}
      />
      <div className="statsdash__notice">
        <strong>Cómo leer estos datos:</strong> las distribuciones y promedios corresponden a tickets creados
        en el periodo. La frecuencia cuenta la primera transición a ATENDIDO. Los estados actuales,
        pendientes de asignación y carga por técnico son una fotografía actual, independiente del periodo.
      </div>
      <AreaDeEstado cargando={state.cargando} error={state.error}>
        {datos && (
          <>
            {datos.totalTicketsPeriodo === 0 && (
              <p className="statsdash__empty">
                No se crearon tickets dentro del periodo seleccionado. Los datos de estado y asignación actuales pueden seguir mostrando tickets de otros periodos.
              </p>
            )}
            <div className="statsdash__kpis">
              <TarjetaKpi icon="confirmation_number" titulo="Tickets creados en el periodo" valor={String(datos.totalTicketsPeriodo)} />
              <TarjetaKpi icon="pending_actions" titulo="Pendientes actuales" valor={String(obtenerEstadoActual(0))} detalle="Fotografía actual" />
              <TarjetaKpi icon="support_agent" titulo="En atención actuales" valor={String(obtenerEstadoActual(1))} detalle="Fotografía actual" />
              <TarjetaKpi icon="task_alt" titulo="Atendidos actuales" valor={String(obtenerEstadoActual(2))} detalle="Fotografía actual" />
              <TarjetaKpi icon="lock" titulo="Cerrados actuales" valor={String(obtenerEstadoActual(3))} detalle="Fotografía actual" />
              <TarjetaKpi icon="assignment_late" titulo="Pendientes de asignación" valor={String(datos.ticketsPendientesDeAsignacion)} detalle="Fotografía actual" />
              <TarjetaKpi icon="schedule" titulo="Promedio primera atención" valor={formatoMinutos(datos.promedioMinutosHastaPrimeraAtencion)} />
              <TarjetaKpi icon="timer" titulo="Promedio resolución" valor={formatoMinutos(datos.promedioMinutosHastaPrimeraResolucion)} />
            </div>
            <div className="statsdash__grid statsdash__grid--three">
              <Panel titulo="Distribución por estado" descripcion="Estado actual de todos los tickets.">
                <ListaDistribucion items={distribucionEstados(datos.estadoActual)} />
              </Panel>
              <Panel titulo="Distribución por categoría" descripcion="Tickets creados en el periodo.">
                <ListaDistribucion items={distribucionCategorias(datos.distribucionPorCategoria)} />
              </Panel>
              <Panel titulo="Distribución por prioridad" descripcion="Tickets creados en el periodo.">
                <ListaDistribucion items={distribucionPrioridades(datos.distribucionPorPrioridad)} />
              </Panel>
            </div>
            <div className="statsdash__grid statsdash__grid--two">
              <Panel titulo="Distribución por área" descripcion="Tickets creados en el periodo.">
                <ListaDistribucion items={distribucionAreas(datos.distribucionPorArea)} />
              </Panel>
              <Panel titulo="Áreas con más tickets" descripcion="Áreas que generan más tickets durante el periodo.">
                <ListaDistribucion items={datos.areasConMasTickets.map((item) => ({
                  etiqueta: ETIQUETAS_AREA_TICKET[item.area],
                  cantidad: item.cantidad,
                }))} />
              </Panel>
            </div>
            <Panel titulo="Frecuencia de resoluciones" descripcion="Agrupada por la fecha de la primera transición a ATENDIDO.">
              <div className="statsdash__grid statsdash__grid--three">
                <div>
                  <h3 className="statsdash__subheading">Diaria</h3>
                  <GraficoFrecuencia items={frecuencias(datos.resolucionesPorDia)} />
                </div>
                <div>
                  <h3 className="statsdash__subheading">Semanal</h3>
                  <GraficoFrecuencia items={frecuencias(datos.resolucionesPorSemana)} />
                </div>
                <div>
                  <h3 className="statsdash__subheading">Mensual</h3>
                  <GraficoFrecuencia items={frecuencias(datos.resolucionesPorMes)} />
                </div>
              </div>
            </Panel>
            <Panel titulo="Carga de trabajo por técnico" descripcion="Tickets asignados actualmente a cada técnico.">
              {datos.cargaPorTecnico.length === 0 ? (
                <p className="statsdash__empty">No hay tickets asignados actualmente.</p>
              ) : (
                <div className="statsdash__table-wrap">
                  <table className="statsdash__table">
                    <thead><tr><th>Técnico</th><th>Tickets asignados</th></tr></thead>
                    <tbody>
                      {datos.cargaPorTecnico.map((item) => (
                        <tr key={item.empleadoId}>
                          <td>{item.nombreCompleto}</td>
                          <td>{item.cantidadTickets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </AreaDeEstado>
    </div>
  );
}

export function DashboardPersonalAsistencia() {
  const state = useEstadisticas<AsistenciaEstadisticasPersonalesResponseDto>(obtenerEstadisticasPersonalesAsistencia);
  const datos = state.datos;

  return (
    <div className="statsdash">
      <EncabezadoDashboard
        icon="schedule"
        titulo="Mis estadísticas de asistencia"
        descripcion="Resumen de tus marcaciones en el periodo seleccionado."
        periodo={state.periodo}
        alCambiarPeriodo={state.setPeriodo}
        cargando={state.cargando}
      />
      <div className="statsdash__notice">
        El promedio semanal considera únicamente semanas con marcaciones. No se infieren ni se muestran ausencias.
      </div>
      <AreaDeEstado cargando={state.cargando} error={state.error}>
        {datos && (
          <>
            <div className="statsdash__kpis">
              <TarjetaKpi icon="event_available" titulo="Días con asistencia" valor={String(datos.diasConAsistencia)} />
              <TarjetaKpi icon="date_range" titulo="Promedio días asistidos por semana" valor={formatoPromedio(datos.promedioDiasAsistidosPorSemana)} />
              <TarjetaKpi icon="login" titulo="Hora promedio de ingreso" valor={formatoHora(datos.promedioHoraIngreso)} />
              <TarjetaKpi icon="schedule" titulo="Promedio minutos de tardanza" valor={formatoMinutos(datos.promedioMinutosTardanza)} />
              <TarjetaKpi icon="event_busy" titulo="Días con tardanza" valor={String(datos.diasConTardanza)} />
            </div>
            <div className="statsdash__grid statsdash__grid--two">
              <Panel titulo="Evolución semanal" descripcion="Días asistidos por semana en el periodo seleccionado.">
                <GraficoFrecuencia
                  items={datos.evolucionSemanal.map((item) => ({
                    fecha: item.semanaInicio,
                    cantidad: item.diasAsistidos,
                  }))}
                  mensajeVacio="Sin datos de asistencia semanal para el periodo seleccionado."
                />
              </Panel>
              <Panel titulo="Evolución mensual" descripcion="Días asistidos por mes en el periodo seleccionado.">
                <GraficoFrecuencia
                  items={datos.evolucionMensual.map((item) => ({
                    fecha: item.mesInicio,
                    cantidad: item.diasAsistidos,
                  }))}
                  mensajeVacio="Sin datos de asistencia mensual para el periodo seleccionado."
                />
              </Panel>
            </div>
            <Panel titulo="Resumen diario" descripcion="Se muestran únicamente las jornadas devueltas por el backend.">
              {datos.evolucionDiaria.length === 0 ? (
                <p className="statsdash__empty">Sin datos de asistencia para el periodo seleccionado.</p>
              ) : (
                <div className="statsdash__table-wrap">
                  <table className="statsdash__table">
                    <thead>
                      <tr><th>Jornada</th><th>Marcaciones</th><th>Tardanza ingreso 1</th></tr>
                    </thead>
                    <tbody>
                      {datos.evolucionDiaria.map((item) => (
                        <tr key={item.fechaJornada}>
                          <td>{item.fechaJornada}</td>
                          <td>{item.cantidadMarcaciones}</td>
                          <td>{item.minutosTardanzaIngreso1 === null
                            ? 'Sin datos suficientes'
                            : `${item.minutosTardanzaIngreso1} min`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}
      </AreaDeEstado>
    </div>
  );
}

export function EstadisticasRoleRoute({
  roles,
  children,
}: {
  roles: readonly string[];
  children: ReactNode;
}) {
  const { isAuthenticated, empleado } = useAuth();
  const actualRole = empleado?.rolNombre?.trim().toLowerCase();
  const hasRole = actualRole !== undefined
    && roles.some((role) => role.trim().toLowerCase() === actualRole);
  if (!isAuthenticated || !hasRole) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
