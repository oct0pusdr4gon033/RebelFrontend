import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleIcon } from '../../components/GoogleIcon';
import './MiCuentaPage.css';
import type { MiCuentaPageProps } from '../../props/MiCuentaPageProps';


export const MiCuentaPage: React.FC<MiCuentaPageProps> = ({
  defaultRole = 'SysAdmin',
  roleIcon = 'admin_panel_settings',
  accentColor = '#4F9AFF',
}) => {
  const { empleado, logout } = useAuth();
  const navigate = useNavigate();
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Datos reales o de demostración según rol
  const rolNombre = empleado?.rolNombre || defaultRole;
  const nombreCompleto =
    empleado?.nombreCompleto ||
    (empleado?.nombres ? `${empleado.nombres} ${empleado.apellidos ?? ''}`.trim() : null) ||
    'Colaborador Sales Rebel';

  const nombres = empleado?.nombres || 'Admin';
  const apellidos = empleado?.apellidos || 'Rebel';
  const email = empleado?.userEmail || empleado?.email || 'usuario@rebelqueen.com';
  const dni = empleado?.dni || '72849102';
  const cargo = empleado?.cargo || 'Colaborador Especialista';
  const sedeNombre = empleado?.sedeNombre || 'Sede Principal';
  const sedeUbicacion = empleado?.sedeUbicacion || 'Lima';
  const sedeDireccion = empleado?.sedeDireccion || 'Av. Principal 123, San Isidro';
  const telefono = empleado?.telefono || '+51 987 654 321';
  const fechaIngresoRaw = empleado?.fechaIngreso || '2024-01-15';
  const activo = empleado?.activo !== undefined ? empleado.activo : true;

  // Formato de fecha
  let fechaIngresoFormatted = fechaIngresoRaw;
  try {
    const d = new Date(fechaIngresoRaw);
    if (!isNaN(d.getTime())) {
      fechaIngresoFormatted = d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }

  // Iniciales para el avatar
  const initials = `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase() || 'SR';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="account-page">
      {/* Barra superior de migas de pan y acciones */}
      <div className="account-page__top">
        <div className="account-page__breadcrumb">
          <span>Inicio</span>
          <span>/</span>
          <span className="active">Mi Cuenta</span>
        </div>

        <div className="account-page__header-actions">
          <button
            type="button"
            className="account-btn account-btn--outline"
            onClick={handleCopyEmail}
          >
            <GoogleIcon name={copiedEmail ? 'check' : 'mail'} size={16} />
            <span>{copiedEmail ? 'Correo Copiado' : 'Copiar Correo'}</span>
          </button>
          <button
            type="button"
            className="account-btn account-btn--danger"
            onClick={handleLogout}
          >
            <GoogleIcon name="logout" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Hero Profile Banner */}
      <div className="account-hero">
        <div className="account-hero__cover">
          <div className="account-hero__cover-pattern" />
        </div>

        <div className="account-hero__body">
          <div className="account-hero__user">
            <div className="account-hero__avatar-wrap">
              <div
                className="account-hero__avatar"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #0a2540)` }}
              >
                {initials}
              </div>
              <span className="account-hero__online-badge" title="Sesión activa y verificada" />
            </div>

            <div className="account-hero__meta">
              <h1 className="account-hero__name">{nombreCompleto}</h1>
              <div className="account-hero__pills">
                <span className="account-pill account-pill--role">
                  <GoogleIcon name={roleIcon} size={15} color={accentColor} />
                  <span>{rolNombre}</span>
                </span>
                <span className="account-pill account-pill--sede">
                  <GoogleIcon name="domain" size={15} />
                  <span>
                    {sedeNombre} — {sedeUbicacion}
                  </span>
                </span>
                <span className="account-pill account-pill--active">
                  <GoogleIcon name="check_circle" size={14} color="#059669" />
                  <span>{activo ? 'Cuenta Activa' : 'Inactiva'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grilla con Tarjetas de Datos */}
      <div className="account-grid">
        {/* Columna 1: Tarjeta de Credencial Digital e Información Personal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Credencial Digital Corporativa */}
          <div className="account-digital-badge">
            <div className="account-digital-badge__top">
              <div className="account-digital-badge__brand">
                <img src="/logo.png" alt="Logo" />
                <span>Sales Rebel ID</span>
              </div>
              <div className="account-digital-badge__chip" />
            </div>

            <div className="account-digital-badge__middle">
              <div className="account-digital-badge__name">{nombreCompleto}</div>
              <div className="account-digital-badge__role" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GoogleIcon name={roleIcon} size={15} color="#93c5fd" />
                <span>{cargo}</span>
              </div>
            </div>

            <div className="account-digital-badge__bottom">
              <div>
                <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>DNI / DOCUMENTO</span>
                <span className="account-digital-badge__code">{dni}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>CÓDIGO EMPLEADO</span>
                <span className="account-digital-badge__code">
                  #EMP-{empleado?.id ? String(empleado.id).padStart(4, '0') : '0001'}
                </span>
              </div>
            </div>
          </div>

          {/* Información Personal */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title">
                <GoogleIcon name="person" size={18} color="#4F9AFF" />
                <span>Información Personal</span>
              </div>
              <span className="account-card__tag">Datos de Identidad</span>
            </div>

            <div className="account-fields-list">
              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="badge" size={16} className="account-row__icon" />
                  <span className="account-row__label">Nombres</span>
                </div>
                <span className="account-row__value">{nombres}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="badge" size={16} className="account-row__icon" />
                  <span className="account-row__label">Apellidos</span>
                </div>
                <span className="account-row__value">{apellidos}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="badge" size={16} className="account-row__icon" />
                  <span className="account-row__label">Documento Nacional (DNI)</span>
                </div>
                <span className="account-row__value">{dni}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="mail" size={16} className="account-row__icon" />
                  <span className="account-row__label">Correo Corporativo</span>
                </div>
                <div className="account-row__val-group">
                  <span className="account-row__value">{email}</span>
                  <button
                    type="button"
                    className={`account-copy-btn ${copiedEmail ? 'account-copy-btn--copied' : ''}`}
                    onClick={handleCopyEmail}
                    title="Copiar correo"
                  >
                    <GoogleIcon name={copiedEmail ? 'check' : 'content_copy'} size={14} />
                  </button>
                </div>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="call" size={16} className="account-row__icon" />
                  <span className="account-row__label">Teléfono de Contacto</span>
                </div>
                <span className="account-row__value">{telefono}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Datos Laborales y Permisos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Información Corporativa y Laboral */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title">
                <GoogleIcon name="domain" size={18} color="#4F9AFF" />
                <span>Datos Laborales & Sede</span>
              </div>
              <span className="account-card__tag">Registro de Empresa</span>
            </div>

            <div className="account-fields-list">
              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name={roleIcon} size={16} className="account-row__icon" color={accentColor} />
                  <span className="account-row__label">Rol en el Sistema</span>
                </div>
                <span className="account-row__value" style={{ color: accentColor, fontWeight: 800 }}>
                  {rolNombre}
                </span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="work" size={16} className="account-row__icon" />
                  <span className="account-row__label">Cargo Oficial</span>
                </div>
                <span className="account-row__value">{cargo}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="domain" size={16} className="account-row__icon" />
                  <span className="account-row__label">Sede de Asignación</span>
                </div>
                <span className="account-row__value">
                  {sedeNombre} ({sedeUbicacion})
                </span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="location_on" size={16} className="account-row__icon" />
                  <span className="account-row__label">Dirección de Sede</span>
                </div>
                <span className="account-row__value">{sedeDireccion}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="calendar_month" size={16} className="account-row__icon" />
                  <span className="account-row__label">Fecha de Ingreso</span>
                </div>
                <span className="account-row__value">{fechaIngresoFormatted}</span>
              </div>

              <div className="account-row">
                <div className="account-row__label-group">
                  <GoogleIcon name="check_circle" size={16} className="account-row__icon" color="#059669" />
                  <span className="account-row__label">Estado del Colaborador</span>
                </div>
                <span className="account-row__value" style={{ color: '#059669' }}>
                  {activo ? 'Activo y Habilitado' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {/* Permisos y Privilegios del Rol */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title">
                <GoogleIcon name="lock" size={18} color="#4F9AFF" />
                <span>Permisos y Seguridad del Rol</span>
              </div>
              <span className="account-card__tag">Seguridad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiCuentaPage;
