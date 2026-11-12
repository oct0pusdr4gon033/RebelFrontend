import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { withTecnicoTicketsNav } from '../Tickets/tecnicoNav';
import { Sidebar } from '../../components/SideBar/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import NotificacionesGlobales from '../../components/NotificacionesGlobales/NotificacionesGlobales';
import '../DashboardLayout.css';
import { ejecutivaNavItems } from './ejecutivaNavItems'
import { ColorVariable } from './ColorsVariables'

export default function EjecutivaLayout() {
  const { empleado } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const colores = new ColorVariable();

  return (
    <div className="dash">
      <Sidebar
        roleName="Ejecutivo(a) Ventas"
        roleDisplayName="Ejecutivo(a) Ventas"
        roleIcon="work"
        accent={colores.ACCENT}
        accentBg={colores.ACCENT_BG}
        accentBorder={colores.ACCENT_BORDER}
        avatarGrad={colores.AVATAR_GRAD}
        basePath="/ejecutiva"
        navItems={withTecnicoTicketsNav(ejecutivaNavItems, '/ejecutiva', empleado?.puedeAtenderTickets)}
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
          <div className="dash__header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NotificacionesGlobales basePath="/ejecutiva" accent={colores.ACCENT} />
            <span
              className="dash__header-badge"
              style={{
                background: colores.ACCENT_BG,
                color: colores.ACCENT,
                border: `1.5px solid ${colores.ACCENT_BORDER}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <GoogleIcon name="work" size={16} color={colores.ACCENT} />
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
