import type { AsistenciaDiariaResponseDto } from '../../../api/Dtos/Asistencia';
import { ETIQUETAS_MARCACION, TIPOS_MARCACION } from '../../../api/Dtos/Asistencia';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';

function formatTime(fechaHoraUtc: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(fechaHoraUtc));
}

function formatDate(fecha: string): string {
  const [year, month, day] = fecha.split('-');
  if (!year || !month || !day) return fecha;
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'long',
    timeZone: 'America/Lima',
  }).format(new Date(`${year}-${month}-${day}T12:00:00-05:00`));
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return 'Sin datos';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours > 0 ? `${hours} h ${remainder} min` : `${remainder} min`;
}

function getStatus(asistencia: AsistenciaDiariaResponseDto): string {
  if (asistencia.esNoLaborable) return 'Día no laborable';
  if (!asistencia.tieneHorario) return 'Sin horario';
  const complete = TIPOS_MARCACION.every((tipo) =>
    asistencia.marcaciones.some((marcacion) => marcacion.tipo === tipo),
  );
  return complete ? 'Jornada completa' : 'Registro incompleto';
}

interface AsistenciaJornadaDetailsProps {
  asistencia: AsistenciaDiariaResponseDto;
  empleadoNombre?: string;
}

export default function AsistenciaJornadaDetails({
  asistencia,
  empleadoNombre,
}: AsistenciaJornadaDetailsProps) {
  const status = getStatus(asistencia);
  const incomplete = status === 'Registro incompleto';

  return (
    <details className="asistencia-card asistencia-history-card asistencia-detail">
      <summary className="asistencia-detail-summary">
        <div>
          {empleadoNombre && <strong className="asistencia-detail-employee">{empleadoNombre}</strong>}
          <h3>{formatDate(asistencia.fechaJornada)}</h3>
          <span>{status}</span>
        </div>
        <span className={`asistencia-history-status${incomplete ? ' asistencia-history-status--incomplete' : ''}`}>
          {status}
          <GoogleIcon name="expand_more" size={18} />
        </span>
      </summary>

      <div className="asistencia-detail-content">
        {asistencia.esNoLaborable && (
          <div className="asistencia-alert asistencia-alert--info">
            <GoogleIcon name="event_busy" size={18} color="#2563eb" />
            <span>{asistencia.motivoNoLaborable || 'Esta jornada fue definida como no laborable.'}</span>
          </div>
        )}
        {!asistencia.esNoLaborable && !asistencia.tieneHorario && (
          <div className="asistencia-alert asistencia-alert--info">
            <GoogleIcon name="info" size={18} color="#2563eb" />
            <span>No se encontró un horario configurado para esta jornada.</span>
          </div>
        )}

        <div className="asistencia-history-summary">
          <div className="asistencia-summary-card">
            <span>Tiempo trabajado</span>
            <strong>{formatMinutes(asistencia.minutosTrabajados)}</strong>
          </div>
          <div className="asistencia-summary-card">
            <span>Descanso</span>
            <strong>{formatMinutes(asistencia.minutosDescanso)}</strong>
          </div>
        </div>

        <div className="asistencia-marks-grid">
          {TIPOS_MARCACION.map((tipo) => {
            const marcacion = asistencia.marcaciones.find((item) => item.tipo === tipo);
            return (
              <div className={`asistencia-mark${marcacion ? ' asistencia-mark--done' : ''}`} key={tipo}>
                <span className="asistencia-mark-icon">
                  <GoogleIcon name={marcacion ? 'check_circle' : 'radio_button_unchecked'} size={22} />
                </span>
                <div>
                  <strong>{ETIQUETAS_MARCACION[tipo]}</strong>
                  <span>{marcacion ? formatTime(marcacion.fechaHoraUtc) : 'Sin registro'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
