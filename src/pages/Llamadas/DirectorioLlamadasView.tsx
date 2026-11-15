import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { obtenerDirectorioLlamadas } from '../../api/services/llamadas.service';
import type { DirectorioLlamada, PagedResult } from '../../api/Dtos/Llamada';
import {
  claseResultado,
  etiquetaResultado,
} from '../../utils/llamadasUtils';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './Llamadas.css';

interface DirectorioLlamadasViewProps {
  roleAccent?: string;
  refreshKey?: number;
  onSeleccionarContacto: (contacto: DirectorioLlamada) => void;
}

const PAGINA_VACIA: PagedResult<DirectorioLlamada> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

export function DirectorioLlamadasView({
  roleAccent = '#2563eb',
  refreshKey = 0,
  onSeleccionarContacto,
}: DirectorioLlamadasViewProps) {
  const [busqueda, setBusqueda] = useState('');
  const [semaforizacion, setSemaforizacion] = useState('');
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PagedResult<DirectorioLlamada>>(PAGINA_VACIA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      obtenerDirectorioLlamadas({
        busqueda: busqueda.trim() || undefined,
        semaforizacion: semaforizacion || undefined,
        soloPendientes: soloPendientes || undefined,
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
            setError(err instanceof Error ? err.message : 'No se pudo cargar el directorio.');
          }
        })
        .finally(() => {
          if (activo) setLoading(false);
        });
    }, busqueda ? 320 : 0);

    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [busqueda, semaforizacion, soloPendientes, page, refreshKey]);

  const cambiarBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const limpiarFiltros = useCallback(() => {
    setBusqueda('');
    setSemaforizacion('');
    setSoloPendientes(false);
    setPage(1);
  }, []);

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="llamadas-card">
        <div className="llamadas-toolbar">
          <div className="llamadas-search">
            <GoogleIcon name="search" size={17} color="#94a3b8" />
            <input
              type="search"
              value={busqueda}
              onChange={(event) => cambiarBusqueda(event.target.value)}
              placeholder="Buscar entidad, RUC, contacto, teléfono o correo..."
            />
          </div>

          <select
            className="llamadas-select"
            value={semaforizacion}
            onChange={(event) => {
              setSemaforizacion(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los resultados</option>
            <option value="SIN CONTACTO">Sin contacto</option>
            <option value="LOGISTICO">Logístico</option>
            <option value="LOG+COTIZ">Logístico + cotización</option>
            <option value="LOG+OC">Logístico + OC</option>
          </select>

          <label className="llamadas-check">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(event) => {
                setSoloPendientes(event.target.checked);
                setPage(1);
              }}
            />
            Solo pendientes
          </label>

          <button type="button" className="llamadas-btn" onClick={limpiarFiltros}>
            <GoogleIcon name="filter_alt_off" size={15} />
            Limpiar
          </button>
        </div>

        {error && <div className="llamadas-error">{error}</div>}

        <div className="llamadas-table-wrap">
          <table className="llamadas-table">
            <thead>
              <tr>
                <th>Entidad / RUC</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Semáforo</th>
                <th>Asignada a</th>
                <th>Última gestión</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="llamadas-empty">
                    Cargando directorio...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="llamadas-empty">
                    No hay contactos en el directorio con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                data.items.map((contacto) => (
                  <tr key={contacto.id}>
                    <td>
                      <span className="llamadas-strong">{contacto.nombreEntidad}</span>
                      <div className="llamadas-muted">
                        {contacto.ruc || 'Sin RUC'}
                        {contacto.departamento ? ` · ${contacto.departamento}` : ''}
                      </div>
                    </td>
                    <td>
                      <span className="llamadas-strong">
                        {contacto.nombreContacto || 'Contacto sin nombre'}
                      </span>
                      <div className="llamadas-muted">
                        {contacto.cargoContacto || contacto.sector || 'Sin cargo'}
                      </div>
                    </td>
                    <td>
                      {contacto.telefono ? (
                        <a className="llamadas-phone" href={`tel:${contacto.telefono}`}>
                          <GoogleIcon name="call" size={13} color="#0284c7" />
                          {contacto.telefono}
                        </a>
                      ) : (
                        <span className="llamadas-muted">Sin teléfono</span>
                      )}
                    </td>
                    <td>
                      <span className={`llamadas-resultado ${claseResultado(contacto.semaforizacion)}`}>
                        {etiquetaResultado(contacto.semaforizacion)}
                      </span>
                    </td>
                    <td>
                      <span className="llamadas-muted">
                        {contacto.ejecutivaAsignadaNombre || 'Sin asignar'}
                      </span>
                    </td>
                    <td>
                      <span className="llamadas-muted">
                        {contacto.ultimaLlamadaUtc
                          ? formatFechaHoraPeru(contacto.ultimaLlamadaUtc, {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Sin llamadas'}
                      </span>
                      {contacto.proximaLlamadaProgramadaUtc && (
                        <div className="llamadas-muted" style={{ color: '#7c3aed', fontWeight: 700 }}>
                          Próxima:{' '}
                          {formatFechaHoraPeru(contacto.proximaLlamadaProgramadaUtc, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="llamadas-btn llamadas-btn--primary llamadas-btn--sm"
                        onClick={() => onSeleccionarContacto(contacto)}
                      >
                        <GoogleIcon name="call" size={14} color="#ffffff" />
                        Registrar llamada
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="llamadas-footer">
          <span>
            {data.total} contacto{data.total === 1 ? '' : 's'} en el directorio activo
          </span>
          <div className="llamadas-pagination">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              title="Página anterior"
            >
              <GoogleIcon name="chevron_left" size={16} />
            </button>
            <span>
              {data.totalPages === 0 ? '0 / 0' : `${data.page} / ${data.totalPages}`}
            </span>
            <button
              type="button"
              disabled={page >= data.totalPages || loading || data.totalPages === 0}
              onClick={() => setPage((prev) => prev + 1)}
              title="Página siguiente"
            >
              <GoogleIcon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
