import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import LoginPage from './pages/Login';
import SysAdminLayout, { SysAdminDashboard } from './pages/SysAdmin';
import AdminLayout, { AdminDashboard } from './pages/Admin';
import MasterLayout, { MasterDashboard } from './pages/Master';
import { SupervisionMasterPage } from './pages/Master/SupervisionMasterPage';
import EjecutivaLayout, { EjecutivaDashboard } from './pages/Ejecutiva';
import GerenteLayout, { GerenteDashboard } from './pages/Gerente';
import MiCuentaPage from './pages/MiCuenta';
import RegistroOportunidadPage from './pages/Oportunidades';
import { SeguimientoOCView } from './pages/Oportunidades/SeguimientoOCView';
import { EmpresaLayout, SedesPage, EmpleadosPage, UsuariosPage } from './pages/Admin/Empresa';
import { ResolverOportunidadesPage } from './pages/Admin/ResolverOportunidades';
import { PagosPage } from './pages/Admin/Pagos';
import { AgendaContactosPage } from './pages/Contactos';
import RolesPage from './pages/SysAdmin/RolesPage';
import GlobalSessionGuard from './components/SessionModal/GlobalSessionGuard';
import {
  GerenteAsistenciasPage,
  HistorialMiAsistenciaPage,
  MiAsistenciaPage,
} from './pages/Asistencias';
import HorariosSedePage from './pages/Gerente/HorariosSedePage';
import ExcepcionesHorarioPage from './pages/Gerente/ExcepcionesHorarioPage';
import DiasNoLaborablesPage from './pages/Gerente/DiasNoLaborablesPage';
import MisSolicitudesPage from './pages/Solicitudes/MisSolicitudesPage';
import NuevaSolicitudPage from './pages/Solicitudes/NuevaSolicitudPage';
import DetalleSolicitudPage from './pages/Solicitudes/DetalleSolicitudPage';
import GerenteSolicitudesPage from './pages/Solicitudes/GerenteSolicitudesPage';
import GerenteDetalleSolicitudPage from './pages/Solicitudes/GerenteDetalleSolicitudPage';
import MisTicketsPage from './pages/Tickets/MisTicketsPage';
import NuevoTicketPage from './pages/Tickets/NuevoTicketPage';
import DetalleTicketPage from './pages/Tickets/DetalleTicketPage';
import TicketRoleRoute from './pages/Tickets/TicketRoleRoute';
import TecnicoRoute from './pages/Tickets/TecnicoRoute';
import SysAdminTicketsPage from './pages/Tickets/SysAdminTicketsPage';
import SysAdminDetalleTicketPage from './pages/Tickets/SysAdminDetalleTicketPage';
import {
  DashboardGlobalTickets,
  DashboardPersonalAsistencia,
  EstadisticasRoleRoute,
} from './pages/Estadisticas/DashboardsEstadisticas';

function MiCuentaRedirect() {
  const { empleado } = useAuth();
  const rol = empleado?.rolNombre?.trim().toLowerCase() ?? '';

  if (rol === 'gerente') return <Navigate to="/gerente/mi-cuenta" replace />;
  if (rol.includes('sysadmin')) return <Navigate to="/sysadmin/mi-cuenta" replace />;
  if (rol.includes('admin')) return <Navigate to="/admin/mi-cuenta" replace />;
  if (rol.includes('master')) return <Navigate to="/master/mi-cuenta" replace />;
  if (rol.includes('ejecutiv') || rol.includes('venta')) return <Navigate to="/ejecutiva/mi-cuenta" replace />;

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

          {/* Rutas GERENTE */}
          <Route
            path="/gerente"
            element={
              <PrivateRoute allowedRoles={['GERENTE']}>
                <GerenteLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<GerenteDashboard />} />
            <Route path="asistencias" element={<GerenteAsistenciasPage />} />
            <Route path="asistencias/horarios" element={<HorariosSedePage />} />
            <Route path="asistencias/excepciones" element={<ExcepcionesHorarioPage />} />
            <Route path="asistencias/dias-no-laborables" element={<DiasNoLaborablesPage />} />
            <Route path="solicitudes" element={<GerenteSolicitudesPage mode="pendientes" />} />
            <Route path="solicitudes/historial" element={<GerenteSolicitudesPage mode="historial" />} />
            <Route path="solicitudes/:id" element={<GerenteDetalleSolicitudPage />} />
            <Route
              path="mi-cuenta"
              element={
                <MiCuentaPage
                  defaultRole="GERENTE"
                  roleIcon="manage_accounts"
                  accentColor="#2563eb"
                />
              }
            />
            <Route
              path="tecnico/tickets"
              element={<TecnicoRoute fallbackPath="/gerente" />}
            >
              <Route
                index
                element={<SysAdminTicketsPage mode="tecnico" basePath="/gerente/tecnico/tickets" />}
              />
              <Route
                path=":id"
                element={<SysAdminDetalleTicketPage mode="tecnico" basePath="/gerente/tecnico/tickets" />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/gerente" replace />} />
          </Route>

          {/* Rutas SysAdmin */}
          <Route
            path="/sysadmin"
            element={
              <PrivateRoute allowedRoles={['SysAdmin']} exactRoles>
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
            <Route path="asistencias" element={<MiAsistenciaPage />} />
            <Route path="asistencias/historial" element={<HistorialMiAsistenciaPage />} />
            <Route
              path="estadisticas/asistencia"
              element={
                <EstadisticasRoleRoute roles={['SysAdmin']}>
                  <DashboardPersonalAsistencia />
                </EstadisticasRoleRoute>
              }
            />
            <Route path="tickets" element={<TicketRoleRoute roles={['SysAdmin']} />}>
              <Route index element={<SysAdminTicketsPage />} />
              <Route
                path="reportes"
                element={
                  <EstadisticasRoleRoute roles={['SysAdmin']}>
                    <DashboardGlobalTickets />
                  </EstadisticasRoleRoute>
                }
              />
              <Route path="mis-tickets" element={<MisTicketsPage basePath="/sysadmin" />} />
              <Route path="nuevo" element={<NuevoTicketPage basePath="/sysadmin" />} />
              <Route path=":id" element={<SysAdminDetalleTicketPage />} />
            </Route>
            <Route
              path="reportes"
              element={
                <EstadisticasRoleRoute roles={['SysAdmin']}>
                  <DashboardGlobalTickets />
                </EstadisticasRoleRoute>
              }
            />
            <Route
              path="tecnico/tickets"
              element={<TecnicoRoute fallbackPath="/sysadmin" />}
            >
              <Route
                index
                element={<SysAdminTicketsPage mode="tecnico" basePath="/sysadmin/tecnico/tickets" />}
              />
              <Route
                path=":id"
                element={<SysAdminDetalleTicketPage mode="tecnico" basePath="/sysadmin/tecnico/tickets" />}
              />
            </Route>
            <Route path="*" element={<Navigate to="/sysadmin" replace />} />
          </Route>

          {/* Rutas Administrador */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['Administrador']} exactRoles>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="asistencias" element={<MiAsistenciaPage />} />
            <Route path="asistencias/historial" element={<HistorialMiAsistenciaPage />} />
            <Route
              path="estadisticas/asistencia"
              element={
                <EstadisticasRoleRoute roles={['Administrador']}>
                  <DashboardPersonalAsistencia />
                </EstadisticasRoleRoute>
              }
            />
            <Route
              path="resolver-oportunidades"
              element={<ResolverOportunidadesPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc/registrar"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="pagos"
              element={<PagosPage roleAccent="#2563eb" />}
            />
            <Route
              path="agenda-contactos"
              element={<AgendaContactosPage roleAccent="#2563eb" />}
            />
            <Route path="tickets" element={<TicketRoleRoute roles={['Administrador']} />}>
              <Route index element={<MisTicketsPage basePath="/admin" />} />
              <Route path="nuevo" element={<NuevoTicketPage basePath="/admin" />} />
              <Route path=":id" element={<DetalleTicketPage basePath="/admin" />} />
            </Route>
            <Route
              path="tecnico/tickets"
              element={<TecnicoRoute fallbackPath="/admin" />}
            >
              <Route
                index
                element={<SysAdminTicketsPage mode="tecnico" basePath="/admin/tecnico/tickets" />}
              />
              <Route
                path=":id"
                element={<SysAdminDetalleTicketPage mode="tecnico" basePath="/admin/tecnico/tickets" />}
              />
            </Route>
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
              <PrivateRoute allowedRoles={['Ejecutivo(a) Master Ventas', 'Ejecutiva Master Ventas']} exactRoles>
                <MasterLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<MasterDashboard />} />
            <Route path="asistencias" element={<MiAsistenciaPage />} />
            <Route path="asistencias/historial" element={<HistorialMiAsistenciaPage />} />
            <Route
              path="estadisticas/asistencia"
              element={
                <EstadisticasRoleRoute roles={['Ejecutivo(a) Master Ventas', 'Ejecutiva Master Ventas']}>
                  <DashboardPersonalAsistencia />
                </EstadisticasRoleRoute>
              }
            />
            <Route path="solicitudes" element={<MisSolicitudesPage basePath="/master" />} />
            <Route path="solicitudes/nueva" element={<NuevaSolicitudPage basePath="/master" />} />
            <Route path="solicitudes/:id" element={<DetalleSolicitudPage basePath="/master" />} />
            <Route
              path="tickets"
              element={<TicketRoleRoute roles={['Ejecutivo(a) Master Ventas', 'Ejecutiva Master Ventas']} />}
            >
              <Route index element={<MisTicketsPage basePath="/master" />} />
              <Route path="nuevo" element={<NuevoTicketPage basePath="/master" />} />
              <Route path="dashboard" element={<Navigate to="/master/tickets" replace />} />
              <Route path=":id" element={<DetalleTicketPage basePath="/master" />} />
            </Route>
            <Route
              path="supervision"
              element={<SupervisionMasterPage roleAccent="#0284c7" />}
            />
            <Route
              path="registro-oportunidad"
              element={<RegistroOportunidadPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc/registrar"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="pagos"
              element={<PagosPage roleAccent="#2563eb" />}
            />
            <Route
              path="agenda-contactos"
              element={<AgendaContactosPage roleAccent="#2563eb" />}
            />
            <Route
              path="tecnico/tickets"
              element={<TecnicoRoute fallbackPath="/master" />}
            >
              <Route
                index
                element={<SysAdminTicketsPage mode="tecnico" basePath="/master/tecnico/tickets" />}
              />
              <Route
                path=":id"
                element={<SysAdminDetalleTicketPage mode="tecnico" basePath="/master/tecnico/tickets" />}
              />
            </Route>
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
              <PrivateRoute allowedRoles={['Ejecutivo(a) Ventas', 'Ejecutiva Ventas']} exactRoles>
                <EjecutivaLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<EjecutivaDashboard />} />
            <Route path="asistencias" element={<MiAsistenciaPage />} />
            <Route path="asistencias/historial" element={<HistorialMiAsistenciaPage />} />
            <Route
              path="estadisticas/asistencia"
              element={
                <EstadisticasRoleRoute roles={['Ejecutivo(a) Ventas', 'Ejecutiva Ventas']}>
                  <DashboardPersonalAsistencia />
                </EstadisticasRoleRoute>
              }
            />
            <Route path="solicitudes" element={<MisSolicitudesPage basePath="/ejecutiva" />} />
            <Route path="solicitudes/nueva" element={<NuevaSolicitudPage basePath="/ejecutiva" />} />
            <Route path="solicitudes/:id" element={<DetalleSolicitudPage basePath="/ejecutiva" />} />
            <Route
              path="tickets"
              element={<TicketRoleRoute roles={['Ejecutivo(a) Ventas', 'Ejecutiva Ventas']} />}
            >
              <Route index element={<MisTicketsPage basePath="/ejecutiva" />} />
              <Route path="nuevo" element={<NuevoTicketPage basePath="/ejecutiva" />} />
              <Route path="dashboard" element={<Navigate to="/ejecutiva/tickets" replace />} />
              <Route path=":id" element={<DetalleTicketPage basePath="/ejecutiva" />} />
            </Route>
            <Route
              path="registro-oportunidad"
              element={<RegistroOportunidadPage roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="seguimiento-oc/registrar"
              element={<SeguimientoOCView roleAccent="#2563eb" />}
            />
            <Route
              path="pagos"
              element={<PagosPage roleAccent="#2563eb" />}
            />
            <Route
              path="agenda-contactos"
              element={<AgendaContactosPage roleAccent="#2563eb" />}
            />
            <Route
              path="tecnico/tickets"
              element={<TecnicoRoute fallbackPath="/ejecutiva" />}
            >
              <Route
                index
                element={<SysAdminTicketsPage mode="tecnico" basePath="/ejecutiva/tecnico/tickets" />}
              />
              <Route
                path=":id"
                element={<SysAdminDetalleTicketPage mode="tecnico" basePath="/ejecutiva/tecnico/tickets" />}
              />
            </Route>
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
