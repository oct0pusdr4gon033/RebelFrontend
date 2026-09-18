import { useState, useEffect, useCallback } from 'react';
import type { SedeDto } from '../../../../api/Dtos/Sede';
import {
  getSedes,
  createSede,
  updateSede,
  deleteSede,
  restaurarSede,
} from '../../../../api/services/sede.service';
import { GoogleIcon } from '../../../../components/GoogleIcon';
import SedeTable from './components/SedeTable';
import SedeFormModal from './components/SedeFormModal';
import '../../Empresa/EmpresaAdmin.css';

export default function SedesPage() {
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  // Modal estado
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSede, setEditingSede] = useState<SedeDto | null>(null);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSede, setConfirmSede] = useState<SedeDto | null>(null);
  const [confirmMode, setConfirmMode] = useState<'delete' | 'restore'>('delete');
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSedes(mostrarInactivas);
      setSedes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar sedes');
    } finally {
      setLoading(false);
    }
  }, [mostrarInactivas]);

  useEffect(() => { load(); }, [load]);

  const filtradas = sedes.filter((s) =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (s.ubicacion ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── CRUD handlers ──
  const handleNew = () => { setEditingSede(null); setModalOpen(true); };
  const handleEdit = (sede: SedeDto) => { setEditingSede(sede); setModalOpen(true); };

  const handleSave = async (data: Parameters<typeof createSede>[0]) => {
    if (editingSede) {
      await updateSede(editingSede.id, data);
    } else {
      await createSede(data);
    }
    setModalOpen(false);
    await load();
  };

  const handleDeleteRequest = (sede: SedeDto) => {
    setConfirmSede(sede);
    setConfirmMode('delete');
    setConfirmOpen(true);
  };

  const handleRestoreRequest = (sede: SedeDto) => {
    setConfirmSede(sede);
    setConfirmMode('restore');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmSede) return;
    setConfirmLoading(true);
    try {
      if (confirmMode === 'delete') {
        await deleteSede(confirmSede.id);
      } else {
        await restaurarSede(confirmSede.id);
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
      {/* Header */}
      <div className="empresa-header">
        <div className="empresa-header-left">
          <h1>Sedes</h1>
          <p>Gestión de sucursales y oficinas de la empresa</p>
        </div>
        <button id="btn-nueva-sede" className="btn-empresa-primary" onClick={handleNew}>
          <GoogleIcon name="add" size={18} color="#fff" />
          Nueva Sede
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="empresa-error">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="empresa-toolbar">
        <div className="empresa-search">
          <GoogleIcon name="search" size={18} color="#94a3b8" />
          <input
            id="search-sedes"
            type="search"
            placeholder="Buscar por nombre o ciudad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar sedes"
          />
        </div>
        <button
          id="btn-toggle-inactivas"
          className={`empresa-toggle-filter${mostrarInactivas ? ' active' : ''}`}
          onClick={() => setMostrarInactivas((v) => !v)}
        >
          <GoogleIcon name="visibility" size={16} color="currentColor" />
          {mostrarInactivas ? 'Ocultando inactivas' : 'Ver inactivas'}
        </button>
      </div>

      {/* Table */}
      <SedeTable
        sedes={filtradas}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        onRestore={handleRestoreRequest}
      />

      {/* Form Modal */}
      <SedeFormModal
        open={modalOpen}
        sede={editingSede}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Confirm Dialog */}
      {confirmOpen && confirmSede && (
        <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
          <div className="confirm-dialog">
            <div className="confirm-dialog-icon"
              style={{ background: confirmMode === 'delete' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)' }}>
              <GoogleIcon
                name={confirmMode === 'delete' ? 'do_not_disturb_on' : 'restore'}
                size={28}
                color={confirmMode === 'delete' ? '#dc2626' : '#16a34a'}
              />
            </div>
            <h3>{confirmMode === 'delete' ? 'Dar de baja sede' : 'Restaurar sede'}</h3>
            <p>
              {confirmMode === 'delete'
                ? `¿Deseas desactivar la sede "${confirmSede.nombre}"? Puedes restaurarla después.`
                : `¿Deseas restaurar la sede "${confirmSede.nombre}"?`}
            </p>
            <div className="confirm-dialog-actions">
              <button id="btn-confirm-cancel" className="btn-cancel" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </button>
              <button
                id="btn-confirm-action"
                className={confirmMode === 'delete' ? 'btn-confirm-danger' : 'btn-confirm-success'}
                onClick={handleConfirm}
                disabled={confirmLoading}
              >
                {confirmLoading ? 'Procesando...' : confirmMode === 'delete' ? 'Desactivar' : 'Restaurar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
