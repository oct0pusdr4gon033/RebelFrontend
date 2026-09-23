import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../DashboardLayout.css';

const ACCENT = '#0ea5e9';
const ACCENT_BG = 'rgba(14,165,233,0.1)';
const ACCENT_BORDER = 'rgba(14,165,233,0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #0ea5e9, #0284c7)';

export const masterNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard', path: '/master', section: null },
  {
    icon: 'bolt',
    label: 'Oportunidades',
    path: '/master/registro-oportunidad',
    section: 'Ventas',
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
      {
        id: 'subir-evidencia',
        tabKey: 'subir-evidencia',
        label: 'Subir Evidencia',
        path: '/master/registro-oportunidad?tab=subir-evidencia',
      },
    ],
  },
  { icon: 'track_changes', label: 'Mis Metas', path: '/master/metas', section: null },
  { icon: 'local_shipping', label: 'Seguimiento OC', path: '/master/seguimiento-oc', section: 'Ventas' },
  { icon: 'folder_shared', label: 'Mi Cartera', path: '/master/cartera', section: null },
  { icon: 'group', label: 'Mi Equipo', path: '/master/equipo', section: 'Equipo' },
  { icon: 'leaderboard', label: 'Ranking Equipo', path: '/master/ranking', section: null },
  { icon: 'military_tech', label: 'Mis Logros', path: '/master/logros', section: 'Rendimiento' },
  { icon: 'bar_chart', label: 'Reportes Master', path: '/master/reportes', section: null },
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

      <p className="dash__section-title">Mi Rendimiento</p>
      <div className="dash__stats">
        {[
          { icon: 'payments', value: 'S/ 45k', label: 'Ventas este mes' },
          { icon: 'track_changes', value: '87%', label: 'Meta alcanzada' },
          { icon: 'group', value: '6', label: 'Ejecutivas a cargo' },
          { icon: 'military_tech', value: '#2', label: 'Ranking general' },
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
        <Link to="/master/registro-oportunidad" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="assignment" size={24} color={ACCENT} />
            </div>
            <strong>Registro Oportunidad</strong>
            <span>Licitación Perú Compras</span>
          </button>
        </Link>
        <Link to="/master/cartera" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="folder_shared" size={24} color={ACCENT} />
            </div>
            <strong>Ver Cartera</strong>
            <span>Mis clientes activos</span>
          </button>
        </Link>
        <Link to="/master/ranking" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="leaderboard" size={24} color={ACCENT} />
            </div>
            <strong>Ranking Equipo</strong>
            <span>Rendimiento del grupo</span>
          </button>
        </Link>
        <Link to="/master/reportes" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="bar_chart" size={24} color={ACCENT} />
            </div>
            <strong>Reporte Master</strong>
            <span>Análisis consolidado</span>
          </button>
        </Link>
      </div>
    </>
  );
}

export default function MasterLayout() {
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
        navItems={masterNavItems}
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
