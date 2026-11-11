import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { withTecnicoTicketsNav } from '../Tickets/tecnicoNav';
import { Sidebar } from '../../components/SideBar/Sidebar';
import type { NavItem } from '../../components/SideBar/NavItem';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { OportunidadesDashboard } from '../../components/OportunidadesDashboard';
import NotificacionesGlobales from '../../components/NotificacionesGlobales/NotificacionesGlobales';
import '../DashboardLayout.css';

const ACCENT = '#2563eb';
const ACCENT_BG = 'rgba(37, 99, 235, 0.1)';
const ACCENT_BORDER = 'rgba(37, 99, 235, 0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

export const masterNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/master', section: null },
  {
    icon: 'monitoring',
    label: 'Supervisión Master',
    path: '/master/supervision',
    section: 'Supervisión de Equipo',
    pushButtons: [
      {
        id: 'sup-resumen',
        tabKey: 'resumen',
        label: 'Resumen y Métricas',
        path: '/master/supervision?tab=resumen',
        description: 'Desempeño y volumen del equipo',
      },
      {
        id: 'sup-oportunidades',
        tabKey: 'oportunidades',
        label: 'Todas las Oportunidades',
        path: '/master/supervision?tab=oportunidades',
        description: 'Todas las licitaciones registradas',
      },
      {
        id: 'sup-ocams',
        tabKey: 'ocams',
        label: 'Todas las OCAMs / OCs',
        path: '/master/supervision?tab=ocams',
        description: 'Todas las órdenes de compra emitidas',
      },
      {
        id: 'sup-contactos',
        tabKey: 'contactos',
        label: 'Agenda Global',
        path: '/master/supervision?tab=contactos',
        description: 'Directorio de contactos del equipo',
      },
      {
        id: 'sup-ranking',
        tabKey: 'ranking',
        label: 'Ranking de Ejecutivas',
        path: '/master/supervision?tab=ranking',
        badge: 'Top',
        description: 'Comparativo individual de ventas',
      },
    ],
  },
  {
    icon: 'bolt',
    label: 'Oportunidades',
    path: '/master/registro-oportunidad',
    section: 'Ventas y Licitaciones',
    pushButtons: [
      {
        id: 'registrar',
        tabKey: 'registrar',
        label: 'Registrar',
        path: '/master/registro-oportunidad?tab=registrar',
      },
      {
        id: 'mis-oportunidades',
        tabKey: 'mis-oportunidades',
        label: 'Mis Oportunidades',
        path: '/master/registro-oportunidad?tab=mis-oportunidades',
      },
      {
        id: 'listar',
        tabKey: 'listar',
        label: 'Listar',
        path: '/master/registro-oportunidad?tab=listar',
      },
      {
        id: 'podio-licitaciones',
        tabKey: 'podio',
        label: 'Podio Licitaciones',
        path: '/master/registro-oportunidad?tab=podio&tipo=licitaciones',
        badge: '1° Reg',
      },
      {
        id: 'podio-ventas',
        tabKey: 'podio',
        label: 'Podio Ventas',
        path: '/master/registro-oportunidad?tab=podio&tipo=ventas',
        badge: 'S/',
      },
    ],
  },
  { icon: 'local_shipping', label: 'Seguimiento OC', path: '/master/seguimiento-oc', section: null },
  { icon: 'payments', label: 'Solicitud de Pagos', path: '/master/pagos', section: null },
  {
    icon: 'import_contacts',
    label: 'Agenda de Contactos',
    path: '/master/agenda-contactos',
    section: null,
    pushButtons: [
      {
        id: 'master-agenda-registrar',
        tabKey: 'registrar',
        label: 'Registrar',
        path: '/master/agenda-contactos?tab=registrar',
        description: 'Nuevo contacto de OCAM',
      },
      {
        id: 'master-agenda-contactos',
        tabKey: 'agenda',
        label: 'Agenda',
        path: '/master/agenda-contactos?tab=agenda',
        description: 'Directorio y filtros por OCAM',
      },
    ],
  },
  { icon: 'assignment', label: 'Mis Solicitudes', path: '/master/solicitudes', section: 'Gestión Interna' },
  { icon: 'confirmation_number', label: 'Tickets', path: '/master/tickets', section: null },
  {
    icon: 'schedule',
    label: 'Asistencias',
    path: '/master/asistencias',
    section: 'Personal',
    pushButtons: [
      {
        id: 'master-mi-asistencia',
        label: 'Mi Asistencia',
        path: '/master/asistencias',
      },
      {
        id: 'master-estadisticas-asistencia',
        label: 'Estadísticas de asistencia',
        path: '/master/estadisticas/asistencia',
      },
      {
        id: 'master-historial-asistencia',
        label: 'Historial de asistencia',
        path: '/master/asistencias/historial',
      },
    ],
  },
  { icon: 'person', label: 'Mi Cuenta', path: '/master/mi-cuenta', section: 'Cuenta' },
];

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
