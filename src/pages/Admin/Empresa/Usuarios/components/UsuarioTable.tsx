import type { UsuarioDto } from '../../../../../api/Dtos/Usuario';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  usuarios: UsuarioDto[];
  loading: boolean;
  onEdit: (usuario: UsuarioDto) => void;
  onDelete: (usuario: UsuarioDto) => void;
  onRestore: (usuario: UsuarioDto) => void;
}

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  'SysAdmin':                 { bg: 'rgba(79,154,255,0.12)', color: '#1a73e8' },
  'Administrador':            { bg: 'rgba(59,91,219,0.12)',  color: '#3b5bdb' },
  'Ejecutivo(a) Master Ventas':  { bg: 'rgba(14,165,233,0.12)', color: '#0284c7' },
  'Ejecutivo(a) Ventas':         { bg: 'rgba(6,182,212,0.12)',  color: '#0e7490' },
};

export default function UsuarioTable({ usuarios, loading, onEdit, onDelete, onRestore }: Props) {
  if (loading) {
    return (
      <div className="empresa-loading">
        <div className="spinner" />
        <span>Cargando usuarios...</span>
      </div>
    );
  }

  if (usuarios.length === 0) {
    return (
      <div className="empresa-empty">
        <GoogleIcon name="manage_accounts" size={48} color="#cbd5e1" />
        <p>No hay usuarios registrados.</p>
        <p>Haz clic en <strong>Nuevo Usuario</strong> para agregar acceso al sistema.</p>
      </div>
    );
  }

  return (
    <div className="empresa-table-wrapper">
      <table className="empresa-table" aria-label="Tabla de usuarios del sistema">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Rol</th>
            <th>Empleado vinculado</th>
            <th>Sede</th>
            <th>Estado</th>
            <th>Creado</th>
            <th aria-label="Acciones">—</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const rolStyle = ROL_COLORS[u.rolNombre ?? ''] ?? { bg: 'rgba(100,116,139,0.1)', color: '#475569' };
            return (
              <tr key={u.id} className={!u.activo ? 'inactivo' : ''}>
                <td>
                  <div className="td-nombre">{u.nombreCompleto}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{u.email}</div>
                </td>
                <td>
                  {u.rolNombre ? (
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: rolStyle.bg,
                      color: rolStyle.color,
                      border: `1px solid ${rolStyle.color}33`,
                    }}>
                      {u.rolNombre}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin rol</span>
                  )}
                </td>
                <td>
                  {u.empleadoNombreCompleto ? (
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.empleadoNombreCompleto}</div>
                      {u.empleadoDni && (
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {u.empleadoDni}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No vinculado</span>
                  )}
                </td>
                <td>
                  {u.sedeNombre ?? <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td>
                  {u.activo ? (
                    <span className="badge-activo">
                      <GoogleIcon name="check_circle" size={12} color="#16a34a" />
                      Activo
                    </span>
                  ) : (
                    <span className="badge-inactivo">
                      <GoogleIcon name="block" size={12} color="#dc2626" />
                      Bloqueado
                    </span>
                  )}
                </td>
                <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {new Date(u.fechaCreacion).toLocaleDateString('es-PE')}
                </td>
                <td>
                  <div className="empresa-row-actions">
                    <button
                      id={`btn-edit-user-${u.id}`}
                      className="btn-icon"
                      title="Editar usuario"
                      onClick={() => onEdit(u)}
                      aria-label={`Editar ${u.nombreCompleto}`}
                    >
                      <GoogleIcon name="edit" size={16} color="currentColor" />
                    </button>
                    {u.activo ? (
                      <button
                        id={`btn-block-user-${u.id}`}
                        className="btn-icon danger"
                        title="Deshabilitar usuario"
                        onClick={() => onDelete(u)}
                        aria-label={`Deshabilitar ${u.nombreCompleto}`}
                      >
                        <GoogleIcon name="block" size={16} color="currentColor" />
                      </button>
                    ) : (
                      <button
                        id={`btn-restore-user-${u.id}`}
                        className="btn-icon success"
                        title="Habilitar usuario"
                        onClick={() => onRestore(u)}
                        aria-label={`Habilitar ${u.nombreCompleto}`}
                      >
                        <GoogleIcon name="lock_open" size={16} color="currentColor" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
