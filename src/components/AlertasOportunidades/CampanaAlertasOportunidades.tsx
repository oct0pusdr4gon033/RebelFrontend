import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import { getOportunidadesApi } from '../../api/services/oportunidades.service';
import {
  obtenerCamposFaltantes,
  requiereAlertaAdmin,
  respuestaApiAValidable,
} from '../../utils/oportunidadCompletitud';
import { ajustesPendientesDeRespuesta } from '../../utils/ajusteFleteUtils';
import type { AlertaOportunidad } from './AlertaOportunidad';
import type { CampanaAlertasOportunidadesProps } from './CampanaAlertasOportunidadesProps';
import './CampanaAlertasOportunidades.css';

/** Cada cuánto se consulta al backend por oportunidades con datos faltantes. */
const INTERVALO_MS = 30_000;




/**
 * Campana de alertas para la administradora: avisa cuando una oportunidad
 * registrada por una ejecutiva tiene datos obligatorios faltantes.
 *
 * Por ahora funciona con sondeo periódico (polling) sobre GET /api/oportunidades.
 * Si el backend expone un hub en tiempo real (SignalR) o un endpoint de
 * notificaciones, basta con sustituir `cargar` por la suscripción.
 */
export const CampanaAlertasOportunidades: React.FC<CampanaAlertasOportunidadesProps> = ({
  detailPath = '/admin/resolver-oportunidades?tab=bandeja',
  accent = '#2563eb',
}) => {
  const navigate = useNavigate();
  const [alertas, setAlertas] = useState<AlertaOportunidad[]>([]);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  // Firmas ya notificadas con toast (id + contenido) para no repetir el aviso en cada sondeo
  const notificadasRef = useRef<Set<string> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const data = await getOportunidadesApi();
      if (!Array.isArray(data)) return;

      const incompletas: AlertaOportunidad[] = data
        .map((op) => ({
          id: op.id,
          numeroRequerimiento: op.numeroRequerimiento,
          creadoPor: op.creadoPorNombre || 'Ejecutiva',
          faltantes: requiereAlertaAdmin(op) ? obtenerCamposFaltantes(respuestaApiAValidable(op)) : [],
          ajustesPendientes: ajustesPendientesDeRespuesta(op),
        }))
        .filter((a) => a.faltantes.length > 0 || a.ajustesPendientes.length > 0);
      setAlertas(incompletas);

      // La firma cambia si cambian los datos faltantes o los ajustes pendientes
      const firma = (a: AlertaOportunidad) =>
        `${a.id}|${a.faltantes.join(',')}|${a.ajustesPendientes.join(',')}`;

      // La primera carga solo registra lo existente; luego avisa solo las nuevas.
      if (notificadasRef.current === null) {
        notificadasRef.current = new Set(incompletas.map(firma));
        return;
      }
      const nuevas = incompletas.filter((a) => !notificadasRef.current!.has(firma(a)));
      nuevas.forEach((a) => notificadasRef.current!.add(firma(a)));
      if (nuevas.length > 0) {
        const soloAjustes = nuevas.every((a) => a.faltantes.length === 0);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title:
            nuevas.length === 1
              ? `${nuevas[0].numeroRequerimiento}: ${soloAjustes ? 'ajuste de flete por aprobar' : 'requiere atención'}`
              : `${nuevas.length} oportunidades requieren tu atención`,
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true,
        });
      }
    } catch {
      // Backend no disponible: se reintenta en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    cargar();
    const timer = window.setInterval(cargar, INTERVALO_MS);
    return () => window.clearInterval(timer);
  }, [cargar]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="alertas-op" ref={contenedorRef}>
      <button
        id="alertas-oportunidades-btn"
        type="button"
        className="alertas-op__btn"
        onClick={() => setAbierto((v) => !v)}
        aria-label={`Alertas de oportunidades incompletas: ${alertas.length}`}
        title="Oportunidades con datos faltantes"
      >
        <GoogleIcon name="notifications" size={22} color={alertas.length ? accent : '#64748b'} />
        {alertas.length > 0 && <span className="alertas-op__badge">{alertas.length}</span>}
      </button>

      {abierto && (
        <div className="alertas-op__panel" role="dialog" aria-label="Alertas de oportunidades">
          <div className="alertas-op__header">
            <strong>Alertas de oportunidades</strong>
            <span>{alertas.length}</span>
          </div>
          {alertas.length === 0 ? (
            <div className="alertas-op__empty">
              <GoogleIcon name="check_circle" size={20} color="#059669" />
              Todas las oportunidades están completas y sin ajustes pendientes.
            </div>
          ) : (
            <ul className="alertas-op__list">
              {alertas.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="alertas-op__item"
                    onClick={() => {
                      setAbierto(false);
                      navigate(detailPath);
                    }}
                  >
                    <div className="alertas-op__item-top">
                      <strong>{a.numeroRequerimiento}</strong>
                      <span>{a.creadoPor}</span>
                    </div>
                    <div className="alertas-op__tags">
                      {a.faltantes.map((f) => (
                        <span key={f} className="alertas-op__tag">
                          {f}
                        </span>
                      ))}
                      {a.ajustesPendientes.map((np) => (
                        <span key={`aj-${np}`} className="alertas-op__tag alertas-op__tag--ajuste">
                          Ajuste de flete por aprobar: {np}
                        </span>
                      ))}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
