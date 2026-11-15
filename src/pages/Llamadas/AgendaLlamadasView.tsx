import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { obtenerAgendaLlamadas } from '../../api/services/llamadas.service';
import type { AgendaLlamada } from '../../api/Dtos/Llamada';
import { claseResultado, etiquetaResultado } from '../../utils/llamadasUtils';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './Llamadas.css';

interface AgendaLlamadasViewProps {
  roleAccent?: string;
  refreshKey?: number;
}

export function AgendaLlamadasView({
  roleAccent = '#2563eb',
  refreshKey = 0,
}: AgendaLlamadasViewProps) {
  const [items, setItems] = useState<AgendaLlamada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerAgendaLlamadas();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la agenda.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar, refreshKey]);

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="llamadas-card">
        <div className="llamadas-section-title">
          <div>
            <h3>Próximas llamadas programadas</h3>
            <p>Agenda de los próximos 8 días registrada por tus llamadas.</p>
          </div>
          <button type="button" className="llamadas-btn" onClick={() => void cargar()}>
            <GoogleIcon name="refresh" size={15} />
            Actualizar
          </button>
        </div>

        {error && <div className="llamadas-error">{error}</div>}

        <div className="llamadas-table-wrap">
          <table className="llamadas-table">
            <thead>
              <tr>
                <th>Fecha programada</th>
                <th>Entidad</th>
                <th>Contacto</th>
                <th>Teléfono</th>
                <th>Último resultado</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="llamadas-empty">
                    Cargando agenda...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="llamadas-empty">
                    No tienes llamadas programadas en los próximos días.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.llamadaId ?? 'agenda'}-${index}`}>
                    <td>
                      <span className="llamadas-strong">
                        {formatFechaHoraPeru(item.proximaLlamadaProgramadaUtc, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="llamadas-strong">{item.nombreEntidad}</span>
                      <div className="llamadas-muted">{item.ruc || 'Sin RUC'}</div>
                    </td>
                    <td>{item.nombreContacto || 'Contacto sin nombre'}</td>
                    <td>
                      {item.telefono ? (
                        <a className="llamadas-phone" href={`tel:${item.telefono}`}>
                          <GoogleIcon name="call" size={13} color="#0284c7" />
                          {item.telefono}
                        </a>
                      ) : (
                        <span className="llamadas-muted">Sin teléfono</span>
                      )}
                    </td>
                    <td>
                      <span className={`llamadas-resultado ${claseResultado(item.resultadoSemaforo)}`}>
                        {etiquetaResultado(item.resultadoSemaforo)}
                      </span>
                    </td>
                    <td>
                      <span className="llamadas-muted">{item.comentario || 'Sin comentario'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
