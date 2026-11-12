import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { withTecnicoTicketsNav } from '../Tickets/tecnicoNav';
import { Sidebar } from '../../components/SideBar/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { OportunidadesDashboard } from '../../components/OportunidadesDashboard';
import NotificacionesGlobales from '../../components/NotificacionesGlobales/NotificacionesGlobales';
import { masterNavItems } from './masterNavItems'
import '../DashboardLayout.css';

const ACCENT = '#2563eb';
const ACCENT_BG = 'rgba(37, 99, 235, 0.1)';
const ACCENT_BORDER = 'rgba(37, 99, 235, 0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #2563eb, #1d4ed8)';


export function MasterDashboard() {
  const { empleado } = useAuth();

  return (
    <>
      <div
        className="dash__welcome"
        style={{
          background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(2,132,199,0.06))',
          border: `1.5px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="dash__welcome-tag" style={{ color: ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GoogleIcon name="military_tech" size={16} color={ACCENT} />
          <span>Ejecutiva Master de Ventas</span>
        </div>
        <h2>¡Hola, {empleado?.nombres ?? 'Campeona'}!</h2>
        <p>
          Lidera con el ejemplo. Gestiona tu equipo, supervisa las metas y lleva las ventas al siguiente nivel.
        </p>
      </div>

      <OportunidadesDashboard
        scope="sistema"
        detailPath="/master/supervision?tab=oportunidades"
        accent={ACCENT}
      />

      <p className="dash__section-title">Centro de Control Master</p>
      <div className="dash__actions-grid">
        <Link to="/master/supervision?tab=oportunidades" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="monitoring" size={24} color={ACCENT} />
            </div>
            <strong>Todas las Oportunidades</strong>
            <span>Control general de licitaciones</span>
          </button>
        </Link>
        <Link to="/master/supervision?tab=ocams" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="local_shipping" size={24} color={ACCENT} />
            </div>
            <strong>Todas las OCAMs</strong>
            <span>Órdenes de compra del equipo</span>
          </button>
        </Link>
        <Link to="/master/supervision?tab=contactos" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="import_contacts" size={24} color={ACCENT} />
            </div>
            <strong>Agenda Global</strong>
            <span>Directorio y llamadas de ejecutivas</span>
          </button>
        </Link>
        <Link to="/master/registro-oportunidad" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="assignment" size={24} color={ACCENT} />
            </div>
            <strong>Registrar Oportunidad</strong>
            <span>Nueva licitación Perú Compras</span>
          </button>
        </Link>
      </div>
    </>
  );
}

export default function MasterLayout() {
  const { empleado } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dash">
      <Sidebar
        roleName="Ejecutivo(a) Master Ventas"
        roleDisplayName="Ejecutivo(a) Master Ventas"
        roleIcon="military_tech"
        accent={ACCENT}
        accentBg={ACCENT_BG}
        accentBorder={ACCENT_BORDER}
        avatarGrad={AVATAR_GRAD}
        basePath="/master"
        navItems={withTecnicoTicketsNav(masterNavItems, '/master', empleado?.puedeAtenderTickets)}
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
            <span className="dash__header-title">Panel Ejecutiva Master de Ventas</span>
          </div>
          <div className="dash__header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificacionesGlobales basePath="/master" accent={ACCENT} />
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
              <GoogleIcon name="military_tech" size={16} color={ACCENT} />
              <span>Ejecutiva Master</span>
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
