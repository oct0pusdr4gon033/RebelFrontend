import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad } from '../../types/oportunidades';
import {
  obtenerImagenesOportunidadApi,
  subirImagenOportunidadApi,
  eliminarImagenOportunidadApi,
  getImagenArchivoUrl,
  type OportunidadImagenItem,
} from '../../api/services/oportunidades.service';

interface SubirEvidenciaViewProps {
  oportunidades: Oportunidad[];
  roleAccent: string;
  preselectedOportunidadId?: string | number | null;
}

/**
 * Estados considerados "Activos" para poder subir evidencias de cotización o capturas.
 * Las oportunidades adjudicadas / con OC / entregadas quedan fuera del combo.
 */
const ESTADOS_ACTIVOS = ['En Licitación', 'Cotizada'];

const esPdf = (item: OportunidadImagenItem) => item.contentType === 'application/pdf' || item.nombreArchivo.toLowerCase().endsWith('.pdf');

export const SubirEvidenciaView: React.FC<SubirEvidenciaViewProps> = ({
  oportunidades,
  roleAccent,
  preselectedOportunidadId,
}) => {
  const { empleado } = useAuth();

  // Filtrar exclusivamente los requerimientos registrados por el usuario en sesión
  const misOportunidades = useMemo(() => {
    return oportunidades.filter((op) => isOportunidadOwner(op, empleado));
  }, [oportunidades, empleado]);

  // Solo requerimientos en estado Activo (En Licitación / Cotizada)
  const opcionesActivas = useMemo(() => {
    return misOportunidades.filter((op) => ESTADOS_ACTIVOS.includes(op.estado));
  }, [misOportunidades]);

  const [selectedOpId, setSelectedOpId] = useState<string | number>(() => {
    if (preselectedOportunidadId) {
      const match = oportunidades.find((o) => String(o.id) === String(preselectedOportunidadId));
      if (match && isOportunidadOwner(match, empleado) && ESTADOS_ACTIVOS.includes(match.estado)) {
        return preselectedOportunidadId;
      }
    }
    const primeraActiva = opcionesActivas[0];
    return primeraActiva?.id ?? '';
  });

  useEffect(() => {
    if (preselectedOportunidadId) {
      const match = opcionesActivas.find((o) => String(o.id) === String(preselectedOportunidadId));
      if (match) {
        setSelectedOpId(preselectedOportunidadId);
      } else if (opcionesActivas.length > 0) {
        setSelectedOpId(opcionesActivas[0].id);
      } else {
        setSelectedOpId('');
      }
    } else if (opcionesActivas.length > 0 && !opcionesActivas.some((o) => String(o.id) === String(selectedOpId))) {
      setSelectedOpId(opcionesActivas[0].id);
    } else if (opcionesActivas.length === 0) {
      setSelectedOpId('');
    }
  }, [preselectedOportunidadId, opcionesActivas]);

  const [comentario, setComentario] = useState<string>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de evidencias cargadas desde la Base de Datos (Storage BYTEA)
  const [imagenes, setImagenes] = useState<OportunidadImagenItem[]>([]);
  const [loadingImagenes, setLoadingImagenes] = useState<boolean>(false);
  const [modalImagen, setModalImagen] = useState<OportunidadImagenItem | null>(null);

  // Vista previa local del archivo seleccionado (imágenes o PDF)
  const previewUrl = useMemo(() => {
    if (!archivo) return null;
    return URL.createObjectURL(archivo);
  }, [archivo]);
  const archivoEsPdf = useMemo(() => {
    if (!archivo) return false;
    return archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
  }, [archivo]);

  // Cargar evidencias de la oportunidad seleccionada desde la BD
  const cargarImagenes = (opId: string | number) => {
    if (!opId) {
      setImagenes([]);
      return;
    }
    setLoadingImagenes(true);
    obtenerImagenesOportunidadApi(opId)
      .then((data) => {
        setImagenes(data);
      })
      .catch((err) => {
        console.error('Error al cargar evidencias fotográficas:', err);
      })
      .finally(() => {
        setLoadingImagenes(false);
      });
  };

  useEffect(() => {
    cargarImagenes(selectedOpId);
  }, [selectedOpId]);

  /**
   * Validación: imágenes (JPG, PNG, WEBP) siempre; PDF únicamente para la
   * cotización de la marca (el backend lo asigna como "Cotización de Marca").
   */
  const validarArchivoEvidencia = (file: File): boolean => {
    const tiposImagen = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const esImagenValida = tiposImagen.includes(file.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '');
    const esPdfValido = file.type === 'application/pdf' || extension === 'pdf';

    if (!esImagenValida && !esPdfValido) {
      setErrorMsg('Formato no permitido. Solo puedes subir capturas (imagen) o el PDF de cotización de la marca.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validarArchivoEvidencia(file)) {
        setArchivo(file);
      } else {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validarArchivoEvidencia(file)) {
        setArchivo(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpId || !archivo) return;

    const opEncontrada = misOportunidades.find((o) => String(o.id) === String(selectedOpId));
    if (!opEncontrada) {
      alert('Solo puedes subir evidencias a los requerimientos registrados por tu usuario.');
      return;
    }
    if (!opcionesActivas.some((o) => String(o.id) === String(selectedOpId))) {
      alert('El requerimiento ya no se encuentra en estado activo. Solo se admiten evidencias para En Licitación o Cotizada.');
      return;
    }

    if (!validarArchivoEvidencia(archivo)) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const nuevaImagen = await subirImagenOportunidadApi(
        selectedOpId,
        archivo,
        '',
        comentario
      );

      setImagenes((prev) => [nuevaImagen, ...prev]);
      const tipoMostrado = nuevaImagen.tipoEvidencia;
      setSuccessMsg(`¡Evidencia "${archivo.name}" guardada con éxito (${tipoMostrado}) para ${opEncontrada.numeroRequerimiento}!`);
      setArchivo(null);
      setComentario('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo guardar la evidencia. Verifica tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (imagenId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta evidencia?')) {
      return;
    }

    try {
      await eliminarImagenOportunidadApi(selectedOpId, imagenId);
      setImagenes((prev) => prev.filter((img) => img.id !== imagenId));
      setSuccessMsg('Evidencia eliminada correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la evidencia. Inténtalo de nuevo.');
    }
  };


  return (
    <div className="evi-page">
      {/* ── Toast de Éxito ── */}
      {successMsg && (
        <div className="evi-toast evi-toast--success">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleIcon name="check_circle" size={20} color="#059669" />
            <strong>{successMsg}</strong>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="evi-toast__close">
            <GoogleIcon name="close" size={16} color="#065f46" />
          </button>
        </div>
      )}

      {/* ── Toast de Error ── */}
      {errorMsg && (
        <div className="evi-toast evi-toast--error">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleIcon name="error" size={20} color="#dc2626" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="evi-toast__close">
            <GoogleIcon name="close" size={16} color="#b91c1c" />
          </button>
        </div>
      )}

      {/* ── Formulario de Carga de Evidencia ── */}
      <div className="evi-card">
        <div className="evi-card__head">
          <div className="evi-card__head-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="add_photo_alternate" size={22} color={roleAccent} />
          </div>
          <div>
            <h3>Adjuntar nueva evidencia</h3>
            <p>Selecciona el requerimiento, arrastra el archivo y sube la evidencia.</p>
          </div>
        </div>

        <div className="evi-card__body">
          {opcionesActivas.length === 0 ? (
            <div className="evi-empty">
              <div className="evi-empty__icon">
                <GoogleIcon name="lock" size={28} color="#ef4444" />
              </div>
              <h4>
                {misOportunidades.length === 0
                  ? 'Solo puedes subir evidencias para tus propios requerimientos'
                  : 'No tienes requerimientos en estado activo'}
              </h4>
              <p>
                {misOportunidades.length === 0
                  ? 'Actualmente no tienes requerimientos registrados a tu nombre. Para cargar capturas o el PDF de cotización, primero debes registrar una oportunidad comercial.'
                  : 'Actualmente no tienes requerimientos en estado En Licitación o Cotizada. Las oportunidades ya adjudicadas se gestionan desde el panel de Órdenes de Compra.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="evi-grid-2">
                {/* Oportunidad asociada (SOLO ESTADOS ACTIVOS) */}
                <div className="evi-field">
                  <label>
                    Requerimiento <span className="required">*</span>
                  </label>
                  <select
                    className="evi-select"
                    value={selectedOpId}
                    onChange={(e) => setSelectedOpId(e.target.value)}
                    required
                  >
                    {opcionesActivas.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.numeroRequerimiento} &bull; {op.estado} &bull; S/ {Number(op.limiteTotal).toLocaleString('es-PE')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tipo de documento auto-detectado (contexto informativo) */}
                <div className="evi-field">
                  <label>Tipo de evidencia</label>
                  <div className="evi-note" style={{ background: `${roleAccent}0d`, borderColor: `${roleAccent}30` }}>
                    <GoogleIcon name="auto_awesome" size={18} color={roleAccent} />
                    <span>
                      <strong>Se asigna automáticamente:</strong> imágenes &rarr; Captura de Evidencia &middot; PDF &rarr; Cotización de Marca.
                    </span>
                  </div>
                </div>
              </div>

              {/* Zona Drag & Drop (IMÁGENES O PDF DE COTIZACIÓN) */}
              <div
                className={`evi-dropzone ${dragOver ? 'dragover' : ''} ${archivo ? 'has-file' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                  style={{ display: 'none' }}
                />

                {archivo ? (
                  <div className="evi-file-card">
                    {previewUrl && !archivoEsPdf ? (
                      <img src={previewUrl} alt="Vista previa" className="evi-file-thumb" />
                    ) : (
                      <div
                        className="evi-file-icon"
                        style={{
                          background: archivoEsPdf ? '#fee2e2' : '#dcfce7',
                        }}
                      >
                        <GoogleIcon name={archivoEsPdf ? 'picture_as_pdf' : 'check_circle'} size={30} color={archivoEsPdf ? '#dc2626' : '#16a34a'} />
                      </div>
                    )}
                    <div className="evi-file-meta">
                      <div className="evi-file-name">{archivo.name}</div>
                      <div className="evi-file-sub">
                        {(archivo.size / (1024 * 1024)).toFixed(2)} MB &bull;{' '}
                        {archivoEsPdf ? 'Cotización de Marca (PDF) lista para guardar' : 'Captura (imagen) lista para guardar'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArchivo(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="evi-btn-ghost evi-btn-ghost--remove"
                    >
                      <GoogleIcon name="close" size={14} color="#ef4444" />
                      <span>Cambiar</span>
                    </button>
                  </div>
                ) : (
                  <div className="evi-dropzone__inner">
                    <div className="evi-dropzone__icon" style={{ background: `${roleAccent}15` }}>
                      <GoogleIcon name="add_photo_alternate" size={34} color={roleAccent} />
                    </div>
                    <div>
                      <div className="evi-dropzone__title">Arrastra tu evidencia aquí o haz clic para examinar</div>
                      <div className="evi-dropzone__hint">Capturas de pantalla (imágenes) para la evidencia visual &bull; <strong>PDF</strong> para la cotización de la marca &bull; Máximo 25 MB</div>
                    </div>
                    <div className="evi-dropzone__tags">
                      <span className="evi-tag evi-tag--img">
                        <GoogleIcon name="image" size={13} color="#1d4ed8" /> Captura (imagen)
                      </span>
                      <span className="evi-tag evi-tag--pdf">
                        <GoogleIcon name="picture_as_pdf" size={13} color="#b91c1c" /> Cotización (PDF)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Observaciones opcionales */}
              <div className="evi-field" style={{ marginTop: 16 }}>
                <label>Observaciones / N° de Registro en Perú Compras (Opcional)</label>
                <input
                  type="text"
                  className="evi-input"
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Ej: Confirmación de envío de proforma en catálogo electrónico a las 11:15 AM"
                />
              </div>

              {/* Botón de Enviar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
                <button
                  type="submit"
                  disabled={!archivo || !selectedOpId || loading}
                  className="evi-btn-submit"
                >
                  <GoogleIcon name="cloud_upload" size={18} color="#ffffff" />
                  <span>{loading ? 'Guardando...' : 'Subir evidencia'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Listado de Evidencias Almacenadas en la Base de Datos ── */}
      <div className="evi-card">
        <div className="evi-card__head evi-card__head--list">
          <div className="evi-card__head-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="collections" size={20} color={roleAccent} />
          </div>
          <div style={{ flex: 1 }}>
            <h3>Evidencias Registradas <span className="evi-counter">{imagenes.length}</span></h3>
            <p>Evidencias subidas para el requerimiento seleccionado.</p>
          </div>
          <button
            type="button"
            onClick={() => cargarImagenes(selectedOpId)}
            title="Actualizar listado de evidencias"
            className="evi-btn-refresh"
          >
            <GoogleIcon name="refresh" size={16} color="#64748b" />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="evi-card__body" style={{ paddingTop: 6 }}>
          {loadingImagenes ? (
            <div className="evi-state">
              <GoogleIcon name="hourglass_empty" size={32} color={roleAccent} />
              <p>Cargando evidencias...</p>
            </div>
          ) : imagenes.length === 0 ? (
            <div className="evi-state">
              <div className="evi-empty__icon" style={{ background: '#f8fafc' }}>
                <GoogleIcon name="photo_camera_back" size={32} color="#94a3b8" />
              </div>
              <p style={{ fontWeight: 600, color: '#475569' }}>Aún no se han guardado evidencias para este requerimiento.</p>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                Utiliza el formulario superior para adjuntar capturas de pantalla o el PDF de cotización de la marca.
              </p>
            </div>
          ) : (
            <div className="evi-table-wrap">
              <table className="evi-table">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>{esPdf(imagenes[0]) ? 'Icono' : 'Miniatura'}</th>
                    <th>Requerimiento</th>
                    <th>Tipo de Evidencia</th>
                    <th>Archivo</th>
                    <th>Observación</th>
                    <th>Subido por</th>
                    <th>Fecha de Registro</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {imagenes.map((ev) => {
                    const archivoUrl = getImagenArchivoUrl(ev.oportunidadId, ev.id);
                    const pdf = esPdf(ev);
                    return (
                      <tr key={ev.id}>
                        <td>
                          {pdf ? (
                            <div
                              onClick={() => setModalImagen(ev)}
                              className="evi-thumb evi-thumb--pdf"
                              title="Clic para ver el PDF"
                            >
                              <GoogleIcon name="picture_as_pdf" size={22} color="#dc2626" />
                            </div>
                          ) : (
                            <img
                              src={archivoUrl}
                              alt={ev.nombreArchivo}
                              onClick={() => setModalImagen(ev)}
                              className="evi-thumb"
                              title="Clic para ver en tamaño completo"
                            />
                          )}
                        </td>
                        <td>
                          <span className="evi-req">
                            <GoogleIcon name="assignment" size={13} color="#0369a1" />
                            <strong>{ev.numeroRequerimiento}</strong>
                          </span>
                        </td>
                        <td>
                          <span className={`evi-type-badge ${pdf ? 'evi-type-badge--pdf' : 'evi-type-badge--img'}`}>
                            <GoogleIcon name={pdf ? 'picture_as_pdf' : 'image'} size={13} color={pdf ? '#b91c1c' : '#1d4ed8'} />
                            {ev.tipoEvidencia}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <a
                              href={archivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="evi-link"
                              title="Abrir archivo en pestaña nueva"
                            >
                              {ev.nombreArchivo}
                            </a>
                            <span className="evi-size">({ev.tamanoArchivo})</span>
                          </div>
                        </td>
                        <td className="evi-cell-muted" style={{ maxWidth: 200 }}>
                          {ev.comentario ?? '-'}
                        </td>
                        <td style={{ fontSize: 13, color: '#334155' }}>
                          {ev.subidoPor}
                        </td>
                        <td className="evi-cell-muted">
                          {new Date(ev.fechaSubida).toLocaleString('es-PE')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              type="button"
                              onClick={() => setModalImagen(ev)}
                              title="Ver archivo completo"
                              className="evi-action evi-action--view"
                            >
                              <GoogleIcon name="visibility" size={16} color="#1d4ed8" />
                            </button>
                            <a
                              href={archivoUrl}
                              download={ev.nombreArchivo}
                              title="Descargar archivo"
                              className="evi-action evi-action--download"
                              style={{ textDecoration: 'none' }}
                            >
                              <GoogleIcon name="download" size={16} color="#059669" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleEliminar(ev.id)}
                              title="Eliminar evidencia"
                              className="evi-action evi-action--delete"
                            >
                              <GoogleIcon name="delete" size={16} color="#ef4444" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de Vista en Tamaño Completo (Imagen o PDF) ── */}
      {modalImagen && (
        <div className="evi-modal-overlay" onClick={() => setModalImagen(null)}>
          <div className="evi-modal" onClick={(e) => e.stopPropagation()}>
            <div className="evi-modal__head">
              <div style={{ minWidth: 0 }}>
                <h4>{modalImagen.nombreArchivo}</h4>
                <div className="evi-modal__meta">
                  {modalImagen.numeroRequerimiento} &bull; {modalImagen.tipoEvidencia} &bull; {modalImagen.tamanoArchivo}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                  download={modalImagen.nombreArchivo}
                  className="evi-modal__download"
                  style={{ background: roleAccent }}
                >
                  <GoogleIcon name="download" size={16} color="#ffffff" />
                  <span>Descargar</span>
                </a>
                <button type="button" onClick={() => setModalImagen(null)} className="evi-modal__close">
                  <GoogleIcon name="close" size={18} color="#475569" />
                </button>
              </div>
            </div>
            <div className="evi-modal__body">
              {esPdf(modalImagen) ? (
                <iframe
                  src={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                  title={modalImagen.nombreArchivo}
                  className="evi-modal__frame"
                />
              ) : (
                <img
                  src={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                  alt={modalImagen.nombreArchivo}
                  className="evi-modal__img"
                />
              )}
              {modalImagen.comentario && (
                <div className="evi-modal__footer">
                  <strong>Observación:</strong> {modalImagen.comentario}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};