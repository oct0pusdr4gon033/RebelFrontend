import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GoogleIcon } from '../../components/GoogleIcon';
import { FotocheckModal, type FotocheckData } from '../../components/Fotocheck';
import './MiCuentaPage.css';
import type { MiCuentaPageProps } from '../../props/MiCuentaPageProps';

// ── Privilegios y permisos asignados por rol en la plataforma ───────────────
const ROL_PRIVILEGIOS: Record<string, string[]> = {
  SysAdmin: [
    'Control total y administración de la plataforma Sales Rebel',
    'Gestión global de usuarios, roles, sedes y accesos',
    'Configuración avanzada, telemetría y seguridad del sistema',
    'Acceso sin restricciones a todos los módulos y bases de datos',
  ],
  Administrador: [
    'Gestión de colaboradores de la empresa y sedes asignadas',
    'Resolución y adjudicación de requerimientos y oportunidades',
    'Supervisión de acuerdos marco y catálogo de productos',
    'Acceso a reportes gerenciales, telemetría y análisis de ventas',
  ],
  'Ejecutivo(a) Master Ventas': [
    'Registro y edición de oportunidades de licitación en tiempo real',
    'Supervisión y asignación de requerimientos del equipo comercial',
    'Monitoreo del podio comercial y métricas de efectividad',
    'Seguimiento prioritario de órdenes de compra (OC) y cotizaciones',
  ],
  'Ejecutivo(a) Ventas': [
    'Registro ágil de oportunidades y requerimientos comerciales',
    'Gestión y seguimiento de cotizaciones y márgenes propios',
    'Seguimiento en tiempo real de órdenes de compra (OC)',
    'Participación en el ranking y podio comercial de ventas',
  ],
};

const DEFAULT_PRIVILEGIOS = [
  'Acceso autorizado a la plataforma Sales Rebel',
  'Gestión de perfil y credenciales personales',
  'Visualización de módulos según asignación de sede',
  'Soporte y registro de actividad en el sistema',
];

export const MiCuentaPage: React.FC<MiCuentaPageProps> = ({
  defaultRole = 'SysAdmin',
  roleIcon = 'admin_panel_settings',
  accentColor = '#2563eb',
}) => {
  const { empleado, logout } = useAuth();
  const navigate = useNavigate();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isFotocheckOpen, setIsFotocheckOpen] = useState(false);

  // Datos reales del contexto o valores de demostración
  const rolNombre = empleado?.rolNombre || defaultRole;
  const nombreCompleto =
    empleado?.nombreCompleto ||
    (empleado?.nombres ? `${empleado.nombres} ${empleado.apellidos ?? ''}`.trim() : null) ||
    'Colaborador Sales Rebel';

  const nombres = empleado?.nombres || 'Admin';
  const apellidos = empleado?.apellidos || 'Rebel';
  const email = empleado?.userEmail || empleado?.email || 'usuario@salesrebel.pe';
  const dni = empleado?.dni || '72849102';
  const cargo = empleado?.cargo || 'Colaborador Especialista';
  const sedeNombre = empleado?.sedeNombre || 'Sede Principal';
  const sedeUbicacion = empleado?.sedeUbicacion || 'Lima';
  const sedeDireccion = empleado?.sedeDireccion || 'Av. Principal 123, San Isidro';
  const telefono = empleado?.telefono || '+51 987 654 321';
  const fechaIngresoRaw = empleado?.fechaIngreso || '2024-01-15';
  const activo = empleado?.activo !== undefined ? empleado.activo : true;

  // Formato amigable de fecha
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

  // Código de empleado
  const codigoEmpleado = `#EMP-${empleado?.id ? String(empleado.id).padStart(4, '0') : '0001'}`;

  // Privilegios para el rol actual
  const privilegios = ROL_PRIVILEGIOS[rolNombre] || DEFAULT_PRIVILEGIOS;

  // Objeto de datos listo para el fotocheck imprimible
  const fotocheckData: FotocheckData = {
    nombreCompleto,
    nombres,
    apellidos,
    cargo,
    rolNombre,
    dni,
    codigoEmpleado,
    sedeNombre,
    sedeUbicacion,
    sedeDireccion,
    email,
    telefono,
    initials,
    fechaIngreso: fechaIngresoFormatted,
    roleIcon,
    accentColor,
    fotoUrl: empleado?.fotoUrl,
  };

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
      {/* Migas de Pan */}
      <div className="account-breadcrumb">
        <span>Inicio</span>
        <span>/</span>
        <span className="active">Mi Cuenta</span>
      </div>

      {/* Tarjeta de Perfil / Hero */}
      <div className="account-hero-card">
        <div className="account-hero-left">
          <div className="account-avatar-wrap">
            <div
              className="account-avatar"
              style={{ background: `linear-gradient(135deg, ${accentColor}, #1d4ed8)` }}
            >
              {initials}
            </div>
            <span className="account-online-dot" title="Sesión activa y verificada" />
          </div>

          <div className="account-hero-info">
            <div className="account-hero-title-row">
              <h1 className="account-hero-name">{nombreCompleto}</h1>
            </div>
            <div className="account-hero-pills">
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
                <span>{activo ? 'Cuenta Verificada' : 'Inactiva'}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="account-hero-actions">
          <button
            type="button"
            className="account-btn"
            style={{ background: '#2563eb', color: '#ffffff' }}
            onClick={() => setIsFotocheckOpen(true)}
            title="Abrir e imprimir credencial oficial fotocheck"
          >
            <GoogleIcon name="badge" size={16} />
            <span>Imprimir Fotocheck</span>
          </button>
          <button
            type="button"
            className="account-btn account-btn--outline"
            onClick={handleCopyEmail}
            title="Copiar correo corporativo"
          >
            <GoogleIcon name={copiedEmail ? 'check' : 'mail'} size={16} />
            <span>{copiedEmail ? 'Correo Copiado' : 'Copiar Correo'}</span>
          </button>
          <button
            type="button"
            className="account-btn account-btn--danger"
            onClick={handleLogout}
            title="Cerrar sesión actual"
          >
            <GoogleIcon name="logout" size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* KPIs de Cuenta */}
      <div className="account-stats-row">
        <div className="account-stat-card">
          <div
            className="account-stat-icon-box"
            style={{ background: `${accentColor}14`, color: accentColor }}
          >
            <GoogleIcon name={roleIcon} size={22} color={accentColor} />
          </div>
          <div className="account-stat-info">
            <span className="account-stat-label">Rol en el Sistema</span>
            <span className="account-stat-value">{rolNombre}</span>
            <span className="account-stat-sub">Privilegio de Acceso</span>
          </div>
        </div>

        <div className="account-stat-card">
          <div className="account-stat-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <GoogleIcon name="domain" size={22} color="#16a34a" />
          </div>
          <div className="account-stat-info">
            <span className="account-stat-label">Sede Operativa</span>
            <span className="account-stat-value">{sedeNombre}</span>
            <span className="account-stat-sub">{sedeUbicacion} — Perú</span>
          </div>
        </div>

        <div className="account-stat-card">
          <div className="account-stat-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
            <GoogleIcon name="badge" size={22} color="#d97706" />
          </div>
          <div className="account-stat-info">
            <span className="account-stat-label">Código Colaborador</span>
            <span className="account-stat-value">{codigoEmpleado}</span>
            <span className="account-stat-sub">DNI: {dni}</span>
          </div>
        </div>

        <div className="account-stat-card">
          <div className="account-stat-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <GoogleIcon name="verified_user" size={22} color="#2563eb" />
          </div>
          <div className="account-stat-info">
            <span className="account-stat-label">Estado de Cuenta</span>
            <span className="account-stat-value" style={{ color: '#059669' }}>
              {activo ? 'Activo & Seguro' : 'Inactivo'}
            </span>
            <span className="account-stat-sub">Autenticación verificada</span>
          </div>
        </div>
      </div>

      {/* Grilla Principal de Datos */}
      <div className="account-grid">
        {/* Columna Izquierda: Información Personal & Credencial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Información Personal */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title-wrap">
                <div
                  className="account-card__header-icon"
                  style={{ background: `${accentColor}14`, color: accentColor }}
                >
                  <GoogleIcon name="person" size={20} color={accentColor} />
                </div>
                <div className="account-card__title-text">
                  <h3>Información Personal</h3>
                  <p>Datos de identidad y contacto del usuario</p>
                </div>
              </div>
              <span className="account-card__tag">Identidad</span>
            </div>

            <div className="account-card__body">
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
                    title="Copiar correo corporativo"
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

          {/* Credencial Digital Corporativa */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title-wrap">
                <div
                  className="account-card__header-icon"
                  style={{ background: '#f8fafc', color: '#0f172a' }}
                >
                  <GoogleIcon name="credit_card" size={20} color="#0f172a" />
                </div>
                <div className="account-card__title-text">
                  <h3>Credencial Corporativa</h3>
                  <p>Identificación digital oficial de Sales Rebel</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="account-btn account-btn--outline"
                  style={{ padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => setIsFotocheckOpen(true)}
                  title="Abrir fotocheck listo para imprimir"
                >
                  <GoogleIcon name="print" size={14} color="#2563eb" />
                  <span>Imprimir</span>
                </button>
                <span className="account-card__tag">Oficial</span>
              </div>
            </div>

            <div className="account-card__body">
              <div className="account-cred-card">
                <div className="account-cred-card__top">
                  <div className="account-cred-card__brand">
                    <div className="account-cred-card__logo-wrap">
                      <img src="/logo.png" alt="Sales Rebel Logo" />
                    </div>
                    <div>
                      <strong>Sales Rebel</strong>
                      <span>Corporate ID Pass</span>
                    </div>
                  </div>
                  <span className="account-cred-card__badge-tag">Verificado</span>
                </div>

                <div className="account-cred-card__body">
                  <div className="account-cred-card__name">{nombreCompleto}</div>
                  <div
                    className="account-cred-card__role"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <GoogleIcon name={roleIcon} size={15} color="#93c5fd" />
                    <span>{cargo}</span>
                  </div>
                </div>

                <div className="account-cred-card__bottom">
                  <div className="account-cred-card__meta-item">
                    <span className="account-cred-card__meta-label">DNI / Documento</span>
                    <span className="account-cred-card__meta-val">{dni}</span>
                  </div>
                  <div className="account-cred-card__meta-item" style={{ textAlign: 'right' }}>
                    <span className="account-cred-card__meta-label">Código de Empleado</span>
                    <span className="account-cred-card__meta-val">{codigoEmpleado}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="account-btn"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  width: '100%',
                  justifyContent: 'center',
                  marginTop: '12px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                }}
                onClick={() => setIsFotocheckOpen(true)}
              >
                <GoogleIcon name="qr_code_2" size={17} color="#2563eb" />
                <span>Generar Fotocheck Imprimible con Código QR (CR80)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Datos Laborales & Permisos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Datos Laborales y Sede */}
          <div className="account-card">
            <div className="account-card__header">
              <div className="account-card__title-wrap">
                <div
                  className="account-card__header-icon"
                  style={{ background: `${accentColor}14`, color: accentColor }}
                >
                  <GoogleIcon name="work" size={20} color={accentColor} />
                </div>
                <div className="account-card__title-text">
                  <h3>Datos Laborales & Sede</h3>
                  <p>Asignación corporativa y sede de operaciones</p>
                </div>
              </div>
              <span className="account-card__tag">Empresa</span>
            </div>

            <div className="account-card__body">
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
              <div className="account-card__title-wrap">
                <div
                  className="account-card__header-icon"
                  style={{ background: 'rgba(5, 150, 105, 0.1)', color: '#059669' }}
                >
                  <GoogleIcon name="lock" size={20} color="#059669" />
                </div>
                <div className="account-card__title-text">
                  <h3>Permisos & Seguridad del Rol</h3>
                  <p>Capacidades autorizadas para el rol {rolNombre}</p>
                </div>
              </div>
              <span className="account-card__tag">Seguridad</span>
            </div>

            <div className="account-card__body">
              <div className="account-privs-list">
                {privilegios.map((priv, idx) => (
                  <div key={idx} className="account-priv-item">
                    <span className="account-priv-check">
                      <GoogleIcon name="check_circle" size={17} color="#059669" />
                    </span>
                    <span>{priv}</span>
                  </div>
                ))}
              </div>

              <div className="account-security-notice">
                <GoogleIcon name="security" size={18} color="#2563eb" />
                <span>
                  <strong>Sesión protegida:</strong> Tu cuenta opera bajo cifrado y tokens seguros de Sales Rebel.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Fotocheck Imprimible con Código QR (CR80) */}
      <FotocheckModal
        isOpen={isFotocheckOpen}
        onClose={() => setIsFotocheckOpen(false)}
        data={fotocheckData}
      />
    </div>
  );
};

export default MiCuentaPage;
