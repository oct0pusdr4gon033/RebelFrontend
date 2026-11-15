import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import {
  crearExcepcionLlamada,
  obtenerSupervisionLlamadas,
  revocarExcepcionLlamada,
} from '../../api/services/llamadas.service';
import type {
  ResumenEjecutivaLlamadas,
  SupervisionLlamadas,
} from '../../api/Dtos/Llamada';
import { fechaHoyLima, formatearHoraCuota } from '../../utils/llamadasUtils';
import { formatFechaHoraPeru } from '../../utils/dateUtils';
import './Llamadas.css';

interface SupervisionLlamadasViewProps {
  roleAccent?: string;
}

function colorCumplimiento(valor: number): string {
  if (valor >= 100) return '#059669';
  if (valor >= 60) return '#2563eb';
  if (valor >= 30) return '#d97706';
  return '#dc2626';
}

export function SupervisionLlamadasView({
  roleAccent = '#2563eb',
}: SupervisionLlamadasViewProps) {
  const [fecha, setFecha] = useState(fechaHoyLima());
  const [data, setData] = useState<SupervisionLlamadas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<ResumenEjecutivaLlamadas | null>(null);
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await obtenerSupervisionLlamadas(fecha || undefined);
      setData(result);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar la supervisión de llamadas.'
      );
    } finally {
      setLoading(false);
    }
  }, [fecha]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const abrirExcepcion = (row: ResumenEjecutivaLlamadas) => {
    setTarget(row);
    setMotivo('');
    setModalError(null);
  };

  const cerrarExcepcion = () => {
    if (saving) return;
    setTarget(null);
    setMotivo('');
    setModalError(null);
  };

  const guardarExcepcion = async () => {
    if (!target) return;
    if (motivo.trim().length < 5) {
      setModalError('Describe el motivo del desbloqueo (mínimo 5 caracteres).');
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      await crearExcepcionLlamada({
        ejecutivaId: target.ejecutivaId,
        fechaDia: fecha,
        motivo: motivo.trim(),
      });
      setTarget(null);
      setMotivo('');
      await cargar();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'No se pudo crear el desbloqueo.');
    } finally {
      setSaving(false);
    }
  };

  const revocar = async (id: number) => {
    const confirmado = window.confirm('¿Revocar este desbloqueo excepcional?');
    if (!confirmado) return;

    try {
      await revocarExcepcionLlamada(id);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo revocar el desbloqueo.');
    }
  };

  const ejecutivas = data?.ejecutivas ?? [];
  const bloqueadas = ejecutivas.filter((row) => row.estaBloqueada && !row.tieneExcepcion).length;
  const excepciones = data?.excepciones ?? [];
  const esDiaActual = fecha === fechaHoyLima();

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="llamadas-kpis">
        <div className="llamadas-kpi">
          <span className="llamadas-kpi__icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <GoogleIcon name="call" size={20} color="#1d4ed8" />
          </span>
          <div>
            <div className="llamadas-kpi__value">{data?.totalLlamadas ?? 0}</div>
            <div className="llamadas-kpi__label">Llamadas del día</div>
          </div>
        </div>

        <div className="llamadas-kpi">
          <span className="llamadas-kpi__icon" style={{ background: '#f0f9ff', color: '#0369a1' }}>
            <GoogleIcon name="groups" size={20} color="#0369a1" />
          </span>
          <div>
            <div className="llamadas-kpi__value">{data?.totalEjecutivas ?? 0}</div>
            <div className="llamadas-kpi__label">Ejecutivas monitoreadas</div>
          </div>
        </div>

        <div className="llamadas-kpi">
          <span className="llamadas-kpi__icon" style={{ background: '#fef2f2', color: '#b91c1c' }}>
            <GoogleIcon name="lock" size={20} color="#b91c1c" />
          </span>
          <div>
            <div className="llamadas-kpi__value">{bloqueadas}</div>
            <div className="llamadas-kpi__label">Bloqueadas sin excepción</div>
          </div>
        </div>

        <div className="llamadas-kpi">
          <span className="llamadas-kpi__icon" style={{ background: '#f0fdf4', color: '#15803d' }}>
            <GoogleIcon name="verified_user" size={20} color="#15803d" />
          </span>
          <div>
            <div className="llamadas-kpi__value">{excepciones.length}</div>
            <div className="llamadas-kpi__label">Desbloqueos activos</div>
          </div>
        </div>
      </div>

      <div className="llamadas-card">
        <div className="llamadas-toolbar">
          <div className="llamadas-field" style={{ flex: '0 1 190px' }}>
            <label htmlFor="supervision-fecha">Fecha de supervisión</label>
            <input
              id="supervision-fecha"
              type="date"
              className="llamadas-input"
              value={fecha}
              max={fechaHoyLima()}
              onChange={(event) => setFecha(event.target.value)}
            />
          </div>

          <button type="button" className="llamadas-btn" onClick={() => void cargar()}>
            <GoogleIcon name="refresh" size={15} />
            Actualizar
          </button>

          <span className="llamadas-note" style={{ marginLeft: 'auto' }}>
            {esDiaActual
              ? 'Ventana de llamadas: 08:00 a 13:00 · Meta diaria 20 · Meta semanal 100'
              : 'Vista histórica de solo lectura · Los desbloqueos solo aplican al día actual'}
          </span>
        </div>

        {error && <div className="llamadas-error">{error}</div>}

        <div className="llamadas-table-wrap">
          <table className="llamadas-table">
            <thead>
              <tr>
                <th>Ejecutiva</th>
                <th>Hoy</th>
                <th>Semana</th>
                <th>Logístico</th>
                <th>Cotización</th>
                <th>OC</th>
                <th>Conversión</th>
                <th>Última llamada</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="llamadas-empty">
                    Cargando supervisión...
                  </td>
                </tr>
              ) : ejecutivas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="llamadas-empty">
                    No hay ejecutivas de ventas registradas.
                  </td>
                </tr>
              ) : (
                ejecutivas.map((row) => {
                  const color = colorCumplimiento(row.cumplimientoPorcentaje);
                  const avanceDiario = Math.min(100, Math.round(row.cumplimientoPorcentaje));
                  const avanceSemanal = Math.min(
                    100,
                    Math.round((row.llamadasSemana / Math.max(1, row.metaSemanal)) * 100)
                  );

                  return (
                    <tr key={row.ejecutivaId}>
                      <td>
                        <span className="llamadas-strong">{row.nombre}</span>
                        <div className="llamadas-muted">
                          {row.aplicaCuota ? 'Cuota activa' : 'Sin cuota'}
                        </div>
                      </td>
                      <td>
                        <div className="llamadas-inline-progress">
                          <strong style={{ color }}>
                            {row.llamadasHoy}/{row.metaDiaria}
                          </strong>
                          <span className="llamadas-progress">
                            <span style={{ width: `${avanceDiario}%`, background: color }} />
                          </span>
                        </div>
                        <div className="llamadas-muted">{avanceDiario}%</div>
                      </td>
                      <td>
                        <div className="llamadas-inline-progress">
                          <strong style={{ color: '#475569' }}>
                            {row.llamadasSemana}/{row.metaSemanal}
                          </strong>
                          <span className="llamadas-progress">
                            <span style={{ width: `${avanceSemanal}%`, background: '#7c3aed' }} />
                          </span>
                        </div>
                      </td>
                      <td>{row.llamadasLogisticas}</td>
                      <td>{row.llamadasCotizacion}</td>
                      <td>{row.llamadasOc}</td>
                      <td>
                        <span
                          className="llamadas-resultado"
                          style={{
                            background: '#f5f3ff',
                            color: '#6d28d9',
                            border: '1px solid #ddd6fe',
                          }}
                        >
                          {Math.round(row.conversionPorcentaje)}%
                        </span>
                      </td>
                      <td>
                        <span className="llamadas-muted">
                          {row.ultimaLlamadaUtc
                            ? formatFechaHoraPeru(row.ultimaLlamadaUtc, {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })
                            : 'Sin llamadas'}
                        </span>
                      </td>
                      <td>
                        {row.tieneExcepcion ? (
                          <span
                            className="llamadas-resultado llamada-resultado--oc"
                            style={{ display: 'inline-flex' }}
                          >
                            Con excepción
                          </span>
                        ) : row.estaBloqueada ? (
                          <span
                            className="llamadas-resultado llamada-resultado--sin-contacto"
                            style={{ display: 'inline-flex' }}
                          >
                            Bloqueada
                          </span>
                        ) : (
                          <span
                            className="llamadas-resultado llamada-resultado--pendiente"
                            style={{ display: 'inline-flex' }}
                          >
                            Sin bloqueo
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="llamadas-btn llamadas-btn--sm"
                          disabled={!esDiaActual || !row.estaBloqueada || row.tieneExcepcion}
                          onClick={() => abrirExcepcion(row)}
                          title={
                            !esDiaActual
                              ? 'El desbloqueo excepcional solo aplica al día actual'
                              : row.estaBloqueada && !row.tieneExcepcion
                                ? `Desbloquear a ${row.nombre}`
                                : 'Solo disponible para ejecutivas bloqueadas sin excepción'
                          }
                        >
                          <GoogleIcon name="lock_open" size={14} />
                          Desbloquear
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {excepciones.length > 0 && (
          <>
            <div className="llamadas-section-title">
              <div>
                <h3>Desbloqueos excepcionales activos</h3>
                <p>Solo aplican al día actual y quedan registrados con motivo y aprobador.</p>
              </div>
            </div>
            <div className="llamadas-exceptions">
              {excepciones.map((excepcion) => (
                <div key={excepcion.id} className="llamadas-exception">
                  <div>
                    <strong>{excepcion.ejecutivaNombre}</strong>
                    <div>
                      Motivo: {excepcion.motivo} · {formatFechaHoraPeru(excepcion.fechaDesbloqueoUtc)}
                    </div>
                    <div>
                      Autorizó: {excepcion.desbloqueadoPorNombre || excepcion.desbloqueadoPorUserId}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="llamadas-btn llamadas-btn--danger llamadas-btn--sm"
                    onClick={() => void revocar(excepcion.id)}
                  >
                    <GoogleIcon name="lock" size={14} />
                    Revocar
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {target && (
        <div className="llamadas-modal-overlay" onClick={cerrarExcepcion}>
          <div className="llamadas-modal" onClick={(event) => event.stopPropagation()}>
            <div className="llamadas-modal__header">
              <div>
                <h3>Desbloqueo excepcional</h3>
                <p className="llamadas-note" style={{ margin: '3px 0 0' }}>
                  {target.nombre} · {formatearHoraCuota('08:00:00')} a{' '}
                  {formatearHoraCuota('13:00:00')}
                </p>
              </div>
              <button
                type="button"
                className="llamadas-close"
                onClick={cerrarExcepcion}
                aria-label="Cerrar"
              >
                <GoogleIcon name="close" size={16} />
              </button>
            </div>
            <div className="llamadas-modal__body">
              <div className="llamadas-banner llamadas-banner--warning">
                <GoogleIcon name="info" size={17} color="#b45309" />
                <span>
                  El desbloqueo permite registrar oportunidades durante el resto del día.
                  No se puede autorizar a la misma persona.
                </span>
              </div>

              {modalError && <div className="llamadas-error" style={{ margin: 0 }}>{modalError}</div>}

              <div className="llamadas-field">
                <label htmlFor="motivo-excepcion">Motivo del desbloqueo *</label>
                <textarea
                  id="motivo-excepcion"
                  className="llamadas-textarea"
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  maxLength={1000}
                  placeholder="Explica por qué se autoriza el desbloqueo..."
                />
              </div>
            </div>
            <div className="llamadas-modal__footer">
              <button type="button" className="llamadas-btn" onClick={cerrarExcepcion}>
                Cancelar
              </button>
              <button
                type="button"
                className="llamadas-btn llamadas-btn--primary"
                onClick={() => void guardarExcepcion()}
                disabled={saving}
              >
                <GoogleIcon name="lock_open" size={15} color="#ffffff" />
                {saving ? 'Guardando...' : 'Autorizar desbloqueo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
