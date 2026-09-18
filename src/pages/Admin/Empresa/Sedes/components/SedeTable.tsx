import type { SedeDto } from '../../../../../api/Dtos/Sede';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  sedes: SedeDto[];
  loading: boolean;
  onEdit: (sede: SedeDto) => void;
  onDelete: (sede: SedeDto) => void;
  onRestore: (sede: SedeDto) => void;
}

export default function SedeTable({ sedes, loading, onEdit, onDelete, onRestore }: Props) {
  if (loading) {
    return (
      <div className="empresa-loading">
        <div className="spinner" />
        <span>Cargando sedes...</span>
      </div>
    );
  }

  if (sedes.length === 0) {
    return (
      <div className="empresa-empty">
        <GoogleIcon name="domain" size={48} color="#cbd5e1" />
        <p>No hay sedes registradas.</p>
        <p>Haz clic en <strong>Nueva Sede</strong> para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="empresa-table-wrapper">
      <table className="empresa-table" aria-label="Tabla de sedes">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Ubicación</th>
            <th>Dirección</th>
            <th>Teléfono</th>
            <th>Empleados</th>
            <th>Estado</th>
            <th aria-label="Acciones">—</th>
          </tr>
        </thead>
        <tbody>
          {sedes.map((sede) => (
            <tr key={sede.id} className={!sede.activo ? 'inactivo' : ''}>
              <td className="td-nombre">{sede.nombre}</td>
              <td>{sede.ubicacion ?? <span style={{ color: '#94a3b8' }}>—</span>}</td>
              <td>{sede.direccion ?? <span style={{ color: '#94a3b8' }}>—</span>}</td>
              <td>{sede.telefono ?? <span style={{ color: '#94a3b8' }}>—</span>}</td>
              <td>
                <span style={{ fontWeight: 600 }}>{sede.totalEmpleados}</span>
              </td>
              <td>
                {sede.activo ? (
                  <span className="badge-activo">
                    <GoogleIcon name="check_circle" size={12} color="#16a34a" />
                    Activa
                  </span>
                ) : (
                  <span className="badge-inactivo">
                    <GoogleIcon name="cancel" size={12} color="#dc2626" />
                    Inactiva
                  </span>
                )}
              </td>
              <td>
                <div className="empresa-row-actions">
                  <button
                    id={`btn-edit-sede-${sede.id}`}
                    className="btn-icon"
                    title="Editar sede"
                    onClick={() => onEdit(sede)}
                    aria-label={`Editar ${sede.nombre}`}
                  >
                    <GoogleIcon name="edit" size={16} color="currentColor" />
                  </button>
                  {sede.activo ? (
                    <button
                      id={`btn-delete-sede-${sede.id}`}
                      className="btn-icon danger"
                      title="Dar de baja (soft-delete)"
                      onClick={() => onDelete(sede)}
                      aria-label={`Dar de baja ${sede.nombre}`}
                    >
                      <GoogleIcon name="do_not_disturb_on" size={16} color="currentColor" />
                    </button>
                  ) : (
                    <button
                      id={`btn-restore-sede-${sede.id}`}
                      className="btn-icon success"
                      title="Restaurar sede"
                      onClick={() => onRestore(sede)}
                      aria-label={`Restaurar ${sede.nombre}`}
                    >
                      <GoogleIcon name="restore" size={16} color="currentColor" />
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
