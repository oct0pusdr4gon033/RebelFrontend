import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleIcon } from './GoogleIcon';
import './Sidebar.css';

export interface NavPushButton {
  id: string;
  label: string;
  icon?: string;
  path: string;
  tabKey?: string;
  badge?: string | number;
  description?: string;
}

export interface NavItem {
  icon: string;
  label: string;
  path?: string;
  section?: string | null;
  badge?: string;
  onClick?: () => void;
  /** Sub-botones a modo de push button integrados en el sidebar */
  pushButtons?: NavPushButton[];
}

export interface SidebarProps {
  roleName: string;
  roleDisplayName?: string;
  roleIcon?: string;
  accent?: string;
  accentBg?: string;
  accentBorder?: string;
  avatarGrad?: string;
  basePath: string;
  navItems: NavItem[];
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  roleName,
  roleDisplayName = roleName,
  roleIcon = 'shield_person',
  accent = '#4F9AFF',
  accentBg = 'rgba(79, 154, 255, 0.1)',
  accentBorder = 'rgba(79, 154, 255, 0.28)',
  avatarGrad = 'linear-gradient(135deg, #4F9AFF, #1a73e8)',
  basePath,
  navItems,
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { empleado, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Estado para expandir/colapsar grupos con push buttons (abiertos por defecto)
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    'Oportunidades': true,
    'Registro Oportunidad': true,
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: prev[label] === undefined ? false : !prev[label],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
    onClose?.();
  };

  const nombreCompleto =
    empleado?.nombreCompleto ||
    (empleado?.nombres ? `${empleado.nombres} ${empleado.apellidos ?? ''}`.trim() : null) ||
    'Usuario Sales Rebel';

  const nombres = empleado?.nombres || 'Admin';
  const apellidos = empleado?.apellidos || 'Rebel';
  const initials = `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase() || 'SR';

  const handleNavClick = (item: NavItem) => {
    if (item.onClick) {
      item.onClick();
      onClose?.();
      return;
    }

    if (item.pushButtons && item.pushButtons.length > 0) {
      const isCurrentlyOnPath = item.path && location.pathname.startsWith(item.path);
      if (isCurrentlyOnPath) {
        toggleGroup(item.label);
      } else {
        setOpenGroups((prev) => ({ ...prev, [item.label]: true }));
        if (item.path) {
          navigate(item.path);
        }
        onClose?.();
      }
      return;
    }

    if (item.path) {
      navigate(item.path);
    }
    // Cerrar automáticamente en pantallas móviles/tablets al navegar
    onClose?.();
  };

  return (
    <>
      {/* Backdrop oscuro para móvil cuando el sidebar está abierto */}
      {isOpen && (
        <div
          className="sb-backdrop"
          onClick={onClose}
          aria-hidden="true"
          title="Toca para cerrar el menú"
        />
      )}

      <aside
        className={`sb-container ${isOpen ? 'sb-container--mobile-open' : ''} ${
          isCollapsed ? 'sb-container--collapsed' : ''
        }`}
        aria-label="Menú de Navegación Principal"
      >
        {/* Brand / Logo + Botón de Cerrar para Móvil */}
        <div className="sb-brand-wrapper">
          <Link
            to={basePath}
            className="sb-brand"
            title="Ir al Inicio"
            onClick={() => onClose?.()}
          >
            <div className="sb-brand__logo-wrap">
              <img src="/logo.png" alt="Sales Rebel Logo" />
            </div>
            {!isCollapsed && (
              <div className="sb-brand__text">
                <strong>Sales Rebel</strong>
                <span style={{ color: accent }}>{roleDisplayName}</span>
              </div>
            )}
          </Link>

          {/* Botón de cierre visible únicamente en móvil */}
          <button
            type="button"
            className="sb-mobile-close-btn"
            onClick={onClose}
            title="Cerrar menú"
            aria-label="Cerrar menú lateral"
          >
            <GoogleIcon name="close" size={20} color="#64748b" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="sb-nav">
          {navItems.map((item, index) => {
            const isActive =
              item.path &&
              (location.pathname === item.path ||
                (item.path !== basePath && location.pathname.startsWith(item.path)));
            const isGroupOpen = openGroups[item.label] ?? true;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {item.section && !isCollapsed && (
                  <div className="sb-nav__section">{item.section}</div>
                )}
                <button
                  type="button"
                  className={`sb-nav__item ${isActive ? 'sb-nav__item--active' : ''}`}
                  style={
                    isActive
                      ? {
                          background: accentBg,
                          color: accent,
                          borderLeft: `3.5px solid ${accent}`,
                          border: `1px solid ${accentBorder}`,
                        }
                      : undefined
                  }
                  onClick={() => handleNavClick(item)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className="sb-nav__item-main">
                    <span className="sb-nav__item-icon">
                      <GoogleIcon name={item.icon} size={19} />
                    </span>
                    {!isCollapsed && <span className="sb-nav__item-label">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.badge && (
                        <span className="sb-nav__item-badge">{item.badge}</span>
                      )}
                      {item.pushButtons && item.pushButtons.length > 0 && (
                        <GoogleIcon
                          name={isGroupOpen ? 'expand_less' : 'expand_more'}
                          size={16}
                          color="#94a3b8"
                        />
                      )}
                    </div>
                  )}
                </button>

                {/* Sub-opciones de navegación limpias con hover en el sidebar */}
                {item.pushButtons && item.pushButtons.length > 0 && isGroupOpen && (
                  <div
                    className={`sb-sub-list ${isCollapsed ? 'sb-sub-list--collapsed' : ''}`}
                    role="group"
                    aria-label={`Opciones de ${item.label}`}
                  >
                    {item.pushButtons.map((pb) => {
                      const searchParams = new URLSearchParams(location.search);
                      const currentTab = searchParams.get('tab') || 'registrar';
                      const currentTipo = searchParams.get('tipo') || (currentTab === 'podio' ? 'licitaciones' : null);

                      let pbTab = pb.tabKey;
                      let pbTipo: string | null = null;
                      try {
                        const parsedUrl = new URL(pb.path, window.location.origin);
                        pbTab = parsedUrl.searchParams.get('tab') || pb.tabKey;
                        pbTipo = parsedUrl.searchParams.get('tipo');
                      } catch {
                        // fallback
                      }

                      const isPbActive =
                        location.pathname.startsWith(item.path || '') &&
                        (pbTab ? currentTab === pbTab : (location.pathname + location.search) === pb.path) &&
                        (pbTipo ? currentTipo === pbTipo : true);

                      return (
                        <button
                          key={pb.id}
                          type="button"
                          className={`sb-sub-item ${isPbActive ? 'sb-sub-item--active' : ''}`}
                          style={
                            isPbActive
                              ? {
                                  color: accent,
                                  background: accentBg,
                                  fontWeight: 700,
                                }
                              : undefined
                          }
                          onClick={() => {
                            navigate(pb.path);
                            onClose?.();
                          }}
                          title={pb.label}
                        >
                          <span className="sb-sub-item__label">{pb.label}</span>
                          {!isCollapsed && pb.badge !== undefined && (
                            <span
                              className="sb-sub-item__badge"
                              style={
                                isPbActive
                                  ? { background: accentBg, color: accent }
                                  : undefined
                              }
                            >
                              {pb.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Botón de Colapso en Desktop (Opcional) */}
        {onToggleCollapse && (
          <div className="sb-collapse-toggle-wrapper">
            <button
              type="button"
              className="sb-collapse-toggle-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            >
              <GoogleIcon
                name={isCollapsed ? 'chevron_right' : 'chevron_left'}
                size={18}
                color="#64748b"
              />
              {!isCollapsed && <span>Colapsar menú</span>}
            </button>
          </div>
        )}

        {/* Pie de usuario / Acceso a pantalla Mi Cuenta */}
        <div className="sb-user-card">
          <button
            type="button"
            className="sb-user-card__main"
            onClick={() => {
              navigate(`${basePath}/mi-cuenta`);
              onClose?.();
            }}
            title="Ver mi cuenta y perfil completo"
          >
            <div className="sb-user-card__avatar-wrap">
              <div className="sb-user-card__avatar" style={{ background: avatarGrad }}>
                {initials}
              </div>
              <span className="sb-user-card__online-dot" title="En línea" />
            </div>

            {!isCollapsed && (
              <div className="sb-user-card__info">
                <div className="sb-user-card__name">{nombreCompleto}</div>
                <div
                  className="sb-user-card__role"
                  style={{ color: accent, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <GoogleIcon name={roleIcon} size={14} color={accent} />
                  <span>{roleDisplayName}</span>
                </div>
              </div>
            )}
          </button>

          {!isCollapsed && (
            <button
              type="button"
              className="sb-user-card__logout-btn"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              <GoogleIcon name="logout" size={16} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
