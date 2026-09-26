import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { GoogleIcon } from '../GoogleIcon';
import './Fotocheck.css';

export interface FotocheckData {
  nombreCompleto: string;
  nombres?: string;
  apellidos?: string;
  cargo: string;
  rolNombre: string;
  dni: string;
  codigoEmpleado: string;
  sedeNombre: string;
  sedeUbicacion?: string;
  sedeDireccion?: string;
  email?: string;
  telefono?: string;
  fotoUrl?: string;
  initials?: string;
  fechaIngreso?: string;
  empresaNombre?: string;
  roleIcon?: string;
  accentColor?: string;
}

interface FotocheckCardProps {
  data: FotocheckData;
  side?: 'front' | 'back';
}

export const FotocheckCard: React.FC<FotocheckCardProps> = ({ data, side = 'front' }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const {
    nombreCompleto,
    cargo,
    rolNombre,
    dni,
    codigoEmpleado,
    sedeNombre,
    sedeUbicacion = 'Lima',
    email = 'contacto@salesrebel.pe',
    telefono = '+51 987 654 321',
    initials = 'SR',
    roleIcon = 'shield_person',
    accentColor = '#2563eb',
    fotoUrl,
  } = data;

  useEffect(() => {
    // Generar código QR escaneable con datos de validación
    const qrPayload = JSON.stringify({
      empresa: 'Sales Rebel',
      colaborador: nombreCompleto,
      codigo: codigoEmpleado,
      dni: dni,
      cargo: cargo,
      rol: rolNombre,
      sede: `${sedeNombre} (${sedeUbicacion})`,
      estado: 'ACTIVO_VERIFICADO',
      verificacion: 'https://salesrebel.pe/validar',
    }, null, 2);

    QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generando QR fotocheck:', err));
  }, [nombreCompleto, codigoEmpleado, dni, cargo, rolNombre, sedeNombre, sedeUbicacion]);

  if (side === 'back') {
    return (
      <div className="fc-card fc-card--back" id="fotocheck-back">
        {/* Ranura estándar de lanyard */}
        <div className="fc-lanyard-slot" title="Ranura para lanyard/clip" />

        {/* Cabecera Reverso */}
        <div className="fc-back-header">
          <div className="fc-back-brand">
            <img src="/logo.png" alt="Sales Rebel Logo" className="fc-back-logo" />
            <div className="fc-back-brand-text">
              <strong>SALES REBEL</strong>
              <span>IDENTIFICACIÓN OFICIAL</span>
            </div>
          </div>
          <span className="fc-back-sec-pill">OFICIAL</span>
        </div>

        {/* Contenedor Central: Código QR */}
        <div className="fc-qr-box">
          <div className="fc-qr-frame">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Código QR de verificación" className="fc-qr-img" />
            ) : (
              <div className="fc-qr-placeholder">Generando QR...</div>
            )}
          </div>
          <div className="fc-qr-caption">
            <GoogleIcon name="qr_code_scanner" size={14} color="#2563eb" />
            <span>Escanear para validar credencial</span>
          </div>
        </div>

        {/* Datos de contacto y validación */}
        <div className="fc-back-meta-grid">
          <div className="fc-back-meta-item">
            <span className="fc-back-label">DNI / DOCUMENTO</span>
            <strong className="fc-back-val">{dni}</strong>
          </div>
          <div className="fc-back-meta-item">
            <span className="fc-back-label">CÓDIGO DE ACCESO</span>
            <strong className="fc-back-val">{codigoEmpleado}</strong>
          </div>
          <div className="fc-back-meta-item" style={{ gridColumn: 'span 2' }}>
            <span className="fc-back-label">CORREO / TELÉFONO</span>
            <span className="fc-back-sub">{email} • {telefono}</span>
          </div>
        </div>

        {/* Advertencia / Términos de uso */}
        <div className="fc-back-terms">
          <p>
            Esta credencial es personal e intransferible. Acredita al portador como colaborador
            autorizado de <strong>Sales Rebel</strong>. En caso de extravío, devolver a:{' '}
            <em>{sedeNombre} ({sedeUbicacion})</em>.
          </p>
        </div>

        {/* Sello de seguridad inferior */}
        <div className="fc-back-footer">
          <span className="fc-back-hash">SEC-ID: {codigoEmpleado.replace('#', '')}-{dni}</span>
          <span className="fc-back-valid">VÁLIDO 2026-2027</span>
        </div>
      </div>
    );
  }

  // Anverso (Front Side)
  return (
    <div className="fc-card fc-card--front" id="fotocheck-front">
      {/* Ranura estándar de lanyard */}
      <div className="fc-lanyard-slot" title="Ranura para lanyard/clip" />

      {/* Cabecera Frontal */}
      <div className="fc-front-header">
        <div className="fc-brand-wrap">
          <div className="fc-logo-circle">
            <img src="/logo.png" alt="Sales Rebel Logo" className="fc-logo" />
          </div>
          <div className="fc-brand-titles">
            <strong className="fc-brand-name">SALES REBEL</strong>
            <span className="fc-brand-tagline">PASE CORPORATIVO</span>
          </div>
        </div>
        <div className="fc-role-badge-mini" style={{ background: `${accentColor}18`, color: accentColor }}>
          <GoogleIcon name={roleIcon} size={13} color={accentColor} />
          <span>{rolNombre.split(' ')[0]}</span>
        </div>
      </div>

      {/* Franja decorativa de color de acento */}
      <div className="fc-accent-bar" style={{ background: `linear-gradient(90deg, ${accentColor}, #0ea5e9)` }} />

      {/* Foto / Avatar del Colaborador */}
      <div className="fc-photo-container">
        <div className="fc-photo-frame" style={{ borderColor: accentColor }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt={nombreCompleto} className="fc-photo-img" />
          ) : (
            <div
              className="fc-photo-avatar"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #0f172a)` }}
            >
              {initials}
            </div>
          )}
          <span className="fc-photo-active-dot" title="Activo y verificado" />
        </div>
      </div>

      {/* Información del Colaborador */}
      <div className="fc-identity">
        <h2 className="fc-name" title={nombreCompleto}>
          {nombreCompleto}
        </h2>
        <div className="fc-position" title={cargo}>
          {cargo}
        </div>
        <div className="fc-role-pill" style={{ background: `${accentColor}12`, color: accentColor, borderColor: `${accentColor}33` }}>
          <GoogleIcon name={roleIcon} size={13} color={accentColor} />
          <span>{rolNombre}</span>
        </div>
      </div>

      {/* Pie del Fotocheck */}
      <div className="fc-footer">
        <div className="fc-footer-meta">
          <div className="fc-footer-item">
            <span className="fc-footer-label">SEDE</span>
            <span className="fc-footer-value">{sedeNombre}</span>
          </div>
          <div className="fc-footer-item" style={{ textAlign: 'right' }}>
            <span className="fc-footer-label">CÓDIGO EMPLEADO</span>
            <span className="fc-footer-code">{codigoEmpleado}</span>
          </div>
        </div>

        {/* Banda inferior con DNI y seguridad */}
        <div className="fc-bottom-strip" style={{ background: `linear-gradient(90deg, #0f172a, ${accentColor})` }}>
          <span>DNI: {dni}</span>
          <span className="fc-chip-badge">SELLO DIGITAL ★</span>
        </div>
      </div>
    </div>
  );
};

export default FotocheckCard;
