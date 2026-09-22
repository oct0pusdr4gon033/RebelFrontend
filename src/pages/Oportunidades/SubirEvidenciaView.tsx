import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { isOportunidadOwner } from '../../utils/oportunidadUtils';
import type { Oportunidad, EvidenciaItem } from '../../types/oportunidades';

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

  const [tipoDoc, setTipoDoc] = useState<string>('Comprobante de Cotización en Perú Compras');
  const [comentario, setComentario] = useState<string>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lista de evidencias cargadas
  const [evidencias, setEvidencias] = useState<EvidenciaItem[]>([
    {
      id: 1,
      oportunidadId: oportunidades[0]?.id ?? 1,
      numeroRequerimiento: oportunidades[0]?.numeroRequerimiento ?? 'REQ-2026-0089',
      tipoDocumento: 'Comprobante de Cotización en Perú Compras',
      nombreArchivo: 'Constancia_Cotizacion_REQ-2026-0089.pdf',
      tamanoArchivo: '1.4 MB',
      subidoPor: 'Luciana Morales',
      fechaSubida: '14/09/2026, 11:20:00',
      estado: 'Verificado',
      comentario: 'Presentado conforme al catálogo electrónico de computadoras.',
    },
    {
      id: 2,
      oportunidadId: 2,
      numeroRequerimiento: 'REQ-2026-0094',
      tipoDocumento: 'Acta de Buena Pro',
      nombreArchivo: 'Acta_Adjudicacion_MINEDU.pdf',
      tamanoArchivo: '2.1 MB',
      subidoPor: 'Valeria Quispe',
      fechaSubida: '13/09/2026, 16:45:12',
      estado: 'Verificado',
      comentario: 'Adjudicación exitosa en Perú Compras.',
    },
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setArchivo(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setArchivo(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpId || !archivo) return;

    const opEncontrada = misOportunidades.find((o) => String(o.id) === String(selectedOpId));
    if (!opEncontrada) {
      alert('Solo puedes subir evidencias a los requerimientos registrados por tu usuario.');
      return;
    }

    setLoading(true);
    const reqCode = opEncontrada.numeroRequerimiento;

    setTimeout(() => {
      const nuevaEvidencia: EvidenciaItem = {
        id: Date.now(),
        oportunidadId: selectedOpId,
        numeroRequerimiento: reqCode,
        tipoDocumento: tipoDoc,
        nombreArchivo: archivo.name,
        tamanoArchivo: `${(archivo.size / (1024 * 1024)).toFixed(2)} MB`,
        subidoPor: empleado?.nombreCompleto || empleado?.userNombre || 'Usuario Actual',
        fechaSubida: new Date().toLocaleString('es-PE'),
        estado: 'Verificado',
        comentario: comentario.trim() || undefined,
      };

      setEvidencias((prev) => [nuevaEvidencia, ...prev]);
      setSuccessMsg(`¡Evidencia "${archivo.name}" subida y certificada para ${reqCode}!`);
      setArchivo(null);
      setComentario('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);

      setTimeout(() => setSuccessMsg(null), 5000);
    }, 600);
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

      {/* ── Formulario de Carga de Evidencia ── */}
      <div className="reg-card">
        <div className="reg-card__header" style={{ marginBottom: 18 }}>
          <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="upload_file" size={20} color={roleAccent} />
          </div>
          <div>
            <h3>Subir Evidencia de Licitación / Cotización</h3>
            <p>
              Adjunta el sustento digital (captura del portal Perú Compras, constancia PDF u Orden de Compra) para respaldar tus requerimientos registrados.
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
              Actualmente no tienes requerimientos registrados a tu nombre en el sistema. Para cargar constancias o actas de Perú Compras, primero debes registrar una oportunidad comercial.
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

            {/* Tipo de Documento */}
            <div className="reg-field">
              <label>
                Tipo de Evidencia / Documento <span className="required">*</span>
              </label>
              <select
                className="reg-input"
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                required
              >
                <option value="Comprobante de Cotización en Perú Compras">
                  📄 Comprobante de Cotización en Perú Compras
                </option>
                <option value="Acta de Buena Pro">
                  📑 Acta de Buena Pro / Adjudicación
                </option>
                <option value="Orden de Compra (OC)">
                  💼 Orden de Compra Electrónica (OC)
                </option>
                <option value="Propuesta Presentada">
                  📝 Propuesta Técnica / Económica Registrada
                </option>
              </select>
            </div>
          </div>

          {/* Zona Drag & Drop */}
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
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.zip"
              style={{ display: 'none' }}
            />

            {archivo ? (
              <div className="reg-dropzone-content">
                <div className="reg-dropzone-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <GoogleIcon name="check_circle" size={32} color="#16a34a" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px' }}>
                    {archivo.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    {(archivo.size / 1024).toFixed(1)} KB &bull; Archivo listo para subir
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
                  <span>Cambiar archivo</span>
                </button>
              </div>
            ) : (
              <div className="reg-dropzone-content">
                <div className="reg-dropzone-icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
                  <GoogleIcon name="upload_file" size={34} color={roleAccent} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14.5px' }}>
                    Arrastra tu archivo aquí o haz clic para examinar
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: 4 }}>
                    Formatos admitidos: <strong>PDF, JPG, PNG o ZIP</strong> (Máximo 25 MB)
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
              placeholder="Ej: Registro N° 458821 confirmado en portal Perú Compras a las 11:15 AM"
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
              <GoogleIcon name="verified_user" size={18} color="#ffffff" />
              <span>{loading ? 'Certificando Evidencia...' : '⚡ Subir y Certificar Evidencia'}</span>
            </button>
          </div>
        </form>
        )}
      </div>

      {/* ── Listado de Evidencias Subidas ── */}
      <div className="reg-card" style={{ marginTop: 20 }}>
        <div className="reg-card__header" style={{ marginBottom: 16 }}>
          <div className="reg-card__header-icon" style={{ background: `${roleAccent}15` }}>
            <GoogleIcon name="folder_shared" size={18} color={roleAccent} />
          </div>
          <div>
            <h3>Evidencias y Constancias Registradas ({evidencias.length})</h3>
            <p>Historial auditable de constancias de cotización y actas subidas por el equipo.</p>
          </div>
        </div>

        <div className="reg-table-wrapper">
          <table className="reg-table">
            <thead>
              <tr>
                <th>Requerimiento</th>
                <th>Tipo de Evidencia</th>
                <th>Archivo Adjunto</th>
                <th>Observación</th>
                <th>Subido por</th>
                <th>Fecha y Hora</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {evidencias.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <span className="reg-badge-req">
                      <GoogleIcon name="assignment" size={13} color="#0369a1" />
                      <strong>{ev.numeroRequerimiento}</strong>
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#0f172a', fontWeight: 600 }}>
                    {ev.tipoDocumento}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GoogleIcon name="description" size={16} color="#0284c7" />
                      <span style={{ fontSize: '12.5px', color: '#0284c7', fontWeight: 600 }}>
                        {ev.nombreArchivo}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>({ev.tamanoArchivo})</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b', maxWidth: 220 }}>
                    {ev.comentario ?? '-'}
                  </td>
                  <td style={{ fontSize: '13px', color: '#334155' }}>
                    {ev.subidoPor}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {ev.fechaSubida}
                  </td>
                  <td>
                    <span
                      className="reg-pill"
                      style={{
                        background: ev.estado === 'Verificado' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(234, 179, 8, 0.12)',
                        color: ev.estado === 'Verificado' ? '#059669' : '#b45309',
                        fontWeight: 700,
                        fontSize: '11.5px',
                      }}
                    >
                      {ev.estado === 'Verificado' ? '✅ Verificado' : '⏳ En Revisión'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
