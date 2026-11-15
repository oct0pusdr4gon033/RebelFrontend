import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useLlamadaCuota } from '../../hooks/useLlamadaCuota';
import {
  notificarCambioLlamadas,
  obtenerDirectorioLlamadas,
  registrarLlamada,
} from '../../api/services/llamadas.service';
import {
  RESULTADOS_LLAMADA,
  type DirectorioLlamada,
  type ResultadoLlamada,
} from '../../api/Dtos/Llamada';
import { formatearHoraCuota } from '../../utils/llamadasUtils';
import './Llamadas.css';

interface RegistroLlamadaViewProps {
  contacto: DirectorioLlamada | null;
  roleAccent?: string;
  onSeleccionarContacto: (contacto: DirectorioLlamada | null) => void;
  onRegistered?: () => void;
}

const DESCRIPCION_RESULTADO: Record<ResultadoLlamada, string> = {
  'SIN CONTACTO': 'No se logró comunicación',
  LOGISTICO: 'Consulta o gestión logística',
  'LOG+COTIZ': 'Logístico y solicitud de cotización',
  'LOG+OC': 'Logístico y orden de compra',
};

export function RegistroLlamadaView({
  contacto,
  roleAccent = '#2563eb',
  onSeleccionarContacto,
  onRegistered,
}: RegistroLlamadaViewProps) {
  const { cuota, refresh: refreshCuota } = useLlamadaCuota();
  const [busqueda, setBusqueda] = useState('');
  const [contactos, setContactos] = useState<DirectorioLlamada[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [numeroMarcado, setNumeroMarcado] = useState(
    contacto?.telefono || contacto?.telefonoLimpio || ''
  );
  const [resultado, setResultado] = useState<ResultadoLlamada>('SIN CONTACTO');
  const [comentario, setComentario] = useState('');
  const [proximaLlamada, setProximaLlamada] = useState('');
  const [solicitoCotizacion, setSolicitoCotizacion] = useState(false);
  const [generoOc, setGeneroOc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setNumeroMarcado(contacto?.telefono || contacto?.telefonoLimpio || '');
    setError(null);
  }, [contacto]);

  useEffect(() => {
    if (contacto) return;

    let activo = true;
    const timer = window.setTimeout(() => {
      setBuscando(true);
      obtenerDirectorioLlamadas({
        busqueda: busqueda.trim() || undefined,
        soloPendientes: true,
        page: 1,
        pageSize: 8,
      })
        .then((data) => {
          if (activo) setContactos(data.items);
        })
        .catch(() => {
          if (activo) setContactos([]);
        })
        .finally(() => {
          if (activo) setBuscando(false);
        });
    }, busqueda ? 320 : 0);

    return () => {
      activo = false;
      window.clearTimeout(timer);
    };
  }, [busqueda, contacto]);

  const cambiarResultado = (nuevo: ResultadoLlamada) => {
    setResultado(nuevo);
    setSolicitoCotizacion(nuevo === 'LOG+COTIZ' || nuevo === 'LOG+OC');
    setGeneroOc(nuevo === 'LOG+OC');
  };

  const cuotaImpideRegistro = Boolean(
    cuota?.aplicaCuota && !cuota.puedeRegistrarLlamada
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const digitosNumero = numeroMarcado.replace(/\D/g, '').length;
    if (digitosNumero < 6 || digitosNumero > 50) {
      setError('Ingresa un número telefónico válido de 6 a 50 dígitos.');
      return;
    }

    if (proximaLlamada) {
      const fecha = new Date(proximaLlamada);
      if (Number.isNaN(fecha.getTime()) || fecha.getTime() <= Date.now()) {
        setError('La próxima llamada programada debe ser posterior a la hora actual.');
        return;
      }
    }

    setLoading(true);
    try {
      await registrarLlamada({
        directorioId: contacto?.id ?? null,
        numeroMarcado: numeroMarcado.trim(),
        contactoNombre: contacto?.nombreContacto ?? null,
        entidadNombre: contacto?.nombreEntidad ?? null,
        resultadoSemaforo: resultado,
        solicitoCotizacion,
        generoOc,
        comentario: comentario.trim() || null,
        proximaLlamadaProgramada: proximaLlamada
          ? new Date(proximaLlamada).toISOString()
          : null,
      });

      setSuccess(
        `Llamada registrada para ${
          contacto?.nombreContacto || contacto?.nombreEntidad || numeroMarcado
        }.`
      );
      setComentario('');
      setProximaLlamada('');
      setResultado('SIN CONTACTO');
      setSolicitoCotizacion(false);
      setGeneroOc(false);
      notificarCambioLlamadas();
      await refreshCuota();
      onRegistered?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la llamada.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      {cuota?.estaBloqueado && (
        <div className="llamadas-banner llamadas-banner--danger">
          <GoogleIcon name="lock" size={18} color="#b91c1c" />
          <span>
            El registro de oportunidades está bloqueado. {cuota.mensaje}
          </span>
        </div>
      )}

      {!cuota?.estaBloqueado && cuota?.aplicaCuota && !cuota.puedeRegistrarLlamada && (
        <div className="llamadas-banner llamadas-banner--warning">
          <GoogleIcon name="schedule" size={18} color="#b45309" />
          <span>
            {cuota.mensaje} La ventana de llamadas es de{' '}
            {formatearHoraCuota(cuota.horaInicio)} a {formatearHoraCuota(cuota.horaFin)}.
          </span>
        </div>
      )}

      {cuota?.tieneExcepcion && (
        <div className="llamadas-banner llamadas-banner--info">
          <GoogleIcon name="verified_user" size={18} color="#1d4ed8" />
          <span>Desbloqueo excepcional autorizado para el día de hoy.</span>
        </div>
      )}

      <div className="llamadas-card">
        <div className="llamadas-card__body">
          {contacto ? (
            <div className="llamadas-contact-card">
              <div className="llamadas-contact-card__main">
                <span className="llamadas-contact-card__icon">
                  <GoogleIcon name="contact_phone" size={20} color="#1d4ed8" />
                </span>
                <div>
                  <strong>{contacto.nombreContacto || 'Contacto sin nombre'}</strong>
                  <span>
                    {contacto.nombreEntidad}
                    {contacto.cargoContacto ? ` · ${contacto.cargoContacto}` : ''}
                  </span>
                  <br />
                  <span>{contacto.telefono || 'Sin teléfono registrado'}</span>
                </div>
              </div>
              <button
                type="button"
                className="llamadas-btn llamadas-btn--sm"
                onClick={() => onSeleccionarContacto(null)}
              >
                <GoogleIcon name="swap_horiz" size={14} />
                Cambiar contacto
              </button>
            </div>
          ) : (
            <div className="llamadas-field">
              <label>Buscar contacto del directorio</label>
              <div className="llamadas-search">
                <GoogleIcon name="search" size={17} color="#94a3b8" />
                <input
                  type="search"
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  placeholder="Buscar por entidad, RUC, contacto o teléfono..."
                />
              </div>
              <div className="llamadas-contact-list">
                {buscando ? (
                  <div className="llamadas-muted">Buscando contactos...</div>
                ) : contactos.length === 0 ? (
                  <div className="llamadas-muted">
                    No se encontraron contactos pendientes. Puedes registrar la llamada
                    con un número libre.
                  </div>
                ) : (
                  contactos.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="llamadas-contact-option"
                      onClick={() => onSeleccionarContacto(item)}
                    >
                      <span>
                        <span className="llamadas-strong">
                          {item.nombreContacto || 'Contacto sin nombre'}
                        </span>
                        <span className="llamadas-muted" style={{ display: 'block' }}>
                          {item.nombreEntidad}
                          {item.ruc ? ` · ${item.ruc}` : ''}
                        </span>
                      </span>
                      <span className="llamadas-phone">{item.telefono || 'Sin teléfono'}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <form className="llamadas-form" onSubmit={handleSubmit}>
          {success && <div className="llamadas-success">{success}</div>}
          {error && <div className="llamadas-error" style={{ margin: 0 }}>{error}</div>}

          <div className="llamadas-form-grid">
            <div className="llamadas-field">
              <label htmlFor="llamada-numero">Número marcado *</label>
              <input
                id="llamada-numero"
                className="llamadas-input"
                value={numeroMarcado}
                onChange={(event) => setNumeroMarcado(event.target.value)}
                placeholder="Ej. 987654321"
                inputMode="tel"
                maxLength={50}
                required
              />
            </div>

            <div className="llamadas-field">
              <label htmlFor="llamada-proxima">Próxima llamada programada</label>
              <input
                id="llamada-proxima"
                type="datetime-local"
                className="llamadas-input"
                value={proximaLlamada}
                onChange={(event) => setProximaLlamada(event.target.value)}
              />
            </div>
          </div>

          <div className="llamadas-field">
            <label>Resultado de la llamada *</label>
            <div className="llamadas-results">
              {RESULTADOS_LLAMADA.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`llamadas-result-option ${
                    resultado === item ? 'llamadas-result-option--active' : ''
                  }`}
                  onClick={() => cambiarResultado(item)}
                >
                  <strong>{item}</strong>
                  <span>{DESCRIPCION_RESULTADO[item]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="llamadas-form-grid">
            <label className="llamadas-check">
              <input
                type="checkbox"
                checked={solicitoCotizacion}
                onChange={(event) => setSolicitoCotizacion(event.target.checked)}
              />
              Solicitó cotización
            </label>
            <label className="llamadas-check">
              <input
                type="checkbox"
                checked={generoOc}
                onChange={(event) => setGeneroOc(event.target.checked)}
              />
              Generó orden de compra
            </label>
          </div>

          <div className="llamadas-field">
            <label htmlFor="llamada-comentario">Comentario</label>
            <textarea
              id="llamada-comentario"
              className="llamadas-textarea"
              value={comentario}
              onChange={(event) => setComentario(event.target.value)}
              maxLength={2000}
              placeholder="Detalle de la gestión, respuesta del contacto o siguiente paso..."
            />
          </div>

          <div className="llamadas-inline-actions" style={{ justifyContent: 'space-between' }}>
            <span className="llamadas-note">
              Cuota diaria: {cuota?.realizadasHoy ?? 0}/{cuota?.limiteDiario ?? 20}. Semana:{' '}
              {cuota?.realizadasSemana ?? 0}/{cuota?.limiteSemanal ?? 100}.
            </span>
            <button
              type="submit"
              className="llamadas-btn llamadas-btn--primary"
              disabled={loading || cuotaImpideRegistro}
            >
              <GoogleIcon name="call" size={16} color="#ffffff" />
              {loading ? 'Registrando...' : 'Registrar llamada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
