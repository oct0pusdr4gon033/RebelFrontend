import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiaSemana, HorarioSedeRequest, HorarioSedeResponse } from '../../api/Dtos/HorarioSede';
import type { SedeDto } from '../../api/Dtos/Sede';
import {
  actualizarHorarioSede,
  crearHorarioSede,
  obtenerHorariosPorSede,
} from '../../api/services/configuracionAsistencia.service';
import { getSedes } from '../../api/services/sede.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './HorariosSede.css';
import HorarioSedeFormModal from './components/HorarioSedeFormModal';

const DIAS_SEMANA: { value: DiaSemana; label: string }[] = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

function formatTime(value: string | null): string {
  return value?.slice(0, 5) ?? '—';
}

export default function HorariosSedePage() {
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [sedesLoading, setSedesLoading] = useState(true);
  const [sedesError, setSedesError] = useState<string | null>(null);
  const [selectedSedeId, setSelectedSedeId] = useState('');
  const [horarios, setHorarios] = useState<HorarioSedeResponse[]>([]);
  const [horariosLoading, setHorariosLoading] = useState(false);
  const [horariosError, setHorariosError] = useState<string | null>(null);
  const [modalDay, setModalDay] = useState<DiaSemana | null>(null);
  const horariosRequestId = useRef(0);

  const selectedSede = useMemo(
    () => sedes.find((sede) => sede.id === Number(selectedSedeId)) ?? null,
    [sedes, selectedSedeId],
  );
  const horariosByDay = useMemo(
    () => new Map(horarios.map((horario) => [horario.diaSemana, horario])),
    [horarios],
  );

  const loadSedes = useCallback(async () => {
    setSedesLoading(true);
    setSedesError(null);
    try {
      const data = await getSedes(false);
      setSedes(data.filter((sede) => sede.activo));
    } catch (reason) {
      setSedesError(reason instanceof Error ? reason.message : 'No se pudieron cargar las sedes.');
    } finally {
      setSedesLoading(false);
    }
  }, []);

  const loadHorarios = useCallback(async (sedeId: number): Promise<boolean> => {
    const requestId = ++horariosRequestId.current;
    setHorariosLoading(true);
    setHorariosError(null);
    try {
      const data = await obtenerHorariosPorSede(sedeId);
      if (requestId !== horariosRequestId.current) return false;
      setHorarios(data);
      return true;
    } catch (reason) {
      if (requestId !== horariosRequestId.current) return false;
      setHorarios([]);
      setHorariosError(reason instanceof Error ? reason.message : 'No se pudieron cargar los horarios.');
      return false;
    } finally {
      if (requestId === horariosRequestId.current) setHorariosLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSedes();
  }, [loadSedes]);

  useEffect(() => {
    setHorarios([]);
    setHorariosError(null);
    if (selectedSedeId) void loadHorarios(Number(selectedSedeId));
    else {
      horariosRequestId.current += 1;
      setHorariosLoading(false);
    }
  }, [loadHorarios, selectedSedeId]);

  const handleSave = async (
    request: HorarioSedeRequest,
    existing: HorarioSedeResponse | null,
  ) => {
    if (existing) {
      await actualizarHorarioSede(existing.id, request);
    } else {
      await crearHorarioSede(request);
    }

    setModalDay(null);
    await loadHorarios(request.sedeId);
    await Swal.fire({
      icon: 'success',
      title: 'Horario guardado',
      text: `${DIAS_SEMANA.find((day) => day.value === request.diaSemana)?.label} se guardó correctamente para ${selectedSede?.nombre ?? 'la sede'}.`,
      confirmButtonColor: '#2563eb',
    });
  };

  return (
    <div className="horarios-sede-page">
      <header className="horarios-sede-header">
        <div>
          <div className="horarios-sede-eyebrow">
            <GoogleIcon name="schedule" size={18} color="#2563eb" />
            Configuración de asistencias
          </div>
          <h1>Horarios por sede</h1>
          <p>Define el horario semanal de cada sede. Los días sin registro se muestran como no configurados.</p>
        </div>
      </header>

      <section className="horarios-sede-selector">
        <label htmlFor="horario-sede-select">Sede activa</label>
        {sedesLoading ? (
          <div className="horarios-sede-loading">
            <span className="horarios-sede-spinner" aria-hidden="true" />
            Cargando sedes...
          </div>
        ) : (
          <select
            id="horario-sede-select"
            value={selectedSedeId}
            onChange={(event) => setSelectedSedeId(event.target.value)}
            disabled={sedes.length === 0}
          >
            <option value="">Seleccionar sede</option>
            {sedes.map((sede) => (
              <option value={sede.id} key={sede.id}>{sede.nombre}</option>
            ))}
          </select>
        )}
      </section>

      {sedesError && (
        <div className="horarios-sede-error" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{sedesError}</span>
          <button type="button" onClick={() => void loadSedes()}>Reintentar</button>
        </div>
      )}

      {!sedesLoading && !sedesError && sedes.length === 0 && (
        <div className="horarios-sede-state">
          <GoogleIcon name="domain_disabled" size={38} color="#94a3b8" />
          <h2>No hay sedes activas</h2>
          <p>Cuando exista una sede activa, podrás configurar su semana laboral.</p>
        </div>
      )}

      {selectedSede && (
        <section className="horarios-sede-week" aria-labelledby="horarios-semana-title">
          <div className="horarios-sede-week-header">
            <div>
              <h2 id="horarios-semana-title">{selectedSede.nombre}</h2>
              <p>Configuración semanal</p>
            </div>
            <button
              type="button"
              className="horarios-sede-refresh"
              onClick={() => void loadHorarios(selectedSede.id)}
              disabled={horariosLoading}
              aria-label="Actualizar horarios"
            >
              <GoogleIcon name="refresh" size={19} color="#2563eb" />
            </button>
          </div>

          {horariosError && (
            <div className="horarios-sede-error" role="alert">
              <GoogleIcon name="error" size={18} color="#dc2626" />
              <span>{horariosError}</span>
              <button type="button" onClick={() => void loadHorarios(selectedSede.id)}>Reintentar</button>
            </div>
          )}

          {horariosLoading ? (
            <div className="horarios-sede-state horarios-sede-state--compact">
              <span className="horarios-sede-spinner" aria-hidden="true" />
              <p>Cargando horarios...</p>
            </div>
          ) : !horariosError && (
            <div className="horarios-sede-grid">
              {DIAS_SEMANA.map((day) => {
                const horario = horariosByDay.get(day.value) ?? null;
                return (
                  <article className="horario-day-card" key={day.value}>
                    <div className="horario-day-card-header">
                      <h3>{day.label}</h3>
                      <span className={`horario-day-status${horario ? (horario.esLaborable ? ' horario-day-status--working' : ' horario-day-status--off') : ' horario-day-status--unset'}`}>
                        {horario ? (horario.esLaborable ? 'Laborable' : 'No laborable') : 'No configurado'}
                      </span>
                    </div>

                    {horario?.esLaborable ? (
                      <div className="horario-day-times">
                        <div><span>Ingreso 1</span><strong>{formatTime(horario.horaIngreso1)}</strong></div>
                        <div><span>Salida 1</span><strong>{formatTime(horario.horaSalida1)}</strong></div>
                        <div><span>Ingreso 2</span><strong>{formatTime(horario.horaIngreso2)}</strong></div>
                        <div><span>Salida 2</span><strong>{formatTime(horario.horaSalida2)}</strong></div>
                      </div>
                    ) : (
                      <p className="horario-day-description">
                        {horario ? 'No se asignan horas a este día.' : 'Este día aún no tiene un horario registrado.'}
                      </p>
                    )}

                    <button
                      type="button"
                      className="horario-day-action"
                      onClick={() => setModalDay(day.value)}
                      disabled={horariosLoading}
                    >
                      <GoogleIcon name={horario ? 'edit' : 'add'} size={17} color="#2563eb" />
                      {horario ? 'Editar horario' : 'Configurar día'}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {modalDay !== null && selectedSede && (
        <HorarioSedeFormModal
          sedeId={selectedSede.id}
          sedeNombre={selectedSede.nombre}
          diaSemana={modalDay}
          diaNombre={DIAS_SEMANA.find((day) => day.value === modalDay)?.label ?? ''}
          horario={horariosByDay.get(modalDay) ?? null}
          onClose={() => setModalDay(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
