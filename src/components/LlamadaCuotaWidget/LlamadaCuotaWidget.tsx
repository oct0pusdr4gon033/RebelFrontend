import { useNavigate } from 'react-router-dom';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import { useLlamadaCuota } from '../../hooks/useLlamadaCuota';
import { formatearHoraCuota } from '../../utils/llamadasUtils';
import './LlamadaCuotaWidget.css';

interface LlamadaCuotaWidgetProps {
  accent?: string;
  basePath?: string;
}

const SEMAFORO_COLOR: Record<string, string> = {
  rojo: '#dc2626',
  amarillo: '#d97706',
  verde: '#059669',
  azul: '#2563eb',
};

export function LlamadaCuotaWidget({
  accent = '#2563eb',
  basePath = '/ejecutiva',
}: LlamadaCuotaWidgetProps) {
  const navigate = useNavigate();
  const { cuota, loading } = useLlamadaCuota();

  if (loading && !cuota) {
    return (
      <div className="llamada-cuota-widget llamada-cuota-widget--loading">
        <span className="llamada-cuota-widget__spinner" />
        <span>Consultando llamadas...</span>
      </div>
    );
  }

  if (!cuota || !cuota.aplicaCuota || cuota.esFinDeSemana || cuota.esDiaNoLaborable) {
    return null;
  }

  const color = SEMAFORO_COLOR[cuota.semaforo] || accent;
  const porcentajeDiario = Math.min(
    100,
    Math.round((cuota.realizadasHoy / Math.max(1, cuota.limiteDiario)) * 100)
  );
  const porcentajeSemanal = Math.min(
    100,
    Math.round((cuota.realizadasSemana / Math.max(1, cuota.limiteSemanal)) * 100)
  );

  return (
    <button
      type="button"
      className={`llamada-cuota-widget ${cuota.estaBloqueado ? 'llamada-cuota-widget--bloqueado' : ''}`}
      style={{ borderColor: `${color}45`, background: `${color}0f` }}
      title={cuota.mensaje}
      onClick={() => navigate(`${basePath}/agenda-contactos?tab=llamada`)}
    >
      <span className="llamada-cuota-widget__icon" style={{ background: `${color}18`, color }}>
        <GoogleIcon name={cuota.estaBloqueado ? 'lock' : 'call'} size={17} color={color} />
      </span>
      <span className="llamada-cuota-widget__content">
        <span className="llamada-cuota-widget__top">
          <strong style={{ color }}>
            {cuota.realizadasHoy}/{cuota.limiteDiario}
          </strong>
          <span>hoy</span>
          <span className="llamada-cuota-widget__dot" style={{ background: color }} />
          <span>{formatearHoraCuota(cuota.horaLocal)}</span>
        </span>
        <span className="llamada-cuota-widget__bar">
          <span style={{ width: `${porcentajeDiario}%`, background: color }} />
        </span>
        <span className="llamada-cuota-widget__sub">
          Semana {cuota.realizadasSemana}/{cuota.limiteSemanal}
          <span className="llamada-cuota-widget__mini-bar">
            <span style={{ width: `${porcentajeSemanal}%`, background: color }} />
          </span>
        </span>
      </span>
    </button>
  );
}

export default LlamadaCuotaWidget;
