import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AreaTicket,
  CategoriaTicket,
  EstadoTicket,
  PrioridadTicket,
  TicketFiltroRequest,
  TicketResponseDto,
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
import { obtenerMisTickets } from '../../api/services/ticket.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { useTicketListUpdates } from '../../hooks/useTicketListUpdates';
import '../DashboardLayout.css';
import '../Solicitudes/Solicitudes.css';
import './Tickets.css';

interface MisTicketsPageProps {
  basePath: string;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeZone: 'America/Lima',
  }).format(date);
}

function formatFilter<T extends number>(
  value: string,
  values: readonly T[],
  update: (value: T | undefined) => void,
): void {
  if (value === '') {
    update(undefined);
    return;
  }
  const selected = values.find((option) => option === Number(value));
  if (selected !== undefined) update(selected);
}

export default function MisTicketsPage({ basePath }: MisTicketsPageProps) {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<TicketResponseDto[]>([]);
  const [filters, setFilters] = useState<TicketFiltroRequest>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const appliedFiltersRef = useRef<TicketFiltroRequest>({});

  const loadTickets = useCallback(async (currentFilters: TicketFiltroRequest) => {
    try {
      setTickets(await obtenerMisTickets(currentFilters));
      setError(null);
    } catch (reason) {
      setTickets([]);
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar tus tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshTickets = useTicketListUpdates(
    tickets.map((ticket) => ticket.id),
    token,
    () => loadTickets(appliedFiltersRef.current),
  );

  useEffect(() => {
    void refreshTickets();
  }, [refreshTickets]);

  const applyFilters = (currentFilters: TicketFiltroRequest) => {
    appliedFiltersRef.current = currentFilters;
    setLoading(true);
    setError(null);
    void refreshTickets();
  };

  const updateFilter = <K extends keyof TicketFiltroRequest>(
    key: K,
    value: TicketFiltroRequest[K] | undefined,
  ) => {
    setFilters((current) => {
      const next = { ...current };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  return (
    <div className="solicitudes-page">
      <header className="solicitudes-header">
        <div>
          <div className="solicitudes-eyebrow">
            <GoogleIcon name="support_agent" size={18} color="#2563eb" />
            Tickets
          </div>
          <h1>Mis tickets</h1>
          <p>Consulta el seguimiento de tus solicitudes de soporte.</p>
        </div>
        <Link className="solicitudes-primary-button" to={`${basePath}/tickets/nuevo`}>
          <GoogleIcon name="add" size={18} color="#fff" />
          Crear ticket
        </Link>
      </header>

      <section className="ticket-filters" aria-label="Filtros de tickets">
        <div className="solicitudes-field">
          <label htmlFor="ticket-filter-estado">Estado</label>
          <select
            id="ticket-filter-estado"
            value={filters.estado ?? ''}
            onChange={(event) => formatFilter<EstadoTicket>(
              event.target.value,
              ESTADOS_TICKET,
              (value) => updateFilter('estado', value),
            )}
          >
            <option value="">Todos</option>
            {ESTADOS_TICKET.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_ESTADO_TICKET[value]}</option>
            ))}
          </select>
        </div>
        <div className="solicitudes-field">
          <label htmlFor="ticket-filter-prioridad">Prioridad</label>
          <select
            id="ticket-filter-prioridad"
            value={filters.prioridad ?? ''}
            onChange={(event) => formatFilter<PrioridadTicket>(
              event.target.value,
              PRIORIDADES_TICKET,
              (value) => updateFilter('prioridad', value),
            )}
          >
            <option value="">Todas</option>
            {PRIORIDADES_TICKET.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_PRIORIDAD_TICKET[value]}</option>
            ))}
          </select>
        </div>
        <div className="solicitudes-field">
          <label htmlFor="ticket-filter-area">Área</label>
          <select
            id="ticket-filter-area"
            value={filters.area ?? ''}
            onChange={(event) => formatFilter<AreaTicket>(
              event.target.value,
              AREAS_TICKET,
              (value) => updateFilter('area', value),
            )}
          >
            <option value="">Todas</option>
            {AREAS_TICKET.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_AREA_TICKET[value]}</option>
            ))}
          </select>
        </div>
        <div className="solicitudes-field">
          <label htmlFor="ticket-filter-categoria">Categoría</label>
          <select
            id="ticket-filter-categoria"
            value={filters.categoria ?? ''}
            onChange={(event) => formatFilter<CategoriaTicket>(
              event.target.value,
              CATEGORIAS_TICKET,
              (value) => updateFilter('categoria', value),
            )}
          >
            <option value="">Todas</option>
            {CATEGORIAS_TICKET.map((value) => (
              <option value={value} key={value}>{ETIQUETAS_CATEGORIA_TICKET[value]}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="solicitudes-primary-button"
          onClick={() => applyFilters(filters)}
          disabled={loading}
        >
          <GoogleIcon name="filter_list" size={18} color="#fff" />
          Aplicar filtros
        </button>
      </section>

      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={20} color="#dc2626" />
          <span>{error}</span>
          <button type="button" className="solicitudes-text-button" onClick={() => applyFilters(filters)}>
            Reintentar
          </button>
        </div>
      )}

      {loading && (
        <div className="solicitudes-state" role="status">
          <span className="solicitudes-spinner" aria-hidden="true" />
          <p>Cargando tickets...</p>
        </div>
      )}

      {!loading && !error && tickets.length === 0 && (
        <section className="solicitudes-empty">
          <GoogleIcon name="inbox" size={34} color="#64748b" />
          <h2>No se encontraron tickets</h2>
          <p>Prueba otros filtros o crea un ticket para solicitar soporte.</p>
        </section>
      )}

      {!loading && !error && tickets.length > 0 && (
        <section className="solicitudes-list" aria-label="Listado de mis tickets">
          {tickets.map((ticket) => (
            <Link
              className="solicitud-card ticket-card"
              to={`${basePath}/tickets/${ticket.id}`}
              key={ticket.id}
            >
              <div className="solicitud-card__main">
                <div className="ticket-card__meta">
                  <span className={`solicitud-status ticket-status--${ticket.estado}`}>
                    {ETIQUETAS_ESTADO_TICKET[ticket.estado]}
                  </span>
                  <span className={`ticket-priority ticket-priority--${ticket.prioridad}`}>
                    {ETIQUETAS_PRIORIDAD_TICKET[ticket.prioridad]}
                  </span>
                  <span className="ticket-card__category">
                    {ETIQUETAS_AREA_TICKET[ticket.area]} · {ETIQUETAS_CATEGORIA_TICKET[ticket.categoria]}
                  </span>
                </div>
                <h2>Ticket #{ticket.id}</h2>
                <p className="ticket-card__description">{ticket.descripcion}</p>
                <p className="solicitud-card__created">Creado: {formatDate(ticket.fechaCreacion)}</p>
              </div>
              <GoogleIcon name="chevron_right" size={22} color="#64748b" />
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
