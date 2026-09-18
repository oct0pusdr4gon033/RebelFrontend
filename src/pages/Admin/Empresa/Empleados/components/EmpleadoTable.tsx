import type { EmpleadoDto } from '../../../../../api/Dtos/Empleado';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  empleados: EmpleadoDto[];
  loading: boolean;
  onEdit: (empleado: EmpleadoDto) => void;
  onDelete: (empleado: EmpleadoDto) => void;
  onRestore: (empleado: EmpleadoDto) => void;
}

export default function EmpleadoTable({ empleados, loading, onEdit, onDelete, onRestore }: Props) {
  if (loading) {
    return (
      <div className="empresa-loading">
        <div className="spinner" />
        <span>Cargando empleados...</span>
      </div>
    );
  }

  if (empleados.length === 0) {
    return (
      <div className="empresa-empty">
        <GoogleIcon name="badge" size={48} color="#cbd5e1" />
        <p>No hay empleados registrados.</p>
        <p>Haz clic en <strong>Nuevo Empleado</strong> para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="empresa-table-wrapper">
      <table className="empresa-table" aria-label="Tabla de empleados">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>DNI</th>
            <th>Cargo</th>
            <th>Sede</th>
            <th>Contacto</th>
            <th>Usuario</th>
            <th>Estado</th>
            <th aria-label="Acciones">—</th>
          </tr>
        </thead>
        <tbody>
          {empleados.map((emp) => (
            <tr key={emp.id} className={!emp.activo ? 'inactivo' : ''}>
              <td className="td-nombre">
                <div style={{ fontWeight: 600 }}>{emp.nombreCompleto}</div>
                {emp.fechaIngreso && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Ingresó: {new Date(emp.fechaIngreso).toLocaleDateString('es-PE')}
                  </div>
                )}
              </td>
              <td>
                <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{emp.dni}</span>
              </td>
              <td>{emp.cargo}</td>
              <td>
                {emp.sedeNombre ? (
                  <div>
                    <div style={{ fontWeight: 500 }}>{emp.sedeNombre}</div>
                    {emp.sedeUbicacion && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{emp.sedeUbicacion}</div>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Sin sede</span>
                )}
              </td>
              <td>
                <div style={{ fontSize: '0.8rem' }}>
                  {emp.email && <div>{emp.email}</div>}
                  {emp.telefono && <div style={{ color: '#64748b' }}>{emp.telefono}</div>}
                  {!emp.email && !emp.telefono && <span style={{ color: '#94a3b8' }}>—</span>}
                </div>
              </td>
              <td>
                {emp.userEmail ? (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{emp.userEmail}</div>
                    {emp.rolNombre && (
                      <span style={{
                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px',
                        background: 'rgba(59,91,219,0.1)', color: '#3b5bdb', fontWeight: 600
                      }}>
                        {emp.rolNombre}
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Sin usuario</span>
                )}
              </td>
              <td>
                {emp.activo ? (
                  <span className="badge-activo">
                    <GoogleIcon name="check_circle" size={12} color="#16a34a" />
                    Activo
                  </span>
                ) : (
                  <span className="badge-inactivo">
                    <GoogleIcon name="cancel" size={12} color="#dc2626" />
                    Baja
                  </span>
                )}
              </td>
              <td>
                <div className="empresa-row-actions">
                  <button
                    id={`btn-edit-emp-${emp.id}`}
                    className="btn-icon"
                    title="Editar empleado"
                    onClick={() => onEdit(emp)}
                    aria-label={`Editar ${emp.nombreCompleto}`}
                  >
                    <GoogleIcon name="edit" size={16} color="currentColor" />
                  </button>
                  {emp.activo ? (
                    <button
                      id={`btn-delete-emp-${emp.id}`}
                      className="btn-icon danger"
                      title="Dar de baja"
                      onClick={() => onDelete(emp)}
                      aria-label={`Dar de baja ${emp.nombreCompleto}`}
                    >
                      <GoogleIcon name="person_off" size={16} color="currentColor" />
                    </button>
                  ) : (
                    <button
                      id={`btn-restore-emp-${emp.id}`}
                      className="btn-icon success"
                      title="Restaurar empleado"
                      onClick={() => onRestore(emp)}
                      aria-label={`Restaurar ${emp.nombreCompleto}`}
                    >
                      <GoogleIcon name="person_add" size={16} color="currentColor" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
