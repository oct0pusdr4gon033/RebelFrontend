import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { withTecnicoTicketsNav } from '../Tickets/tecnicoNav';
import { Sidebar } from '../../components/SideBar/Sidebar';
import type { NavItem } from '../../components/SideBar/NavItem';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import NotificacionesGlobales from '../../components/NotificacionesGlobales/NotificacionesGlobales';
import '../DashboardLayout.css';

const ACCENT = '#2563eb';
const ACCENT_BG = 'rgba(37, 99, 235, 0.1)';
const ACCENT_BORDER = 'rgba(37, 99, 235, 0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

export const gerenteNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Inicio', path: '/gerente', section: null },
  {
    icon: 'event_available',
    label: 'Asistencias',
    path: '/gerente/asistencias',
    section: 'Gestión de Personal',
    pushButtons: [
      {
        id: 'consultar-asistencias',
        label: 'Consultar asistencias',
        path: '/gerente/asistencias',
      },
      {
        id: 'horarios',
        label: 'Horarios',
        path: '/gerente/asistencias/horarios',
      },
      {
        id: 'excepciones',
        label: 'Excepciones',
        path: '/gerente/asistencias/excepciones',
      },
      {
        id: 'dias-no-laborables',
        label: 'Días no laborables',
        path: '/gerente/asistencias/dias-no-laborables',
      },
    ],
  },
  {
    icon: 'assignment',
    label: 'Solicitudes',
    path: '/gerente/solicitudes',
    section: 'Gestión de Solicitudes',
    pushButtons: [
      {
        id: 'solicitudes-pendientes',
        label: 'Solicitudes pendientes',
        path: '/gerente/solicitudes',
      },
      {
        id: 'historial-solicitudes',
        label: 'Historial de solicitudes',
        path: '/gerente/solicitudes/historial',
      },
    ],
  },
  { icon: 'person', label: 'Mi Cuenta', path: '/gerente/mi-cuenta', section: 'Cuenta' },
];

export function GerenteDashboard() {
  const { empleado } = useAuth();
  const navigate = useNavigate();

  const indicators = [
    { icon: 'event_available', label: 'Asistencias del día', path: '/gerente/asistencias' },
    { icon: 'pending_actions', label: 'Solicitudes pendientes', path: '/gerente/solicitudes' },
    { icon: 'task_alt', label: 'Solicitudes aprobadas', path: '/gerente/solicitudes/historial' },
    { icon: 'cancel', label: 'Solicitudes rechazadas', path: '/gerente/solicitudes/historial' },
  ];

  return (
    <>
      <div
        className="dash__welcome"
        style={{
          background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(30,64,175,0.06))',
          border: `1.5px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="dash__welcome-tag" style={{ color: ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GoogleIcon name="manage_accounts" size={16} color={ACCENT} />
          <span>Panel de Gestión</span>
        </div>
        <h2>Bienvenido{empleado?.nombres ? `, ${empleado.nombres}` : ''}</h2>
        <p>Supervisa las asistencias y solicitudes de tu organización desde un solo lugar.</p>
      </div>

      <p className="dash__section-title">Resumen de gestión</p>
      <div className="dash__stats">
        {indicators.map((indicator) => (
          <button
            type="button"
            className="dash__stat-card"
            key={indicator.label}
            onClick={() => navigate(indicator.path)}
            style={{ borderColor: ACCENT_BORDER, textAlign: 'left' }}
          >
            <div className="dash__stat-icon">
              <GoogleIcon name={indicator.icon} size={24} color={ACCENT} />
            </div>
            <div className="dash__stat-value" style={{ color: ACCENT }}>—</div>
            <div className="dash__stat-label">{indicator.label}</div>
          </button>
        ))}
      </div>

      <p className="dash__section-title">Accesos rápidos</p>
      <div className="dash__actions-grid">
        <button
          type="button"
          className="dash__action-btn"
          style={{ borderColor: ACCENT_BORDER }}
          onClick={() => navigate('/gerente/asistencias')}
        >
          <div className="dash__action-btn-icon">
            <GoogleIcon name="event_available" size={24} color={ACCENT} />
          </div>
          <strong>Consultar asistencias</strong>
          <span>Revisar el registro del equipo</span>
        </button>
        <button
          type="button"
          className="dash__action-btn"
          style={{ borderColor: ACCENT_BORDER }}
          onClick={() => navigate('/gerente/solicitudes')}
        >
          <div className="dash__action-btn-icon">
            <GoogleIcon name="assignment" size={24} color={ACCENT} />
          </div>
          <strong>Solicitudes pendientes</strong>
          <span>Revisar solicitudes por atender</span>
        </button>
      </div>
    </>
  );
}

export default function GerenteLayout() {
  const { empleado } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dash">
      <Sidebar
        roleName="GERENTE"
        roleDisplayName="GERENTE"
        roleIcon="manage_accounts"
        accent={ACCENT}
        accentBg={ACCENT_BG}
        accentBorder={ACCENT_BORDER}
        avatarGrad={AVATAR_GRAD}
        basePath="/gerente"
        navItems={withTecnicoTicketsNav(gerenteNavItems, '/gerente', empleado?.puedeAtenderTickets)}
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
            <span className="dash__header-title">Panel de Gestión</span>
          </div>
          <div className="dash__header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificacionesGlobales basePath="/gerente" accent={ACCENT} />
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
              <GoogleIcon name="manage_accounts" size={16} color={ACCENT} />
              <span>GERENTE</span>
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
