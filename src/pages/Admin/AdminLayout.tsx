import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../DashboardLayout.css';

const ACCENT = '#2563eb';
const ACCENT_BG = 'rgba(37, 99, 235, 0.1)';
const ACCENT_BORDER = 'rgba(37, 99, 235, 0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

export const adminNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin', section: null },
  {
    icon: 'gavel',
    label: 'Resolver Oportunidades',
    path: '/admin/resolver-oportunidades',
    section: 'Licitaciones',
    pushButtons: [
      {
        id: 'bandeja',
        tabKey: 'bandeja',
        label: 'Bandeja',
        path: '/admin/resolver-oportunidades?tab=bandeja',
        description: 'Todas las Oportunidades',
      },
      {
        id: 'resolver',
        tabKey: 'resolver',
        label: 'Resolver',
        path: '/admin/resolver-oportunidades?tab=resolver',
        badge: 'Podio',
        description: 'Podio y Veredicto por RQ',
      },
    ],
  },
  { icon: 'handshake', label: 'Acuerdos Marco', path: '/admin/acuerdos', section: 'Comercial' },
  { icon: 'local_shipping', label: 'Seguimiento OC', path: '/admin/seguimiento-oc', section: 'Licitaciones' },
  { icon: 'corporate_fare', label: 'Empresas', path: '/admin/empresas', section: null },
  { icon: 'badge', label: 'Empleados', path: '/admin/empleados', section: 'Gestión' },
  { icon: 'domain', label: 'Mi Sede', path: '/admin/sede', section: null },
  { icon: 'bar_chart', label: 'Reportes', path: '/admin/reportes', section: 'Análisis' },
  { icon: 'calendar_month', label: 'Calendario', path: '/admin/calendario', section: null },
  // ── Administración de Empresa ──
  { icon: 'domain', label: 'Sedes', path: '/admin/empresa/sedes', section: 'Adm. Empresa' },
  { icon: 'badge', label: 'Empleados', path: '/admin/empresa/empleados', section: null },
  { icon: 'manage_accounts', label: 'Usuarios', path: '/admin/empresa/usuarios', section: null },
  { icon: 'person', label: 'Mi Cuenta', path: '/admin/mi-cuenta', section: 'Cuenta' },
];

export function AdminDashboard() {
  const { empleado } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <div
        className="dash__welcome"
        style={{
          background: 'linear-gradient(135deg, rgba(59,91,219,0.1), rgba(30,64,175,0.06))',
          border: `1.5px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="dash__welcome-tag" style={{ color: ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GoogleIcon name="shield_person" size={16} color={ACCENT} />
          <span>Gestión Operativa</span>
        </div>
        <h2>Bienvenida, {empleado?.nombres ?? 'Administradora'}</h2>
        <p>
          Gestiona el equipo, las sedes, los acuerdos comerciales y la resolución de licitaciones públicas. Tienes acceso completo a la operación de tu área.
        </p>
      </div>

      <p className="dash__section-title">Resumen Operativo</p>
      <div className="dash__stats">
        {[
          { icon: 'gavel', value: 'Resolver', label: 'Licitaciones y Oportunidades', path: '/admin/resolver-oportunidades', highlight: true },
          { icon: 'badge', value: '12', label: 'Empleados activos', path: '/admin/empresa/empleados' },
          { icon: 'handshake', value: '8', label: 'Acuerdos marco', path: '/admin/acuerdos' },
          { icon: 'corporate_fare', value: '5', label: 'Empresas registradas', path: '/admin/empresas' },
        ].map((s, i) => (
          <div
            key={i}
            className="dash__stat-card"
            style={{
              borderColor: s.highlight ? ACCENT : undefined,
              cursor: s.path ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
            onClick={() => s.path && navigate(s.path)}
          >
            <div className="dash__stat-icon">
              <GoogleIcon name={s.icon} size={24} color={s.highlight ? ACCENT : '#64748b'} />
            </div>
            <div className="dash__stat-value" style={{ color: s.highlight ? ACCENT : undefined }}>
              {s.value}
            </div>
            <div className="dash__stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="dash__section-title">Acciones Rápidas</p>
      <div className="dash__actions-grid">
        {[
          { icon: 'gavel', title: 'Resolver Oportunidades', desc: 'Dictaminar estado y adjudicación', path: '/admin/resolver-oportunidades' },
          { icon: 'person_add', title: 'Nuevo Empleado', desc: 'Registrar al equipo', path: '/admin/empresa/empleados' },
          { icon: 'handshake', title: 'Acuerdo Marco', desc: 'Crear nuevo acuerdo', path: '/admin/acuerdos' },
          { icon: 'add_business', title: 'Nueva Empresa', desc: 'Registrar cliente', path: '/admin/empresas' },
        ].map((a, i) => (
          <button
            key={i}
            className="dash__action-btn"
            style={{ borderColor: ACCENT_BORDER }}
            onClick={() => a.path && navigate(a.path)}
          >
            <div className="dash__action-btn-icon">
              <GoogleIcon name={a.icon} size={24} color={ACCENT} />
            </div>
            <strong>{a.title}</strong>
            <span>{a.desc}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dash">
      <Sidebar
        roleName="Administrador"
        roleDisplayName="Administrador"
        roleIcon="shield_person"
        accent={ACCENT}
        accentBg={ACCENT_BG}
        accentBorder={ACCENT_BORDER}
        avatarGrad={AVATAR_GRAD}
        basePath="/admin"
        navItems={adminNavItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="dash__main">
        <header className="dash__header">
          <div className="dash__header-left">
            <button
              type="button"
              className="dash__hamburger-btn"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              title={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-label="Alternar menú lateral"
            >
              <GoogleIcon name={isSidebarOpen ? 'close' : 'menu'} size={22} color="#0a2540" />
            </button>
            <span className="dash__header-title">Panel Administrativo</span>
          </div>
          <div className="dash__header-right">
            <span
              className="dash__header-badge"
              style={{
                background: ACCENT_BG,
                color: ACCENT,
                border: `1.5px solid ${ACCENT_BORDER}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <GoogleIcon name="shield_person" size={16} color={ACCENT} />
              <span>Administrador</span>
            </span>
          </div>
        </header>

        <main className="dash__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
