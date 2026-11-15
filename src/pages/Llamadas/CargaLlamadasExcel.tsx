import { useRef, useState, type CSSProperties, type ChangeEvent } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import {
  confirmarCargaLlamadas,
  notificarCambioLlamadas,
  previsualizarCargaLlamadas,
} from '../../api/services/llamadas.service';
import type {
  PrevisualizacionCargaLlamadas,
  ResultadoCargaLlamadas,
} from '../../api/Dtos/Llamada';
import './Llamadas.css';

interface CargaLlamadasExcelProps {
  roleAccent?: string;
  onCargado?: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function CargaLlamadasExcel({
  roleAccent = '#2563eb',
  onCargado,
}: CargaLlamadasExcelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<PrevisualizacionCargaLlamadas | null>(null);
  const [resultado, setResultado] = useState<ResultadoCargaLlamadas | null>(null);
  const [modoAsignacion, setModoAsignacion] = useState<'Automatica' | 'Seleccionada'>(
    'Automatica'
  );
  const [ejecutivaIds, setEjecutivaIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seleccionarArchivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!file) return;

    setError(null);
    setResultado(null);
    setPreview(null);
    setEjecutivaIds([]);

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setError('El archivo debe tener extensión .xlsx.');
      setArchivo(null);
      return;
    }

    if (file.size > MAX_BYTES) {
      setError('El archivo supera el tamaño máximo de 10 MB.');
      setArchivo(null);
      return;
    }

    setArchivo(file);
    setLoading(true);
    try {
      const data = await previsualizarCargaLlamadas(file);
      setPreview(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo previsualizar el archivo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const alternarEjecutiva = (id: number) => {
    setEjecutivaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const confirmar = async () => {
    if (!archivo) return;
    if (modoAsignacion === 'Seleccionada' && ejecutivaIds.length === 0) {
      setError('Selecciona al menos una ejecutiva para la asignación manual.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await confirmarCargaLlamadas(archivo, {
        modoAsignacion,
        ejecutivaIds: modoAsignacion === 'Seleccionada' ? ejecutivaIds : undefined,
      });
      setResultado(data);
      setPreview(null);
      setArchivo(null);
      setEjecutivaIds([]);
      notificarCambioLlamadas();
      onCargado?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo confirmar la carga.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="llamadas-shell" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="llamadas-card">
        <div className="llamadas-section-title">
          <div>
            <h3>Carga semanal de llamadas</h3>
            <p>
              Importa el archivo Excel oficial. La carga reemplaza el directorio activo y
              conserva el histórico de llamadas.
            </p>
          </div>
          <span className="llamadas-resultado llamada-resultado--pendiente">.xlsx · máx. 10 MB</span>
        </div>

        <div className="llamadas-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label className="llamadas-upload">
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => void seleccionarArchivo(event)}
            />
            <GoogleIcon name="upload_file" size={30} color={roleAccent} />
            <strong>{archivo ? archivo.name : 'Seleccionar archivo llamadas.xlsx'}</strong>
            <span>
              {archivo
                ? `${(archivo.size / 1024).toFixed(1)} KB · listo para confirmar`
                : 'Haz clic para elegir el archivo de la semana'}
            </span>
          </label>

          {error && <div className="llamadas-error" style={{ margin: 0 }}>{error}</div>}

          {resultado && (
            <div className="llamadas-banner llamadas-banner--info">
              <GoogleIcon name="task_alt" size={18} color="#1d4ed8" />
              <span>
                Carga completada: {resultado.insertadas} insertadas, {resultado.actualizadas}{' '}
                actualizadas, {resultado.omitidas} omitidas, {resultado.errores} con error.
              </span>
            </div>
          )}

          {preview && (
            <>
              <div className="llamadas-preview-grid">
                <div className="llamadas-preview-stat">
                  <span>Archivo</span>
                  <strong style={{ fontSize: '0.82rem' }}>{preview.nombreArchivo}</strong>
                </div>
                <div className="llamadas-preview-stat">
                  <span>Hoja</span>
                  <strong>{preview.hoja}</strong>
                </div>
                <div className="llamadas-preview-stat">
                  <span>Filas</span>
                  <strong>{preview.totalFilas}</strong>
                </div>
                <div className="llamadas-preview-stat">
                  <span>Válidas</span>
                  <strong style={{ color: '#059669' }}>{preview.filasValidas}</strong>
                </div>
                <div className="llamadas-preview-stat">
                  <span>Inválidas</span>
                  <strong style={{ color: '#dc2626' }}>{preview.filasInvalidas}</strong>
                </div>
                <div className="llamadas-preview-stat">
                  <span>Duplicadas</span>
                  <strong style={{ color: '#d97706' }}>{preview.filasDuplicadas}</strong>
                </div>
              </div>

              {preview.errores.length > 0 && (
                <div className="llamadas-errors">
                  {preview.errores.slice(0, 20).map((item, index) => (
                    <span key={`${item.fila}-${index}`}>
                      Fila {item.fila}: {item.mensaje}
                    </span>
                  ))}
                </div>
              )}

              <div className="llamadas-table-wrap">
                <table className="llamadas-table">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>RUC</th>
                      <th>Entidad</th>
                      <th>Contacto</th>
                      <th>Teléfono</th>
                      <th>Semáforo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.muestra.map((item) => (
                      <tr key={item.fila}>
                        <td>{item.fila}</td>
                        <td>{item.ruc || '—'}</td>
                        <td>{item.nombreEntidad || '—'}</td>
                        <td>{item.nombreContacto || '—'}</td>
                        <td>{item.telefono || '—'}</td>
                        <td>{item.semaforizacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="llamadas-field">
                <label>Modo de asignación</label>
                <div className="llamadas-results">
                  <button
                    type="button"
                    className={`llamadas-result-option ${
                      modoAsignacion === 'Automatica' ? 'llamadas-result-option--active' : ''
                    }`}
                    onClick={() => setModoAsignacion('Automatica')}
                  >
                    <strong>Automática</strong>
                    <span>Distribución equitativa entre las ejecutivas activas</span>
                  </button>
                  <button
                    type="button"
                    className={`llamadas-result-option ${
                      modoAsignacion === 'Seleccionada' ? 'llamadas-result-option--active' : ''
                    }`}
                    onClick={() => setModoAsignacion('Seleccionada')}
                  >
                    <strong>Seleccionada</strong>
                    <span>Elegir las ejecutivas que recibirán contactos</span>
                  </button>
                </div>
              </div>

              {modoAsignacion === 'Seleccionada' && (
                <div className="llamadas-exec-options">
                  {preview.ejecutivas.length === 0 ? (
                    <span className="llamadas-note">
                      No hay ejecutivas de ventas disponibles para asignación.
                    </span>
                  ) : (
                    preview.ejecutivas.map((ejecutiva) => (
                      <label key={ejecutiva.id} className="llamadas-exec-option">
                        <input
                          type="checkbox"
                          checked={ejecutivaIds.includes(ejecutiva.id)}
                          onChange={() => alternarEjecutiva(ejecutiva.id)}
                        />
                        {ejecutiva.nombre} ({ejecutiva.cargaActual})
                      </label>
                    ))
                  )}
                </div>
              )}

              <div className="llamadas-inline-actions" style={{ justifyContent: 'space-between' }}>
                <span className="llamadas-note">
                  Al confirmar, el directorio activo anterior será reemplazado. Las llamadas
                  históricas no se eliminan.
                </span>
                <button
                  type="button"
                  className="llamadas-btn llamadas-btn--primary"
                  onClick={() => void confirmar()}
                  disabled={
                    loading ||
                    preview.filasValidas === 0 ||
                    (modoAsignacion === 'Seleccionada' && ejecutivaIds.length === 0)
                  }
                >
                  <GoogleIcon name="cloud_upload" size={16} color="#ffffff" />
                  {loading ? 'Procesando...' : 'Confirmar carga'}
                </button>
              </div>
            </>
          )}

          {loading && !preview && (
            <div className="llamadas-note">Leyendo y validando el archivo...</div>
          )}
        </div>
      </div>
    </div>
  );
}
