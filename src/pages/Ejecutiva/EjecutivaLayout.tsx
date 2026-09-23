import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../DashboardLayout.css';

const ACCENT = '#06b6d4';
const ACCENT_BG = 'rgba(6,182,212,0.1)';
const ACCENT_BORDER = 'rgba(6,182,212,0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #06b6d4, #0891b2)';

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
      {
        id: 'subir-evidencia',
        tabKey: 'subir-evidencia',
        label: 'Subir Evidencia',
        path: '/ejecutiva/registro-oportunidad?tab=subir-evidencia',
      },
    ],
  },
  { icon: 'track_changes', label: 'Mis Metas', path: '/ejecutiva/metas', section: null },
  { icon: 'local_shipping', label: 'Seguimiento OC', path: '/ejecutiva/seguimiento-oc', section: 'Ventas' },
  { icon: 'folder_shared', label: 'Mi Cartera', path: '/ejecutiva/cartera', section: null },
  { icon: 'add_shopping_cart', label: 'Nueva Venta', path: '/ejecutiva/nueva-venta', section: null },
  { icon: 'leaderboard', label: 'Mi Ranking', path: '/ejecutiva/ranking', section: 'Rendimiento' },
  { icon: 'bar_chart', label: 'Mis Reportes', path: '/ejecutiva/reportes', section: null },
  { icon: 'notifications', label: 'Alertas', path: '/ejecutiva/alertas', section: null },
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

      <p className="dash__section-title">Mi Rendimiento Hoy</p>
      <div className="dash__stats">
        {[
          { icon: 'payments', value: 'S/ 8.2k', label: 'Ventas hoy' },
          { icon: 'track_changes', value: '72%', label: 'Meta del mes' },
          { icon: 'folder_shared', value: '14', label: 'Clientes activos' },
          { icon: 'military_tech', value: '#5', label: 'Mi posición' },
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
