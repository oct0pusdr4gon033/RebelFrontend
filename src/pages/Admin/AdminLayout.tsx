import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../DashboardLayout.css';

const ACCENT = '#3b5bdb';
const ACCENT_BG = 'rgba(59,91,219,0.1)';
const ACCENT_BORDER = 'rgba(59,91,219,0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #3b5bdb, #1e40af)';

export const adminNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/admin', section: null },
  { icon: 'badge', label: 'Empleados', path: '/admin/empleados', section: 'Gestión' },
  { icon: 'domain', label: 'Mi Sede', path: '/admin/sede', section: null },
  { icon: 'handshake', label: 'Acuerdos Marco', path: '/admin/acuerdos', section: 'Comercial' },
  { icon: 'corporate_fare', label: 'Empresas', path: '/admin/empresas', section: null },
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
          Gestiona el equipo, las sedes y los acuerdos comerciales. Tienes acceso completo a la operación de tu área.
        </p>
      </div>

      <p className="dash__section-title">Resumen Operativo</p>
      <div className="dash__stats">
        {[
          { icon: 'badge', value: '12', label: 'Empleados activos' },
          { icon: 'handshake', value: '8', label: 'Acuerdos marco' },
          { icon: 'corporate_fare', value: '5', label: 'Empresas registradas' },
          { icon: 'assignment', value: '3', label: 'Tareas pendientes' },
        ].map((s, i) => (
          <div key={i} className="dash__stat-card" style={{ borderColor: i === 0 ? ACCENT_BORDER : undefined }}>
            <div className="dash__stat-icon">
              <GoogleIcon name={s.icon} size={24} color={i === 0 ? ACCENT : '#64748b'} />
            </div>
            <div className="dash__stat-value" style={{ color: i === 0 ? ACCENT : undefined }}>
              {s.value}
            </div>
            <div className="dash__stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <p className="dash__section-title">Acciones Rápidas</p>
      <div className="dash__actions-grid">
        {[
          { icon: 'person_add', title: 'Nuevo Empleado', desc: 'Registrar al equipo' },
          { icon: 'handshake', title: 'Acuerdo Marco', desc: 'Crear nuevo acuerdo' },
          { icon: 'add_business', title: 'Nueva Empresa', desc: 'Registrar cliente' },
          { icon: 'bar_chart', title: 'Ver Reportes', desc: 'Análisis del período' },
        ].map((a, i) => (
          <button key={i} className="dash__action-btn" style={{ borderColor: ACCENT_BORDER }}>
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
