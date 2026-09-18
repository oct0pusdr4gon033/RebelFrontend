import { useState, useEffect, useCallback } from 'react';
import type { EmpleadoDto } from '../../../../api/Dtos/Empleado';
import type { SedeDto } from '../../../../api/Dtos/Sede';
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
  restaurarEmpleado,
} from '../../../../api/services/empleado.service';
import { getSedes } from '../../../../api/services/sede.service';
import { GoogleIcon } from '../../../../components/GoogleIcon';
import EmpleadoTable from './components/EmpleadoTable';
import EmpleadoFormModal from './components/EmpleadoFormModal';
import '../EmpresaAdmin.css';

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<EmpleadoDto[]>([]);
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmpleadoDto | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmp, setConfirmEmp] = useState<EmpleadoDto | null>(null);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'restore'>('delete');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emps, sedesData] = await Promise.all([
        getEmpleados(mostrarInactivos),
        getSedes(false),
      ]);
      setEmpleados(emps);
      setSedes(sedesData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  }, [mostrarInactivos]);

  useEffect(() => { load(); }, [load]);

  const filtrados = empleados.filter((e) => {
    const q = busqueda.toLowerCase();
    return (
      e.nombreCompleto.toLowerCase().includes(q) ||
      e.dni.includes(q) ||
      e.cargo.toLowerCase().includes(q) ||
      (e.sedeNombre ?? '').toLowerCase().includes(q)
    );
  });

  const handleNew = () => { setEditingEmp(null); setModalOpen(true); };
  const handleEdit = (emp: EmpleadoDto) => { setEditingEmp(emp); setModalOpen(true); };

  const handleSave = async (data: Parameters<typeof createEmpleado>[0]) => {
    if (editingEmp) {
      await updateEmpleado(editingEmp.id, data);
    } else {
      await createEmpleado(data);
    }
    setModalOpen(false);
    await load();
  };

  const handleDeleteRequest = (emp: EmpleadoDto) => {
    setConfirmEmp(emp);
    setConfirmMode('delete');
    setConfirmOpen(true);
  };

  const handleRestoreRequest = (emp: EmpleadoDto) => {
    setConfirmEmp(emp);
    setConfirmMode('restore');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmEmp) return;
    setConfirmLoading(true);
    try {
      if (confirmMode === 'delete') {
        await deleteEmpleado(confirmEmp.id);
      } else {
        await restaurarEmpleado(confirmEmp.id);
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
          <h1>Empleados</h1>
          <p>Gestión del personal de la empresa</p>
        </div>
        <button id="btn-nuevo-empleado" className="btn-empresa-primary" onClick={handleNew}>
          <GoogleIcon name="person_add" size={18} color="#fff" />
          Nuevo Empleado
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
            id="search-empleados"
            type="search"
            placeholder="Buscar por nombre, DNI, cargo o sede..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <button
          id="btn-toggle-inactivos-emp"
          className={`empresa-toggle-filter${mostrarInactivos ? ' active' : ''}`}
          onClick={() => setMostrarInactivos((v) => !v)}
        >
          <GoogleIcon name="visibility" size={16} color="currentColor" />
          {mostrarInactivos ? 'Ocultando bajas' : 'Ver bajas'}
        </button>
      </div>

      <EmpleadoTable
        empleados={filtrados}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onRestore={handleRestoreRequest}
      />

      <EmpleadoFormModal
        open={modalOpen}
        empleado={editingEmp}
        sedes={sedes}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {confirmOpen && confirmEmp && (
        <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <div className="confirm-dialog-icon"
              style={{ background: confirmMode === 'delete' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
              <GoogleIcon
                name={confirmMode === 'delete' ? 'person_off' : 'person_add'}
                size={28}
                color={confirmMode === 'delete' ? '#dc2626' : '#16a34a'}
              />
            </div>
            <h3>{confirmMode === 'delete' ? 'Dar de baja empleado' : 'Restaurar empleado'}</h3>
            <p>
              {confirmMode === 'delete'
                ? `¿Deseas dar de baja a "${confirmEmp.nombreCompleto}"?`
                : `¿Deseas restaurar a "${confirmEmp.nombreCompleto}"?`}
            </p>
            <div className="confirm-dialog-actions">
              <button className="btn-cancel" onClick={() => setConfirmOpen(false)}>Cancelar</button>
              <button
                id="btn-confirm-emp-action"
                className={confirmMode === 'delete' ? 'btn-confirm-danger' : 'btn-confirm-success'}
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Procesando...' : confirmMode === 'delete' ? 'Dar de baja' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
