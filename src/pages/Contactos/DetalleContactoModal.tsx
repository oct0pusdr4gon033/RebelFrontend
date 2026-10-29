import React from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import type { ContactoOCAM } from '../../types/contactos';

interface DetalleContactoModalProps {
  contacto: ContactoOCAM | null;
  onClose: () => void;
  roleAccent?: string;
}

export const DetalleContactoModal: React.FC<DetalleContactoModalProps> = ({
  contacto,
  onClose,
  roleAccent = '#2563eb',
}) => {
  if (!contacto) return null;

  const isCaso1 =
    contacto.respuesta.toUpperCase().includes('CASO 1') ||
    contacto.respuesta.toLowerCase().includes('perfectas');
  const isCaso2 =
    contacto.respuesta.toUpperCase().includes('CASO 2') ||
    contacto.respuesta.toLowerCase().includes('no contesto') ||
    contacto.respuesta.toLowerCase().includes('no contestó');
  const esSinOcam = Boolean(
    contacto.sinOcamRelacionada || contacto.numeroOCAM === 'SIN OCAM' || !contacto.numeroOCAM
  );

  const formatFecha = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="agenda-modal-overlay" onClick={onClose}>
      <div className="agenda-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del Modal */}
        <div className="agenda-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GoogleIcon name="contact_phone" size={20} color={roleAccent} />
            </div>
            <div>
              <h3>Trazabilidad de Contacto de Entidad</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Registro inmutable para auditoría y seguimiento
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            <GoogleIcon name="close" size={22} />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="agenda-modal-body">
          <div className="agenda-modal-grid">
            {/* OCAM o SIN OCAM */}
            <div className="agenda-modal-item">
              <label>Vínculo OCAM</label>
              <div
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  color: esSinOcam ? '#059669' : '#1d4ed8',
                  fontSize: '0.95rem',
                }}
              >
                {esSinOcam ? 'SIN NÚMERO DE OCAM RELACIONADA' : contacto.numeroOCAM}
              </div>
            </div>

            {/* RUC de la Entidad */}
            <div className="agenda-modal-item">
              <label>RUC de la Entidad</label>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                {contacto.rucEntidad || 'No especificado'}
              </div>
            </div>

            {/* Teléfono */}
            <div className="agenda-modal-item">
              <label>Número de Contacto</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', fontWeight: 800 }}>
                  {contacto.contactoNumero}
                </span>
                <a
                  href={`tel:${contacto.contactoNumero}`}
                  style={{ color: '#0284c7', textDecoration: 'none' }}
                  title="Llamar"
                >
                  <GoogleIcon name="call" size={16} color="#0284c7" />
                </a>
                <a
                  href={`https://wa.me/51${contacto.contactoNumero.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="agenda-wa-btn"
                  title="WhatsApp"
                >
                  <GoogleIcon name="chat" size={14} color="#ffffff" />
                </a>
              </div>
            </div>

            {/* Nombre del contacto */}
            <div className="agenda-modal-item">
              <label>Nombre de la Persona</label>
              <div>{contacto.contactoNombre}</div>
            </div>

            {/* Área y Cargo */}
            <div className="agenda-modal-item">
              <label>Área y Cargo</label>
              <div>{contacto.contactoAreaCargo}</div>
            </div>

            {/* Nombre de la Entidad / Empresa Relacionada */}
            <div className="agenda-modal-item">
              <label>Nombre de la Entidad</label>
              <div>{contacto.empresaRelacionada}</div>
            </div>

            {/* Tipo de Relación */}
            <div className="agenda-modal-item">
              <label>Tipo de Relación</label>
              <span
                className={`agenda-relacion-badge ${
                  contacto.tipoRelacion === 'Entidad Solicitante'
                    ? 'agenda-relacion-badge--solicitante'
                    : contacto.tipoRelacion === 'Entidad / Marca de Cotización'
                      ? 'agenda-relacion-badge--cotizacion'
                      : 'agenda-relacion-badge--exterior'
                }`}
              >
                {contacto.tipoRelacion}
              </span>
            </div>
          </div>

          {/* Lista de Contactos Registrados en el Mismo Lote (cuando se agregaron varios contactos por registro) */}
          {contacto.contactosRegistrados && contacto.contactosRegistrados.length > 1 && (
            <div
              style={{
                marginBottom: 16,
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 14px',
              }}
            >
              <label
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <GoogleIcon name="groups" size={16} color="#2563eb" />
                <span>
                  Contactos Registrados en esta Operación ({contacto.contactosRegistrados.length})
                </span>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {contacto.contactosRegistrados.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '8px 10px',
                      fontSize: '12.5px',
                    }}
                  >
                    <div>
                      <strong>{item.contactoNombre}</strong>
                      {item.contactoAreaCargo && (
                        <span style={{ color: '#64748b', marginLeft: 6 }}>
                          ({item.contactoAreaCargo})
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <code style={{ fontWeight: 800, color: '#0284c7' }}>
                        {item.contactoNumero}
                      </code>
                      <a
                        href={`https://wa.me/51${item.contactoNumero.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="agenda-wa-btn"
                        title="WhatsApp"
                      >
                        <GoogleIcon name="chat" size={13} color="#ffffff" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Motivo / Descripción */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Motivo / Descripción de la Comunicación
            </label>
            <div
              style={{
                marginTop: 4,
                padding: '12px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: '#1e293b',
                lineHeight: 1.5,
              }}
            >
              {contacto.contactoMotivo}
            </div>
          </div>

          {/* Respuesta Obtenida */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: '#64748b',
              }}
            >
              Respuesta / Resultado Registrado
            </label>
            <div
              style={{
                marginTop: 4,
                padding: '12px 14px',
                background: isCaso1 ? '#f0fdf4' : isCaso2 ? '#fef2f2' : '#f8fafc',
                border: `1.5px solid ${isCaso1 ? '#86efac' : isCaso2 ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isCaso1 ? '#15803d' : isCaso2 ? '#b91c1c' : '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <GoogleIcon
                name={isCaso1 ? 'verified' : isCaso2 ? 'phone_missed' : 'notes'}
                size={18}
                color={isCaso1 ? '#15803d' : isCaso2 ? '#b91c1c' : '#64748b'}
              />
              <span>{contacto.respuesta}</span>
            </div>
          </div>

          {/* Datos de Auditoría y Trazabilidad */}
          <div
            style={{
              padding: '12px 14px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: '#1e40af',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GoogleIcon name="lock" size={16} color="#1d4ed8" />
              <span>
                <strong>Registrado por:</strong> {contacto.registradoPor}
              </span>
            </div>
            <div>
              <strong>Fecha:</strong> {formatFecha(contacto.fechaRegistro)}
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="agenda-modal-footer">
          <button type="button" className="agenda-btn-cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
