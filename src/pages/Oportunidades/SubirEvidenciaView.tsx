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

  const [selectedOpId, setSelectedOpId] = useState<string | number>(() => {
    if (preselectedOportunidadId) {
      const match = oportunidades.find((o) => String(o.id) === String(preselectedOportunidadId));
      if (match && isOportunidadOwner(match, empleado)) {
        return preselectedOportunidadId;
      }
    }
    const primeraPropia = oportunidades.find((o) => isOportunidadOwner(o, empleado));
    return primeraPropia?.id ?? '';
  });

  useEffect(() => {
    if (preselectedOportunidadId) {
      const match = misOportunidades.find((o) => String(o.id) === String(preselectedOportunidadId));
      if (match) {
        setSelectedOpId(preselectedOportunidadId);
      } else if (misOportunidades.length > 0) {
        setSelectedOpId(misOportunidades[0].id);
      } else {
        setSelectedOpId('');
      }
    } else if (misOportunidades.length > 0 && !misOportunidades.some((o) => String(o.id) === String(selectedOpId))) {
      setSelectedOpId(misOportunidades[0].id);
    } else if (misOportunidades.length === 0) {
      setSelectedOpId('');
    }
  }, [preselectedOportunidadId, misOportunidades]);

  // Combobox: Exclusivamente opciones de imágenes (capturas / fotos de sustento)
  const [tipoDoc, setTipoDoc] = useState<string>('Captura de Cotización en Perú Compras');
  const [comentario, setComentario] = useState<string>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de evidencias / imágenes cargadas desde la Base de Datos (Storage BYTEA)
  const [imagenes, setImagenes] = useState<OportunidadImagenItem[]>([]);
  const [loadingImagenes, setLoadingImagenes] = useState<boolean>(false);
  const [modalImagen, setModalImagen] = useState<OportunidadImagenItem | null>(null);

  // Vista previa local de la imagen seleccionada
  const previewUrl = useMemo(() => {
    if (!archivo) return null;
    return URL.createObjectURL(archivo);
  }, [archivo]);

  // Cargar imágenes de la oportunidad seleccionada desde la BD
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

  // Validación estricta: solo archivos de imagen
  const validarArchivoImagen = (file: File): boolean => {
    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    const esTipoValido = tiposValidos.includes(file.type) || ['png', 'jpg', 'jpeg', 'webp'].includes(extension || '');

    if (!esTipoValido) {
      setErrorMsg('Formato no permitido. En este módulo únicamente se pueden subir imágenes (PNG, JPG, JPEG, WEBP).');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validarArchivoImagen(file)) {
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
      if (validarArchivoImagen(file)) {
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

    if (!validarArchivoImagen(archivo)) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // Subir archivo al backend (almacenamiento directo en base de datos PostgreSQL)
      const nuevaImagen = await subirImagenOportunidadApi(
        selectedOpId,
        archivo,
        tipoDoc,
        comentario
      );

      setImagenes((prev) => [nuevaImagen, ...prev]);
      setSuccessMsg(`¡Evidencia fotográfica "${archivo.name}" guardada con éxito en la base de datos para ${opEncontrada.numeroRequerimiento}!`);
      setArchivo(null);
      setComentario('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la imagen en el storage de la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (imagenId: number) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta imagen de evidencia de la base de datos?')) {
      return;
    }

    try {
      await eliminarImagenOportunidadApi(selectedOpId, imagenId);
      setImagenes((prev) => prev.filter((img) => img.id !== imagenId));
      setSuccessMsg('Imagen de evidencia eliminada correctamente.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la imagen de la base de datos.');
    }
  };

  return (
    <div className="reg-evidencia-container">
      {/* ── Toast de Éxito ── */}
      {successMsg && (
        <div className="reg-toast-success" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleIcon name="check_circle" size={20} color="#059669" />
            <strong>{successMsg}</strong>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46' }}
          >
            <GoogleIcon name="close" size={16} color="#065f46" />
          </button>
        </div>
      )}

      {/* ── Toast de Error ── */}
      {errorMsg && (
        <div
          style={{
            marginBottom: 18,
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#b91c1c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleIcon name="error" size={20} color="#dc2626" />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c' }}
          >
            <GoogleIcon name="close" size={16} color="#b91c1c" />
          </button>
        </div>
      )}

      {/* ── Formulario de Carga de Evidencia Fotográfica ── */}
      <div className="reg-card">
        <div className="reg-card__header" style={{ marginBottom: 18 }}>
          <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="add_photo_alternate" size={20} color={roleAccent} />
          </div>
          <div>
            <h3>Subir Evidencia Fotográfica / Captura (Solo Imágenes)</h3>
            <p>
              Adjunta el sustento visual digital (captura de pantalla del portal Perú Compras, acta o constancia en formato imagen) almacenado de forma segura en la base de datos.
            </p>
          </div>
        </div>

        {misOportunidades.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1.5px dashed #cbd5e1',
              margin: '10px 0',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <GoogleIcon name="lock" size={24} color="#ef4444" />
            </div>
            <h4 style={{ margin: '0 0 6px', color: '#1e293b', fontSize: '15px', fontWeight: 700 }}>
              Solo puedes subir evidencias para tus propios requerimientos
            </h4>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: 480, marginInline: 'auto', lineHeight: 1.5 }}>
              Actualmente no tienes requerimientos registrados a tu nombre en el sistema. Para cargar capturas o imágenes de Perú Compras, primero debes registrar una oportunidad comercial.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reg-evidencia-form">
            <div className="reg-form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {/* Oportunidad asociada */}
              <div className="reg-field">
                <label>
                  Requerimiento / Oportunidad Vinculada <span className="required">*</span>
                </label>
                <select
                  className="reg-input"
                  value={selectedOpId}
                  onChange={(e) => setSelectedOpId(e.target.value)}
                  required
                >
                  {misOportunidades.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.numeroRequerimiento} &bull; {op.acuerdoMarco?.codigo ?? 'Acuerdo'} &bull; S/ {Number(op.limiteTotal).toLocaleString('es-PE')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Documento / Evidencia (SOLO OPCIONES DE IMAGEN) */}
              <div className="reg-field">
                <label>
                  Tipo de Evidencia (Solo Imágenes) <span className="required">*</span>
                </label>
                <select
                  className="reg-input"
                  value={tipoDoc}
                  onChange={(e) => setTipoDoc(e.target.value)}
                  required
                >
                  <option value="Captura de Cotización en Perú Compras">
                    🖼️ Captura de Cotización en Perú Compras
                  </option>
                  <option value="Captura de Acta de Buena Pro / Adjudicación">
                    📷 Captura de Acta de Buena Pro / Adjudicación
                  </option>
                  <option value="Captura de Orden de Compra (OC)">
                    🧾 Captura de Orden de Compra Electrónica (OC)
                  </option>
                  <option value="Captura de Propuesta en Portal">
                    📸 Captura de Propuesta Registrada en Portal
                  </option>
                  <option value="Foto / Pantallazo de Sustento Comercial">
                    🔍 Foto / Pantallazo de Sustento Comercial
                  </option>
                </select>
              </div>
            </div>

            {/* Zona Drag & Drop (SOLO IMÁGENES) */}
            <div
              className={`reg-dropzone ${dragOver ? 'drag-over' : ''} ${archivo ? 'has-file' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                borderColor: dragOver ? roleAccent : archivo ? '#10b981' : '#cbd5e1',
                background: dragOver ? `${roleAccent}08` : archivo ? '#f0fdf4' : '#f8fafc',
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png,image/jpeg,image/jpg,image/webp"
                style={{ display: 'none' }}
              />

              {archivo ? (
                <div className="reg-dropzone-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Vista previa"
                        style={{
                          width: 56,
                          height: 56,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '2px solid #10b981',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                        }}
                      />
                    ) : (
                      <div className="reg-dropzone-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                        <GoogleIcon name="check_circle" size={32} color="#16a34a" />
                      </div>
                    )}
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                        {archivo.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {(archivo.size / (1024 * 1024)).toFixed(2)} MB &bull; Imagen lista para guardar en Base de Datos
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setArchivo(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="reg-dropzone-remove-btn"
                  >
                    <GoogleIcon name="close" size={14} color="#ef4444" />
                    <span>Cambiar imagen</span>
                  </button>
                </div>
              ) : (
                <div className="reg-dropzone-content">
                  <div className="reg-dropzone-icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
                    <GoogleIcon name="add_photo_alternate" size={36} color={roleAccent} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14.5px' }}>
                      Arrastra tu imagen de evidencia aquí o haz clic para examinar
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 4 }}>
                      Formatos admitidos: <strong>Solo imágenes (PNG, JPG, JPEG, WEBP)</strong> &bull; Máximo 25 MB
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Observaciones opcionales */}
            <div className="reg-field" style={{ marginTop: 14 }}>
              <label>Observaciones / N° de Registro en Perú Compras (Opcional)</label>
              <input
                type="text"
                className="reg-input"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej: Confirmación de envío de proforma en catálogo electrónico a las 11:15 AM"
              />
            </div>

            {/* Botón de Enviar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="submit"
                disabled={!archivo || !selectedOpId || loading}
                className="reg-btn-submit"
                style={{
                  width: 'auto',
                  padding: '12px 28px',
                  background: archivo && selectedOpId ? roleAccent : '#cbd5e1',
                  cursor: archivo && selectedOpId ? 'pointer' : 'not-allowed',
                }}
              >
                <GoogleIcon name="cloud_upload" size={18} color="#ffffff" />
                <span>{loading ? 'Guardando Imagen en BD...' : 'Subir y Guardar Imagen en BD'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Listado de Evidencias / Imágenes Almacenadas en la Base de Datos ── */}
      <div className="reg-card" style={{ marginTop: 20 }}>
        <div className="reg-card__header" style={{ marginBottom: 16 }}>
          <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="collections" size={18} color={roleAccent} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3>Imágenes de Evidencia Registradas ({imagenes.length})</h3>
              <button
                type="button"
                onClick={() => cargarImagenes(selectedOpId)}
                title="Actualizar listado de imágenes"
                style={{
                  background: 'none',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '12px',
                  color: '#64748b',
                  cursor: 'pointer',
                }}
              >
                <GoogleIcon name="refresh" size={15} color="#64748b" />
                <span>Actualizar</span>
              </button>
            </div>
            <p>
              Storage en base de datos: Imágenes y capturas de pantalla vinculadas al requerimiento seleccionado (1 Oportunidad &rarr; N Imágenes).
            </p>
          </div>
        </div>

        {loadingImagenes ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <GoogleIcon name="hourglass_empty" size={32} color={roleAccent} />
            <p style={{ marginTop: 8, fontSize: '13px' }}>Cargando evidencias fotográficas de la base de datos...</p>
          </div>
        ) : imagenes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <GoogleIcon name="photo_camera_back" size={38} color="#94a3b8" />
            <p style={{ marginTop: 8, fontSize: '13.5px', fontWeight: 600, color: '#475569' }}>
              Aún no se han guardado imágenes de evidencia para este requerimiento.
            </p>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8' }}>
              Utiliza el formulario superior para adjuntar capturas de pantalla o fotos de sustento.
            </p>
          </div>
        ) : (
          <div className="reg-table-wrapper">
            <table className="reg-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Miniatura</th>
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
                  return (
                    <tr key={ev.id}>
                      {/* Miniatura con click para ampliar */}
                      <td>
                        <img
                          src={archivoUrl}
                          alt={ev.nombreArchivo}
                          onClick={() => setModalImagen(ev)}
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: 'cover',
                            borderRadius: 6,
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                          title="Clic para ver en tamaño completo"
                        />
                      </td>
                      <td>
                        <span className="reg-badge-req">
                          <GoogleIcon name="assignment" size={13} color="#0369a1" />
                          <strong>{ev.numeroRequerimiento}</strong>
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                        {ev.tipoEvidencia}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <GoogleIcon name="image" size={16} color="#0284c7" />
                          <a
                            href={archivoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '12.5px',
                              color: '#0284c7',
                              fontWeight: 600,
                              textDecoration: 'none',
                              maxWidth: 160,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title="Abrir imagen en pestaña nueva"
                          >
                            {ev.nombreArchivo}
                          </a>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>({ev.tamanoArchivo})</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b', maxWidth: 200 }}>
                        {ev.comentario ?? '-'}
                      </td>
                      <td style={{ fontSize: '13px', color: '#334155' }}>
                        {ev.subidoPor}
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(ev.fechaSubida).toLocaleString('es-PE')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setModalImagen(ev)}
                            title="Ver imagen completa"
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <GoogleIcon name="visibility" size={16} color="#475569" />
                          </button>
                          <a
                            href={archivoUrl}
                            download={ev.nombreArchivo}
                            title="Descargar imagen"
                            style={{
                              background: '#f1f5f9',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              textDecoration: 'none',
                            }}
                          >
                            <GoogleIcon name="download" size={16} color="#0284c7" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleEliminar(ev.id)}
                            title="Eliminar imagen de la BD"
                            style={{
                              background: '#fef2f2',
                              border: 'none',
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
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

      {/* ── Modal de Vista en Tamaño Completo de la Imagen ── */}
      {modalImagen && (
        <div
          onClick={() => setModalImagen(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 12,
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#0f172a', fontWeight: 700 }}>
                  {modalImagen.nombreArchivo}
                </h4>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2 }}>
                  {modalImagen.numeroRequerimiento} &bull; {modalImagen.tipoEvidencia} &bull; {modalImagen.tamanoArchivo}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                  download={modalImagen.nombreArchivo}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    background: roleAccent,
                    color: '#ffffff',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  <GoogleIcon name="download" size={16} color="#ffffff" />
                  <span>Descargar</span>
                </a>
                <button
                  type="button"
                  onClick={() => setModalImagen(null)}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <GoogleIcon name="close" size={18} color="#475569" />
                </button>
              </div>
            </div>
            <div
              style={{
                padding: 16,
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
              }}
            >
              <img
                src={getImagenArchivoUrl(modalImagen.oportunidadId, modalImagen.id)}
                alt={modalImagen.nombreArchivo}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: 4,
                }}
              />
            </div>
            {modalImagen.comentario && (
              <div style={{ padding: '12px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' }}>
                <strong>Observación:</strong> {modalImagen.comentario}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
