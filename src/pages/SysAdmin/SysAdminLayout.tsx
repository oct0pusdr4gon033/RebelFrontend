import { useState, useEffect, useRef } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, type NavItem } from '../../components/Sidebar';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../DashboardLayout.css';
import './SysAdminTelemetry.css';

const ACCENT = '#4F9AFF';
const ACCENT_BG = 'rgba(79,154,255,0.1)';
const ACCENT_BORDER = 'rgba(79,154,255,0.28)';
const AVATAR_GRAD = 'linear-gradient(135deg, #4F9AFF, #1a73e8)';

export const sysAdminNavItems: NavItem[] = [
  { icon: 'dashboard', label: 'Dashboard & Telemetría', path: '/sysadmin', section: null },
  { icon: 'group', label: 'Usuarios', path: '/sysadmin/usuarios', section: 'Sistema' },
  { icon: 'vpn_key', label: 'Roles y Permisos', path: '/sysadmin/roles', section: null },
  { icon: 'domain', label: 'Sedes', path: '/sysadmin/sedes', section: null },
  { icon: 'bar_chart', label: 'Reportes Globales', path: '/sysadmin/reportes', section: 'Reportes' },
  { icon: 'monitoring', label: 'Auditoría', path: '/sysadmin/auditoria', section: null },
  { icon: 'settings', label: 'Configuración', path: '/sysadmin/configuracion', section: 'Sistema' },
  { icon: 'person', label: 'Mi Cuenta', path: '/sysadmin/mi-cuenta', section: 'Cuenta' },
];

/* ── Tipos de Telemetría ── */
export interface ServerLogItem {
  id: string;
  time: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}

export interface TelemetryMetrics {
  cpuUsage: number;
  ramUsedGb: number;
  ramTotalGb: number;
  apiLatencyMs: number;
  requestsPerMinute: number;
  dbPoolActive: number;
  dbPoolMax: number;
  dbLatencyMs: number;
  uptimePercent: number;
}

const INITIAL_LOGS: ServerLogItem[] = [
  {
    id: 'log-1',
    time: '00:01:02',
    level: 'INFO',
    source: 'Microsoft.Hosting.Lifetime',
    message: 'Now listening on: https://localhost:7010 (ASP.NET Core 8.0 Kestrel)',
  },
  {
    id: 'log-2',
    time: '00:01:03',
    level: 'INFO',
    source: 'Npgsql.Connection',
    message: 'Connection pool initialized. Connected to PostgreSQL 16.2 on port 5432 (SalesRebelDb).',
  },
  {
    id: 'log-3',
    time: '00:01:04',
    level: 'INFO',
    source: 'Microsoft.EntityFrameworkCore',
    message: 'Entity Framework Core 8.0 DbContext ready. All 4 migrations verified and up to date.',
  },
  {
    id: 'log-4',
    time: '00:01:12',
    level: 'INFO',
    source: 'AuthController',
    message: 'User admin@rebelqueen.com authenticated successfully. JWT Bearer token issued.',
  },
  {
    id: 'log-5',
    time: '00:02:18',
    level: 'INFO',
    source: 'TelemetryHeartbeat',
    message: 'System health probe passed. CPU: 27.2%, RAM: 42.8%, DB Latency: 2.3ms.',
  },
  {
    id: 'log-6',
    time: '00:03:05',
    level: 'WARN',
    source: 'SecurityMiddleware',
    message: 'CORS Preflight request origin http://localhost:5173 validated and cached.',
  },
  {
    id: 'log-7',
    time: '00:04:12',
    level: 'INFO',
    source: 'Npgsql.Command',
    message: 'Executed DbCommand (1.9ms) [SELECT "Id", "Name", "NormalizedName" FROM "AspNetRoles"]',
  },
  {
    id: 'log-8',
    time: '00:04:55',
    level: 'INFO',
    source: 'TelemetryCollector',
    message: 'PostgreSQL connection pool: 12 active, 88 idle, 0 waiting.',
  },
];

export function SysAdminDashboard() {
  const { empleado } = useAuth();

  const [metrics, setMetrics] = useState<TelemetryMetrics>({
    cpuUsage: 28.4,
    ramUsedGb: 3.42,
    ramTotalGb: 8.0,
    apiLatencyMs: 24,
    requestsPerMinute: 1420,
    dbPoolActive: 12,
    dbPoolMax: 100,
    dbLatencyMs: 2.8,
    uptimePercent: 99.98,
  });

  const [logs, setLogs] = useState<ServerLogItem[]>(INITIAL_LOGS);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLive, setIsLive] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastSync, setLastSync] = useState('Hace unos momentos');
  const [copied, setCopied] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      const newCpu = +(24 + Math.random() * 12).toFixed(1);
      const newRam = +(3.3 + Math.random() * 0.35).toFixed(2);
      const newLatency = Math.floor(20 + Math.random() * 10);
      const newActivePool = Math.floor(10 + Math.random() * 6);

      setMetrics((prev) => ({
        ...prev,
        cpuUsage: newCpu,
        ramUsedGb: newRam,
        apiLatencyMs: newLatency,
        dbPoolActive: newActivePool,
      }));

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      const randomHeartbeat: ServerLogItem = {
        id: `log-${Date.now()}`,
        time: timeStr,
        level: 'INFO',
        source: 'TelemetryService',
        message: `Heartbeat OK — CPU ${newCpu}%, RAM ${newRam}GB, Ping ${newLatency}ms, DB ${newActivePool} conex.`,
      };

      setLogs((prev) => [...prev.slice(-40), randomHeartbeat]);
      setLastSync(`Hoy a las ${timeStr}`);
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  const handleManualRefresh = () => {
    setIsSpinning(true);
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    setTimeout(() => {
      setMetrics((prev) => ({
        ...prev,
        cpuUsage: +(22 + Math.random() * 10).toFixed(1),
        ramUsedGb: +(3.35 + Math.random() * 0.2).toFixed(2),
        apiLatencyMs: Math.floor(18 + Math.random() * 8),
      }));

      const refreshLog: ServerLogItem = {
        id: `log-refresh-${Date.now()}`,
        time: timeStr,
        level: 'INFO',
        source: 'SysAdmin.Console',
        message: `Telemetría actualizada manualmente por ${empleado?.email ?? 'SysAdmin'}. Estado de servicios verificado.`,
      };

      setLogs((prev) => [...prev, refreshLog]);
      setLastSync(`Actualizado a las ${timeStr}`);
      setIsSpinning(false);
    }, 600);
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.level}] [${l.source}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = logs.filter((l) => {
    const matchesFilter = logFilter === 'ALL' || l.level === logFilter;
    const matchesSearch =
      searchTerm === '' ||
      l.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.source.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const ramPercentage = Math.round((metrics.ramUsedGb / metrics.ramTotalGb) * 100);

  return (
    <>
      {/* ── Bienvenida del SysAdmin ── */}
      <div
        className="dash__welcome"
        style={{
          background: 'linear-gradient(135deg, rgba(79,154,255,0.1), rgba(26,115,232,0.06))',
          border: `1.5px solid ${ACCENT_BORDER}`,
        }}
      >
        <div className="dash__welcome-tag" style={{ color: ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GoogleIcon name="verified_user" size={16} color={ACCENT} />
          <span>Panel de Monitoreo & Control de Servidor</span>
        </div>
        <h2>¡Bienvenido, {empleado?.nombres ?? 'SysAdmin'}!</h2>
        <p>
          Monitorea el rendimiento del servidor backend, salud de PostgreSQL, telemetría de recursos y registros de ejecución en tiempo real.
        </p>
      </div>

      {/* ── Aviso de Modo Plantilla / Próximos Endpoints ── */}
      <div className="telem-mock-alert">
        <div className="telem-mock-alert-left">
          <GoogleIcon name="monitoring" size={20} color="#2563eb" />
          <span>
            <strong>Plantilla de Telemetría Activa:</strong> Esta pantalla muestra datos y logs estructurados listos para vincularse cuando implementemos los endpoints en el backend de C# (ej. <code>GET /api/telemetry/metrics</code> y <code>GET /api/telemetry/logs</code>).
          </span>
        </div>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#3b82f6', whiteSpace: 'nowrap' }}>
          ASP.NET Core 8 &bull; EF Core
        </span>
      </div>

      {/* ── Barra de Control de Telemetría ── */}
      <div className="telem-header-status">
        <div className="telem-header-left">
          <div className="telem-pulse-dot" style={{ background: isLive ? '#10b981' : '#f59e0b' }} />
          <div>
            <span className="telem-status-title">
              {isLive ? 'Telemetría en Vivo' : 'Telemetría Pausada'}
            </span>
            <span className="telem-status-desc">
              &bull; Servidor: https://localhost:7010 &bull; {lastSync}
            </span>
          </div>
        </div>

        <div className="telem-header-controls">
          <button
            onClick={() => setIsLive(!isLive)}
            className="telem-btn-refresh"
            title={isLive ? 'Pausar actualización en vivo' : 'Reanudar actualización en vivo'}
          >
            <GoogleIcon name={isLive ? 'pause' : 'play_arrow'} size={16} color="#3b82f6" />
            <span>{isLive ? 'Pausar' : 'Reanudar'}</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className={`telem-btn-refresh ${isSpinning ? 'spinning' : ''}`}
            title="Refrescar métricas ahora"
          >
            <span className="telem-spin-icon" style={{ display: 'inline-flex' }}>
              <GoogleIcon name="refresh" size={16} color="#3b82f6" />
            </span>
            <span>Refrescar</span>
          </button>

          <span className="telem-badge-live">
            <span style={{ fontSize: '8px' }}>●</span> EN LÍNEA
          </span>
        </div>
      </div>

      {/* ── Fila 1: Métricas Principales de Servidor ── */}
      <p className="dash__section-title">Telemetría de Recursos del Servidor</p>
      <div className="telem-stats-grid">
        {/* CPU */}
        <div className="telem-card">
          <div className="telem-card-top">
            <div className="telem-icon-box" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <GoogleIcon name="speed" size={24} color="#3b82f6" />
            </div>
            <span
              className="telem-metric-tag"
              style={{
                background: metrics.cpuUsage < 60 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                color: metrics.cpuUsage < 60 ? '#059669' : '#d97706',
              }}
            >
              {metrics.cpuUsage < 60 ? 'Carga Normal' : 'Carga Alta'}
            </span>
          </div>
          <div className="telem-metric-value">{metrics.cpuUsage}%</div>
          <div className="telem-metric-label">Uso de CPU del Servidor</div>
          <div className="telem-progress-bg">
            <div
              className="telem-progress-fill"
              style={{
                width: `${metrics.cpuUsage}%`,
                background:
                  metrics.cpuUsage < 60
                    ? 'linear-gradient(90deg, #3b82f6, #06b6d4)'
                    : 'linear-gradient(90deg, #f59e0b, #ef4444)',
              }}
            />
          </div>
          <div className="telem-metric-meta">
            <span>4 Cores vCPU</span>
            <span>Thread Pool: 18 activos</span>
          </div>
        </div>

        {/* Memoria RAM */}
        <div className="telem-card">
          <div className="telem-card-top">
            <div className="telem-icon-box" style={{ background: 'rgba(6, 182, 212, 0.1)' }}>
              <GoogleIcon name="memory" size={24} color="#06b6d4" />
            </div>
            <span className="telem-metric-tag" style={{ background: 'rgba(6,182,212,0.1)', color: '#0891b2' }}>
              {ramPercentage}% asignado
            </span>
          </div>
          <div className="telem-metric-value">
            {metrics.ramUsedGb} <span style={{ fontSize: '18px', fontWeight: 600 }}>/ {metrics.ramTotalGb} GB</span>
          </div>
          <div className="telem-metric-label">Memoria RAM Utilizada</div>
          <div className="telem-progress-bg">
            <div
              className="telem-progress-fill"
              style={{
                width: `${ramPercentage}%`,
                background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
              }}
            />
          </div>
          <div className="telem-metric-meta">
            <span>GC Heap: 480 MB</span>
            <span>Gen 0/1/2 Estables</span>
          </div>
        </div>

        {/* Latencia API */}
        <div className="telem-card">
          <div className="telem-card-top">
            <div className="telem-icon-box" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
              <GoogleIcon name="trending_up" size={24} color="#10b981" />
            </div>
            <span className="telem-metric-tag" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
              Excelente
            </span>
          </div>
          <div className="telem-metric-value">{metrics.apiLatencyMs} ms</div>
          <div className="telem-metric-label">Latencia Promedio API</div>
          <div className="telem-progress-bg">
            <div
              className="telem-progress-fill"
              style={{
                width: `${Math.min(100, (metrics.apiLatencyMs / 100) * 100)}%`,
                background: 'linear-gradient(90deg, #10b981, #34d399)',
              }}
            />
          </div>
          <div className="telem-metric-meta">
            <span>P95: 42 ms</span>
            <span>HTTPS &bull; HTTP/2</span>
          </div>
        </div>

        {/* Uptime y Disponibilidad */}
        <div className="telem-card">
          <div className="telem-card-top">
            <div className="telem-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
              <GoogleIcon name="verified_user" size={24} color="#6366f1" />
            </div>
            <span className="telem-metric-tag" style={{ background: 'rgba(99,102,241,0.1)', color: '#4f46e5' }}>
              99.98% SLA
            </span>
          </div>
          <div className="telem-metric-value">{metrics.requestsPerMinute}</div>
          <div className="telem-metric-label">Peticiones por Minuto (RPM)</div>
          <div className="telem-progress-bg">
            <div
              className="telem-progress-fill"
              style={{
                width: '75%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }}
            />
          </div>
          <div className="telem-metric-meta">
            <span>Errores 5xx: 0.00%</span>
            <span>Activo hace 18 días</span>
          </div>
        </div>
      </div>

      {/* ── Fila 2: Estado de la Base de Datos y Servicios ── */}
      <p className="dash__section-title">Estado de la Base de Datos y Micro-servicios</p>
      <div className="telem-services-row">
        {/* Tarjeta de Base de Datos PostgreSQL */}
        <div className="telem-db-card">
          <div className="telem-db-header">
            <div className="telem-db-header-left">
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(79, 154, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GoogleIcon name="domain" size={22} color="#3b5bdb" />
              </div>
              <div>
                <strong>PostgreSQL 16.2 &bull; SalesRebelDb</strong>
                <span>Host: localhost:5432 &bull; Driver: Npgsql EF Core</span>
              </div>
            </div>

            <span className="telem-service-badge ok">
              <span>●</span> ONLINE
            </span>
          </div>

          <div className="telem-db-metrics">
            <div className="telem-db-stat">
              <div className="telem-db-stat-label">
                <GoogleIcon name="group" size={14} color="#64748b" />
                <span>Connection Pool</span>
              </div>
              <div className="telem-db-stat-value">
                {metrics.dbPoolActive} / {metrics.dbPoolMax}
              </div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>12% de ocupación</span>
            </div>

            <div className="telem-db-stat">
              <div className="telem-db-stat-label">
                <GoogleIcon name="speed" size={14} color="#64748b" />
                <span>Latencia de Consulta</span>
              </div>
              <div className="telem-db-stat-value">{metrics.dbLatencyMs} ms</div>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Óptima (avg)</span>
            </div>

            <div className="telem-db-stat">
              <div className="telem-db-stat-label">
                <GoogleIcon name="bar_chart" size={14} color="#64748b" />
                <span>Tamaño de la BD</span>
              </div>
              <div className="telem-db-stat-value">186.4 MB</div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Cache Hit: 99.2%</span>
            </div>

            <div className="telem-db-stat">
              <div className="telem-db-stat-label">
                <GoogleIcon name="check_circle" size={14} color="#64748b" />
                <span>Migraciones EF</span>
              </div>
              <div className="telem-db-stat-value" style={{ fontSize: '14px', color: '#059669' }}>
                Al día (4 aplicadas)
              </div>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Sin pendientes</span>
            </div>
          </div>
        </div>

        {/* Tarjeta de Servicios del Backend */}
        <div className="telem-microservices-card">
          <div className="telem-microservices-title">
            <span>Componentes del Sistema</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981' }}>Todos operativos</span>
          </div>

          <div className="telem-service-list">
            <div className="telem-service-item">
              <div className="telem-service-info">
                <GoogleIcon name="security" size={18} color="#4F9AFF" />
                <div>
                  <strong>ASP.NET Core Kestrel API</strong>
                  <div><span>https://localhost:7010</span></div>
                </div>
              </div>
              <span className="telem-service-badge ok">Activo</span>
            </div>

            <div className="telem-service-item">
              <div className="telem-service-info">
                <GoogleIcon name="vpn_key" size={18} color="#10b981" />
                <div>
                  <strong>ASP.NET Identity & JWT</strong>
                  <div><span>Autenticación y Roles</span></div>
                </div>
              </div>
              <span className="telem-service-badge ok">Operativo</span>
            </div>

            <div className="telem-service-item">
              <div className="telem-service-info">
                <GoogleIcon name="monitoring" size={18} color="#f59e0b" />
                <div>
                  <strong>CORS & Security Headers</strong>
                  <div><span>Permitido: localhost:5173</span></div>
                </div>
              </div>
              <span className="telem-service-badge ok">Protegido</span>
            </div>

            <div className="telem-service-item">
              <div className="telem-service-info">
                <GoogleIcon name="assignment" size={18} color="#8b5cf6" />
                <div>
                  <strong>Entity Framework Core 8</strong>
                  <div><span>Mapeo ORM y Contextos</span></div>
                </div>
              </div>
              <span className="telem-service-badge ok">Conectado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fila 3: Consola de Logs del Servidor en Tiempo Real ── */}
      <p className="dash__section-title">Consola de Logs del Servidor (Kestrel & Npgsql)</p>
      <div className="telem-logs-container">
        {/* Barra superior de la consola */}
        <div className="telem-logs-topbar">
          <div className="telem-logs-left">
            <div className="telem-term-dots">
              <div className="telem-term-dot red" />
              <div className="telem-term-dot yellow" />
              <div className="telem-term-dot green" />
            </div>
            <span className="telem-logs-title">
              <span>backend-stdout.log</span>
              <span className="telem-logs-count">{filteredLogs.length} eventos</span>
            </span>
          </div>

          <div className="telem-logs-actions">
            {/* Filtros de nivel */}
            {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLogFilter(lvl)}
                className={`telem-filter-btn ${logFilter === lvl ? 'active' : ''}`}
              >
                {lvl === 'ALL' ? 'TODOS' : lvl}
              </button>
            ))}

            {/* Búsqueda */}
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="telem-search-input"
            />

            {/* Copiar logs */}
            <button
              onClick={handleCopyLogs}
              className="telem-tool-btn"
              title="Copiar registros al portapapeles"
            >
              <GoogleIcon name={copied ? 'check' : 'content_copy'} size={15} color={copied ? '#10b981' : '#cbd5e1'} />
            </button>

            {/* Limpiar */}
            <button
              onClick={() => setLogs([])}
              className="telem-tool-btn"
              title="Limpiar consola"
            >
              <GoogleIcon name="close" size={15} color="#cbd5e1" />
            </button>
          </div>
        </div>

        {/* Cuerpo de los logs */}
        <div className="telem-logs-body">
          {filteredLogs.length === 0 ? (
            <div className="telem-logs-empty">
              No hay logs que coincidan con los filtros aplicados.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="telem-log-row">
                <span className="telem-log-time">{log.time}</span>
                <span className={`telem-log-badge ${log.level.toLowerCase()}`}>
                  {log.level}
                </span>
                <span className="telem-log-source">[{log.source}]</span>
                <span className="telem-log-msg">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* ── Fila 4: Acciones Rápidas del SysAdmin ── */}
      <p className="dash__section-title">Gestión del Sistema</p>
      <div className="dash__actions-grid">
        <Link to="/sysadmin/usuarios" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="person_add" size={24} color={ACCENT} />
            </div>
            <strong>Gestión de Usuarios</strong>
            <span>Crear y administrar accesos</span>
          </button>
        </Link>

        <Link to="/sysadmin/roles" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="security" size={24} color={ACCENT} />
            </div>
            <strong>Roles y Permisos</strong>
            <span>Configurar privilegios del sistema</span>
          </button>
        </Link>

        <Link to="/sysadmin/sedes" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="add_business" size={24} color={ACCENT} />
            </div>
            <strong>Sedes y Sucursales</strong>
            <span>Administrar ubicaciones</span>
          </button>
        </Link>

        <Link to="/sysadmin/auditoria" style={{ textDecoration: 'none' }}>
          <button className="dash__action-btn" style={{ borderColor: ACCENT_BORDER, width: '100%' }}>
            <div className="dash__action-btn-icon">
              <GoogleIcon name="assignment" size={24} color={ACCENT} />
            </div>
            <strong>Auditoría Global</strong>
            <span>Trazabilidad de cambios</span>
          </button>
        </Link>
      </div>
    </>
  );
}

export default function SysAdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dash">
      <Sidebar
        roleName="SysAdmin"
        roleDisplayName="SysAdmin"
        roleIcon="admin_panel_settings"
        accent={ACCENT}
        accentBg={ACCENT_BG}
        accentBorder={ACCENT_BORDER}
        avatarGrad={AVATAR_GRAD}
        basePath="/sysadmin"
        navItems={sysAdminNavItems}
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
            <span className="dash__header-title">Panel de Administración del Sistema & Telemetría</span>
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
              <GoogleIcon name="admin_panel_settings" size={16} color={ACCENT} />
              <span>SysAdmin</span>
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
