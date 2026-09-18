import { useState, useEffect, useCallback } from 'react';
import type { UsuarioDto, CrearUsuarioRequest, ActualizarUsuarioRequest, RolDto } from '../../../../api/Dtos/Usuario';
import type { EmpleadoDto } from '../../../../api/Dtos/Empleado';
import type { SedeDto } from '../../../../api/Dtos/Sede';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  restaurarUsuario,
  getRoles,
} from '../../../../api/services/usuario.service';
import { getEmpleados } from '../../../../api/services/empleado.service';
import { getSedes } from '../../../../api/services/sede.service';
import { GoogleIcon } from '../../../../components/GoogleIcon';
import UsuarioTable from './components/UsuarioTable';
import UsuarioFormModal from './components/UsuarioFormModal';
import '../EmpresaAdmin.css';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([]);
  const [empleados, setEmpleados] = useState<EmpleadoDto[]>([]);
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [roles, setRoles] = useState<RolDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioDto | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmUser, setConfirmUser] = useState<UsuarioDto | null>(null);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'restore'>('delete');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usrs, emps, sds, rols] = await Promise.all([
        getUsuarios(mostrarInactivos),
        getEmpleados(false),
        getSedes(false),
        getRoles(),
      ]);
      setUsuarios(usrs);
      setEmpleados(emps);
      setSedes(sds);
      setRoles(rols);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [mostrarInactivos]);

  useEffect(() => { load(); }, [load]);

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nombreCompleto.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.rolNombre ?? '').toLowerCase().includes(q) ||
      (u.sedeNombre ?? '').toLowerCase().includes(q) ||
      (u.empleadoNombreCompleto ?? '').toLowerCase().includes(q)
    );
  });

  const handleNew = () => { setEditingUser(null); setModalOpen(true); };
  const handleEdit = (u: UsuarioDto) => { setEditingUser(u); setModalOpen(true); };

  const handleSave = async (data: CrearUsuarioRequest | ActualizarUsuarioRequest) => {
    if (editingUser) {
      await updateUsuario(editingUser.id, data as ActualizarUsuarioRequest);
    } else {
      await createUsuario(data as CrearUsuarioRequest);
    }
    setModalOpen(false);
    await load();
  };

  const handleDeleteRequest = (u: UsuarioDto) => {
    setConfirmUser(u); setConfirmMode('delete'); setConfirmOpen(true);
  };
  const handleRestoreRequest = (u: UsuarioDto) => {
    setConfirmUser(u); setConfirmMode('restore'); setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmUser) return;
    setConfirmLoading(true);
    try {
      if (confirmMode === 'delete') {
        await deleteUsuario(confirmUser.id);
      } else {
        await restaurarUsuario(confirmUser.id);
      }
      setConfirmOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la acción');
      setConfirmOpen(false);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="empresa-page">
      <div className="empresa-header">
        <div className="empresa-header-left">
          <h1>Usuarios del Sistema</h1>
          <p>Gestión de acceso, roles y asignación de sedes</p>
        </div>
        <button id="btn-nuevo-usuario" className="btn-empresa-primary" onClick={handleNew}>
          <GoogleIcon name="person_add_alt" size={18} color="#fff" />
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="empresa-error">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      <div className="empresa-toolbar">
        <div className="empresa-search">
          <GoogleIcon name="search" size={18} color="#94a3b8" />
          <input
            id="search-usuarios"
            type="search"
            placeholder="Buscar por nombre, email, rol o sede..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button
          id="btn-toggle-inactivos-usr"
          className={`empresa-toggle-filter${mostrarInactivos ? ' active' : ''}`}
          onClick={() => setMostrarInactivos((v) => !v)}
        >
          <GoogleIcon name="visibility" size={16} color="currentColor" />
          {mostrarInactivos ? 'Ocultando bloqueados' : 'Ver bloqueados'}
        </button>
      </div>

      <UsuarioTable
        usuarios={filtrados}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onRestore={handleRestoreRequest}
      />

      <UsuarioFormModal
        open={modalOpen}
        usuario={editingUser}
        roles={roles}
        empleados={empleados}
        sedes={sedes}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {confirmOpen && confirmUser && (
        <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <div className="confirm-dialog-icon"
              style={{ background: confirmMode === 'delete' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
              <GoogleIcon
                name={confirmMode === 'delete' ? 'block' : 'lock_open'}
                size={28}
                color={confirmMode === 'delete' ? '#dc2626' : '#16a34a'}
              />
            </div>
            <h3>{confirmMode === 'delete' ? 'Deshabilitar usuario' : 'Habilitar usuario'}</h3>
            <p>
              {confirmMode === 'delete'
                ? `¿Deseas deshabilitar el acceso de "${confirmUser.nombreCompleto}"?`
                : `¿Deseas habilitar el acceso de "${confirmUser.nombreCompleto}"?`}
            </p>
            <div className="confirm-dialog-actions">
              <button className="btn-cancel" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button
                id="btn-confirm-usr-action"
                className={confirmMode === 'delete' ? 'btn-confirm-danger' : 'btn-confirm-success'}
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Procesando...' : confirmMode === 'delete' ? 'Deshabilitar' : 'Habilitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
