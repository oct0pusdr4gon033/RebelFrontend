import { useEffect, useState, type CSSProperties } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { obtenerHistorialLlamadas } from '../../api/services/llamadas.service';
import type { LlamadaResponse, PagedResult } from '../../api/Dtos/Llamada';
import {
  claseResultado,
  etiquetaResultado,
  fechaHoyLima,
} from '../../utils/llamadasUtils';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './Llamadas.css';

interface HistorialLlamadasViewProps {
  roleAccent?: string;
  refreshKey?: number;
}

const PAGINA_VACIA: PagedResult<LlamadaResponse> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

function restarDias(fecha: string, dias: number): string {
  const date = new Date(`${fecha}T12:00:00-05:00`);
  date.setDate(date.getDate() - dias);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function HistorialLlamadasView({
  roleAccent = '#2563eb',
  refreshKey = 0,
}: HistorialLlamadasViewProps) {
  const hoy = fechaHoyLima();
  const [fechaInicio, setFechaInicio] = useState(restarDias(hoy, 7));
  const [fechaFin, setFechaFin] = useState(hoy);
  const [resultado, setResultado] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<LlamadaResponse>>(PAGINA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    setLoading(true);
    obtenerHistorialLlamadas({
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      resultado: resultado || undefined,
      page,
      pageSize: 20,
    })
      .then((result) => {
        if (activo) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (activo) {
          setError(err instanceof Error ? err.message : 'No se pudo cargar el historial.');
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [fechaInicio, fechaFin, resultado, page, refreshKey]);

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="llamadas-card">
        <div className="llamadas-toolbar">
          <div className="llamadas-field" style={{ flex: '0 1 180px' }}>
            <label htmlFor="historial-desde">Desde</label>
            <input
              id="historial-desde"
              type="date"
              className="llamadas-input"
              value={fechaInicio}
              onChange={(event) => {
                setFechaInicio(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="llamadas-field" style={{ flex: '0 1 180px' }}>
            <label htmlFor="historial-hasta">Hasta</label>
            <input
              id="historial-hasta"
              type="date"
              className="llamadas-input"
              value={fechaFin}
              onChange={(event) => {
                setFechaFin(event.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="llamadas-field" style={{ flex: '0 1 190px' }}>
            <label htmlFor="historial-resultado">Resultado</label>
            <select
              id="historial-resultado"
              className="llamadas-select"
              value={resultado}
              onChange={(event) => {
                setResultado(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              <option value="SIN CONTACTO">Sin contacto</option>
              <option value="LOGISTICO">Logístico</option>
              <option value="LOG+COTIZ">Logístico + cotización</option>
              <option value="LOG+OC">Logístico + OC</option>
            </select>
          </div>
        </div>

        {error && <div className="llamadas-error">{error}</div>}

        <div className="llamadas-table-wrap">
          <table className="llamadas-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Entidad / Contacto</th>
                <th>Número</th>
                <th>Resultado</th>
                <th>Gestión</th>
                <th>Próxima</th>
                <th>Cuota</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="llamadas-empty">
                    Cargando historial...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="llamadas-empty">
                    No hay llamadas registradas en el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                data.items.map((llamada) => (
                  <tr key={llamada.id}>
                    <td>
                      <span className="llamadas-strong">
                        {formatFechaHoraPeru(llamada.fechaHoraLlamadaUtc, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                      <div className="llamadas-muted">Hora local: {llamada.horaLocal}</div>
                    </td>
                    <td>
                      <span className="llamadas-strong">
                        {llamada.entidadNombre || 'Entidad no registrada'}
                      </span>
                      <div className="llamadas-muted">
                        {llamada.contactoNombre || 'Contacto no registrado'}
                      </div>
                    </td>
                    <td>
                      <span className="llamadas-phone">{llamada.numeroMarcado}</span>
                    </td>
                    <td>
                      <span className={`llamadas-resultado ${claseResultado(llamada.resultadoSemaforo)}`}>
                        {etiquetaResultado(llamada.resultadoSemaforo)}
                      </span>
                    </td>
                    <td>
                      <div className="llamadas-inline-actions">
                        {llamada.esLogistico && <span className="llamadas-muted">Logístico</span>}
                        {llamada.solicitoCotizacion && (
                          <span className="llamadas-muted">Cotización</span>
                        )}
                        {llamada.generoOc && <span className="llamadas-muted">OC</span>}
                      </div>
                      {llamada.comentario && (
                        <div className="llamadas-muted">{llamada.comentario}</div>
                      )}
                    </td>
                    <td>
                      <span className="llamadas-muted">
                        {llamada.proximaLlamadaProgramadaUtc
                          ? formatFechaHoraPeru(llamada.proximaLlamadaProgramadaUtc, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="llamadas-resultado"
                        style={{
                          background: llamada.contabilizaCuota ? '#ecfdf5' : '#f8fafc',
                          color: llamada.contabilizaCuota ? '#047857' : '#64748b',
                          border: `1px solid ${llamada.contabilizaCuota ? '#a7f3d0' : '#e2e8f0'}`,
                        }}
                      >
                        {llamada.contabilizaCuota ? 'Contabilizada' : 'No contabiliza'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="llamadas-footer">
          <span>{data.total} llamada{data.total === 1 ? '' : 's'} registradas</span>
          <div className="llamadas-pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              <GoogleIcon name="chevron_left" size={16} />
            </button>
            <span>{data.totalPages === 0 ? '0 / 0' : `${data.page} / ${data.totalPages}`}</span>
            <button
              type="button"
              disabled={page >= data.totalPages || loading || data.totalPages === 0}
              onClick={() => setPage((prev) => prev + 1)}
            >
              <GoogleIcon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
