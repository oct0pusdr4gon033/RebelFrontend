import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/SideBar/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { OportunidadesDashboard } from '../../components/OportunidadesDashboard';
import '../DashboardLayout.css';

const ACCENT = '#2563eb';
const ACCENT_BG = 'rgba(37, 99, 235, 0.1)';
const ACCENT_BORDER = 'rgba(37, 99, 235, 0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

export const ejecutivaNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/ejecutiva', section: null },
  {
    icon: 'bolt',
    label: 'Oportunidades',
    path: '/ejecutiva/registro-oportunidad',
    section: 'Ventas',
    pushButtons: [
      {
        id: 'registrar',
        tabKey: 'registrar',
        label: 'Registrar',
        path: '/ejecutiva/registro-oportunidad?tab=registrar',
      },
      {
        id: 'mis-oportunidades',
        tabKey: 'mis-oportunidades',
        label: 'Mis Oportunidades',
        path: '/ejecutiva/registro-oportunidad?tab=mis-oportunidades',
      },
      {
        id: 'listar',
        tabKey: 'listar',
        label: 'Listar',
        path: '/ejecutiva/registro-oportunidad?tab=listar',
      },
      {
        id: 'podio-licitaciones',
        tabKey: 'podio',
        label: 'Podio Licitaciones',
        path: '/ejecutiva/registro-oportunidad?tab=podio&tipo=licitaciones',
        badge: '1° Reg',
      },
      {
        id: 'podio-ventas',
        tabKey: 'podio',
        label: 'Podio Ventas',
        path: '/ejecutiva/registro-oportunidad?tab=podio&tipo=ventas',
        badge: 'S/',
      },
    ],
  },
  { icon: 'track_changes', label: 'Mis Metas', path: '/ejecutiva/metas', section: null },
  { icon: 'local_shipping', label: 'Seguimiento OC', path: '/ejecutiva/seguimiento-oc', section: 'Ventas' },
  { icon: 'payments', label: 'Solicitud de Pagos', path: '/ejecutiva/pagos', section: 'Ventas' },
  {
    icon: 'import_contacts',
    label: 'Agenda de Contactos',
    path: '/ejecutiva/agenda-contactos',
    section: 'Ventas',
    pushButtons: [
      {
        id: 'ejec-agenda-registrar',
        tabKey: 'registrar',
        label: 'Registrar',
        path: '/ejecutiva/agenda-contactos?tab=registrar',
        description: 'Nuevo contacto de OCAM',
      },
      {
        id: 'ejec-agenda-contactos',
        tabKey: 'agenda',
        label: 'Agenda',
        path: '/ejecutiva/agenda-contactos?tab=agenda',
        description: 'Directorio y filtros por OCAM',
      },
    ],
  },
  { icon: 'person', label: 'Mi Cuenta', path: '/ejecutiva/mi-cuenta', section: 'Cuenta' },
];

export function EjecutivaDashboard() {
  const { empleado } = useAuth();

  return (
    <>
      <div
        className="dash__welcome"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(8,145,178,0.06))',
          border: `1.5px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="dash__welcome-tag" style={{ color: ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GoogleIcon name="work" size={16} color={ACCENT} />
          <span>Ejecutiva de Ventas</span>
        </div>
        <h2>¡Bienvenida, {empleado?.nombres ?? 'Rebel'}!</h2>
        <p>
          ¡Es hora de romper récords! Registra tus ventas, revisa tus metas y sube en el ranking.
        </p>
      </div>

      <OportunidadesDashboard
        scope="personal"
        detailPath="/ejecutiva/registro-oportunidad?tab=mis-oportunidades"
        accent={ACCENT}
      />

      <p className="dash__section-title">Acciones Rápidas</p>
      <div className="dash__actions-grid">
        <Link to="/ejecutiva/registro-oportunidad" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="assignment" size={24} color={ACCENT} />
            </div>
            <strong>Registro Oportunidad</strong>
            <span>Licitación Perú Compras</span>
          </button>
        </Link>
        <Link to="/ejecutiva/cartera" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="folder_shared" size={24} color={ACCENT} />
            </div>
            <strong>Ver Cartera</strong>
            <span>Mis clientes</span>
          </button>
        </Link>
        <Link to="/ejecutiva/ranking" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="leaderboard" size={24} color={ACCENT} />
            </div>
            <strong>Ver Ranking</strong>
            <span>Mi posición hoy</span>
          </button>
        </Link>
        <Link to="/ejecutiva/reportes" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="bar_chart" size={24} color={ACCENT} />
            </div>
            <strong>Mis Reportes</strong>
            <span>Historial de ventas</span>
          </button>
        </Link>
      </div>
    </>
  );
}

export default function EjecutivaLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dash">
      <Sidebar
        roleName="Ejecutivo(a) Ventas"
        roleDisplayName="Ejecutivo(a) Ventas"
        roleIcon="work"
        accent={ACCENT}
        accentBg={ACCENT_BG}
        accentBorder={ACCENT_BORDER}
        avatarGrad={AVATAR_GRAD}
        basePath="/ejecutiva"
        navItems={ejecutivaNavItems}
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
            <span className="dash__header-title">Mi Panel de Ventas</span>
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
              <GoogleIcon name="work" size={16} color={ACCENT} />
              <span>Ejecutiva Ventas</span>
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
