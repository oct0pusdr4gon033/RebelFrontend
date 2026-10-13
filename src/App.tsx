import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import LoginPage from './pages/Login';
import SysAdminLayout, { SysAdminDashboard } from './pages/SysAdmin';
import AdminLayout, { AdminDashboard } from './pages/Admin';
import MasterLayout, { MasterDashboard } from './pages/Master';
import EjecutivaLayout, { EjecutivaDashboard } from './pages/Ejecutiva';
import MiCuentaPage from './pages/MiCuenta';
import RegistroOportunidadPage from './pages/Oportunidades';
import { SeguimientoOCView } from './pages/Oportunidades/SeguimientoOCView';
import { EmpresaLayout, SedesPage, EmpleadosPage, UsuariosPage } from './pages/Admin/Empresa';
import { ResolverOportunidadesPage } from './pages/Admin/ResolverOportunidades';
import { PagosPage } from './pages/Admin/Pagos';
import RolesPage from './pages/SysAdmin/RolesPage';
import GlobalSessionGuard from './components/SessionModal/GlobalSessionGuard';

function MiCuentaRedirect() {
  const { empleado } = useAuth();
  const rol = empleado?.rolNombre;

  if (rol === 'SysAdmin') return <Navigate to="/sysadmin/mi-cuenta" replace />;
  if (rol === 'Administrador') return <Navigate to="/admin/mi-cuenta" replace />;
  if (rol === 'Ejecutivo(a) Master Ventas') return <Navigate to="/master/mi-cuenta" replace />;
  if (rol === 'Ejecutivo(a) Ventas') return <Navigate to="/ejecutiva/mi-cuenta" replace />;

  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalSessionGuard />
        <Routes>

          {/* Ruta raíz → login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Login público */}
          <Route path="/login" element={<LoginPage />} />

          {/* Redirección directa para /mi-cuenta */}
          <Route path="/mi-cuenta" element={<MiCuentaRedirect />} />

          {/* Rutas SysAdmin */}
          <Route
            path="/sysadmin"
            element={
              <PrivateRoute allowedRoles={['SysAdmin']}>
                <SysAdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<SysAdminDashboard />} />
            <Route
              path="mi-cuenta"
              element={
                <MiCuentaPage
                  defaultRole="SysAdmin"
                  roleIcon="admin_panel_settings"
                  accentColor="#2563eb"
                />
              }
            />
            {/* ── Rutas del sidebar ── */}
            <Route path="roles" element={<RolesPage />} />
            <Route path="sedes" element={<SedesPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="pagos" element={<PagosPage roleAccent="#2563eb" />} />
            <Route path="*" element={<Navigate to="/sysadmin" replace />} />
          </Route>

          {/* Rutas Administrador */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['Administrador']}>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route
              path="resolver-oportunidades"
              element={<ResolverOportunidadesPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="pagos"
              element={<PagosPage roleAccent="#2563eb" />}
            />
            <Route
              path="mi-cuenta"
              element={
                <MiCuentaPage
                  defaultRole="Administrador"
                  roleIcon="shield_person"
                  accentColor="#2563eb"
                />
              }
            />

            {/* Módulo Administración de Empresa */}
            <Route path="empresa" element={<EmpresaLayout />}>
              <Route index element={<Navigate to="sedes" replace />} />
              <Route path="sedes" element={<SedesPage />} />
              <Route path="empleados" element={<EmpleadosPage />} />
              <Route path="usuarios" element={<UsuariosPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* Rutas Ejecutiva Master Ventas */}
          <Route
            path="/master"
            element={
              <PrivateRoute allowedRoles={['Ejecutivo(a) Master Ventas']}>
                <MasterLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<MasterDashboard />} />
            <Route
              path="registro-oportunidad"
              element={<RegistroOportunidadPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="mi-cuenta"
              element={
                <MiCuentaPage
                  defaultRole="Ejecutivo(a) Master Ventas"
                  roleIcon="star"
                  accentColor="#2563eb"
                />
              }
            />
            <Route path="*" element={<Navigate to="/master" replace />} />
          </Route>

          {/* Rutas Ejecutiva Ventas */}
          <Route
            path="/ejecutiva"
            element={
              <PrivateRoute allowedRoles={['Ejecutivo(a) Ventas']}>
                <EjecutivaLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<EjecutivaDashboard />} />
            <Route
              path="registro-oportunidad"
              element={<RegistroOportunidadPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="mi-cuenta"
              element={
                <MiCuentaPage
                  defaultRole="Ejecutivo(a) Ventas"
                  roleIcon="work"
                  accentColor="#2563eb"
                />
              }
            />
            <Route path="*" element={<Navigate to="/ejecutiva" replace />} />
          </Route>

          {/* Fallback general */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
