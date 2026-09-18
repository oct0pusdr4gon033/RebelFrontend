import { NavLink, Outlet } from 'react-router-dom';
import { GoogleIcon } from '../../../components/GoogleIcon';
import './EmpresaAdmin.css';

const ACCENT = '#3b5bdb';

const TABS = [
  { icon: 'domain', label: 'Sedes',    path: 'sedes' },
  { icon: 'badge',  label: 'Empleados', path: 'empleados' },
  { icon: 'manage_accounts', label: 'Usuarios del Sistema', path: 'usuarios' },
];

export default function EmpresaLayout() {
  return (
    <div>
      {/* Module header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59,91,219,0.08), rgba(30,64,175,0.04))',
        border: '1.5px solid rgba(59,91,219,0.2)',
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '10px',
          background: 'rgba(59,91,219,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <GoogleIcon name="business" size={24} color={ACCENT} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0a2540' }}>
            Administración de Empresa
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Gestiona sedes, empleados y accesos del sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <nav
        role="tablist"
        aria-label="Módulos de administración de empresa"
        style={{
          display: 'flex',
          gap: '4px',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '24px',
        }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            role="tab"
            id={`tab-empresa-${tab.path}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 16px',
              borderRadius: '9px',
              textDecoration: 'none',
              fontSize: '0.855rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? ACCENT : '#64748b',
              background: isActive ? '#fff' : 'transparent',
              boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s',
              flex: 1,
              justifyContent: 'center',
              whiteSpace: 'nowrap',
            })}
          >
            <GoogleIcon name={tab.icon} size={16} color="currentColor" />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}
