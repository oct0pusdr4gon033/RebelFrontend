import { useState, useEffect, useCallback } from 'react';
import type { RolDto } from '../../api/Dtos/Usuario';
import { getRoles } from '../../api/services/usuario.service';
import { getAuthHeaders } from '../../api/services/oportunidades.service';
import { GoogleIcon } from '../../components/GoogleIcon';
import '../Admin/Empresa/EmpresaAdmin.css';

import { API_BASE } from '../../env/envoviment';

// ── DTOs locales para la UI ───────────────────────────────────────────────────
interface RolDetalleDto extends RolDto {
  totalUsuarios?: number;
}

interface CrearRolRequest {
  nombre: string;
  descripcion?: string;
}

// ── Privilegios por rol (estático — en producción vendría del backend) ─────────
const ROL_PRIVILEGIOS: Record<string, string[]> = {
  SysAdmin: [
    'Acceso total al sistema',
    'Gestión de usuarios y roles',
    'Configuración global',
    'Auditoría y telemetría',
    'Gestión de sedes',
  ],
  Administrador: [
    'Gestión de empleados de su área',
    'Gestión de sedes asignadas',
    'Ver reportes del área',
    'Administrar acuerdos marco',
  ],
  'Ejecutivo(a) Master Ventas': [
    'Registrar y editar oportunidades',
    'Ver oportunidades del equipo',
    'Asignar oportunidades',
    'Ver reportes del equipo',
  ],
  'Ejecutivo(a) Ventas': [
    'Registrar oportunidades propias',
    'Editar sus oportunidades',
    'Ver reportes personales',
  ],
};

const ROL_ACCENT: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  SysAdmin: {
    color: '#1a73e8',
    bg: 'rgba(79,154,255,0.1)',
    border: 'rgba(79,154,255,0.25)',
    icon: 'admin_panel_settings',
  },
  Administrador: {
    color: '#3b5bdb',
    bg: 'rgba(59,91,219,0.1)',
    border: 'rgba(59,91,219,0.25)',
    icon: 'shield_person',
  },
  'Ejecutivo(a) Master Ventas': {
    color: '#0284c7',
    bg: 'rgba(14,165,233,0.1)',
    border: 'rgba(14,165,233,0.25)',
    icon: 'star',
  },
  'Ejecutivo(a) Ventas': {
    color: '#0e7490',
    bg: 'rgba(6,182,212,0.1)',
    border: 'rgba(6,182,212,0.25)',
    icon: 'work',
  },
};

const DEFAULT_ACCENT = { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', icon: 'group' };

// ── Crear / editar rol via API ────────────────────────────────────────────────
async function createRolApi(data: CrearRolRequest): Promise<RolDto> {
  const res = await fetch(`${API_BASE}/api/usuarios/roles`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name: data.nombre, descripcion: data.descripcion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ mensaje: 'Error al crear rol' }));
    throw new Error(err.mensaje ?? 'Error al crear rol');
  }
  return res.json();
}

// ── RolFormModal ──────────────────────────────────────────────────────────────
function RolFormModal({
  open,
  rol,
  onClose,
  onSave,
}: {
  open: boolean;
  rol?: RolDto | null;
  onClose: () => void;
  onSave: (data: CrearRolRequest) => Promise<void>;
}) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nombreError, setNombreError] = useState('');

  useEffect(() => {
    if (open) {
      setError(null);
      setNombreError('');
      setNombre(rol?.nombre ?? '');
      setDescripcion(rol?.descripcion ?? '');
    }
  }, [open, rol]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setNombreError('El nombre del rol es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({ nombre: nombre.trim(), descripcion: descripcion.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
      <div className="empresa-modal" style={{ maxWidth: 460 }}>
        <div className="empresa-modal-header">
          <h2>
            <GoogleIcon name="vpn_key" size={20} color="#4F9AFF" />
            {rol ? 'Editar Rol' : 'Nuevo Rol'}
          </h2>
          <button id="btn-close-rol-modal" className="btn-modal-close" onClick={onClose}>
            <GoogleIcon name="close" size={18} color="currentColor" />
          </button>
        </div>

        {error && (
          <div className="empresa-error" style={{ marginBottom: 16 }}>
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        <form id="form-rol" className="empresa-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="rol-nombre">Nombre del Rol <span className="required">*</span></label>
            <input
              id="rol-nombre"
              className={`form-control${nombreError ? ' error' : ''}`}
              type="text"
              placeholder="Ej: Coordinador Regional"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setNombreError(''); }}
              autoFocus
            />
            {nombreError && <span className="form-error">{nombreError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="rol-descripcion">Descripción</label>
            <input
              id="rol-descripcion"
              className="form-control"
              type="text"
              placeholder="Describe brevemente las responsabilidades del rol"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'rgba(79,154,255,0.06)',
            border: '1px solid rgba(79,154,255,0.2)',
            borderRadius: '9px',
            fontSize: '0.8rem',
            color: '#64748b',
          }}>
            <strong style={{ color: '#1a73e8' }}>ℹ️ Nota:</strong> Los permisos específicos se configuran mediante políticas en el backend (.NET Identity). El nombre del rol debe coincidir exactamente con el usado en los controladores.
          </div>

          <div className="empresa-modal-footer">
            <button id="btn-cancel-rol" type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              id="btn-submit-rol"
              type="submit"
              className="btn-submit"
              style={{ background: '#1a73e8' }}
              disabled={saving}
            >
              {saving
                ? <><div className="spinner" style={{ width: 16, height: 16 }} />Guardando...</>
                : <><GoogleIcon name="save" size={16} color="#fff" />{rol ? 'Actualizar' : 'Crear Rol'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function RolesPage() {
  const [roles, setRoles] = useState<RolDetalleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [selectedRol, setSelectedRol] = useState<RolDetalleDto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRol, setEditingRol] = useState<RolDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRoles(data);
      if (data.length > 0 && !selectedRol) setSelectedRol(data[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar roles');
    } finally {
      setLoading(false);
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const filtrados = roles.filter((r) =>
    r.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (r.descripcion ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSaveRol = async (data: CrearRolRequest) => {
    await createRolApi(data);
    setModalOpen(false);
    await load();
  };

  return (
    <div className="empresa-page">
      {/* Header */}
      <div className="empresa-header">
        <div className="empresa-header-left">
          <h1>Roles y Permisos</h1>
          <p>Configuración de roles del sistema y sus privilegios de acceso</p>
        </div>
        <button
          id="btn-nuevo-rol"
          className="btn-empresa-primary"
          style={{ background: '#1a73e8' }}
          onClick={() => { setEditingRol(null); setModalOpen(true); }}
        >
          <GoogleIcon name="add" size={18} color="#fff" />
          Nuevo Rol
        </button>
      </div>

      {error && (
        <div className="empresa-error">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      {/* Layout de dos columnas: lista + detalle */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Lista de roles ── */}
        <div style={{
          background: '#fff',
          borderRadius: 14,
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          {/* Buscador */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}>
            <div className="empresa-search" style={{ minWidth: 'unset', flex: 'unset' }}>
              <GoogleIcon name="search" size={16} color="#94a3b8" />
              <input
                id="search-roles"
                type="search"
                placeholder="Buscar rol..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar roles"
              />
            </div>
          </div>

          {loading ? (
            <div className="empresa-loading" style={{ padding: '40px 20px' }}>
              <div className="spinner" />
              <span>Cargando...</span>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="empresa-empty" style={{ padding: '40px 16px' }}>
              <GoogleIcon name="vpn_key" size={36} color="#cbd5e1" />
              <p>Sin roles encontrados</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {filtrados.map((rol) => {
                const style = ROL_ACCENT[rol.nombre] ?? DEFAULT_ACCENT;
                const isActive = selectedRol?.id === rol.id;
                return (
                  <li
                    key={rol.id}
                    id={`rol-item-${rol.id}`}
                    onClick={() => setSelectedRol(rol)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 16px',
                      cursor: 'pointer',
                      background: isActive ? style.bg : 'transparent',
                      borderLeft: isActive ? `3px solid ${style.color}` : '3px solid transparent',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: style.bg, border: `1.5px solid ${style.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GoogleIcon name={style.icon} size={18} color={style.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '0.875rem',
                        color: isActive ? style.color : '#0a2540',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {rol.nombre}
                      </div>
                      {rol.descripcion && (
                        <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: 1 }}>
                          {rol.descripcion}
                        </div>
                      )}
                    </div>
                    {isActive && <GoogleIcon name="chevron_right" size={16} color={style.color} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Panel de detalle del rol ── */}
        {selectedRol ? (() => {
          const style = ROL_ACCENT[selectedRol.nombre] ?? DEFAULT_ACCENT;
          const privilegios = ROL_PRIVILEGIOS[selectedRol.nombre] ?? [];
          return (
            <div style={{
              background: '#fff',
              borderRadius: 14,
              border: '1.5px solid #e2e8f0',
              padding: 28,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
              {/* Encabezado del rol */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
                paddingBottom: 20, borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 13,
                  background: style.bg, border: `1.5px solid ${style.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <GoogleIcon name={style.icon} size={26} color={style.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0a2540' }}>
                    {selectedRol.nombre}
                  </h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {selectedRol.descripcion ?? 'Sin descripción configurada'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    id={`btn-edit-rol-${selectedRol.id}`}
                    className="btn-icon"
                    title="Editar rol"
                    onClick={() => { setEditingRol(selectedRol); setModalOpen(true); }}
                  >
                    <GoogleIcon name="edit" size={16} color="currentColor" />
                  </button>
                </div>
              </div>

              {/* Estado */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Estado
                  </div>
                  {selectedRol.activo ? (
                    <span className="badge-activo">
                      <GoogleIcon name="check_circle" size={12} color="#16a34a" />
                      Activo
                    </span>
                  ) : (
                    <span className="badge-inactivo">
                      <GoogleIcon name="cancel" size={12} color="#dc2626" />
                      Inactivo
                    </span>
                  )}
                </div>
                <div style={{
                  flex: 1, padding: '14px 16px', borderRadius: 10,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    ID del Rol
                  </div>
                  <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0a2540', wordBreak: 'break-all' }}>
                    {selectedRol.id}
                  </span>
                </div>
              </div>

              {/* Privilegios */}
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 14, fontSize: '0.875rem', fontWeight: 700, color: '#0a2540',
                }}>
                  <GoogleIcon name="security" size={18} color={style.color} />
                  Privilegios de Acceso
                </div>

                {privilegios.length > 0 ? (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {privilegios.map((p, i) => (
                      <li key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 9,
                        background: style.bg, border: `1px solid ${style.border}`,
                        fontSize: '0.85rem', color: '#0a2540',
                      }}>
                        <GoogleIcon name="check_circle" size={16} color={style.color} />
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{
                    padding: '24px', borderRadius: 10, background: '#f8fafc',
                    border: '1.5px dashed #e2e8f0', textAlign: 'center',
                    fontSize: '0.85rem', color: '#94a3b8',
                  }}>
                    <GoogleIcon name="info" size={24} color="#cbd5e1" />
                    <p style={{ margin: '8px 0 0' }}>
                      Los privilegios de este rol se definen mediante políticas en el backend.
                    </p>
                  </div>
                )}
              </div>

              {/* Nota informativa */}
              <div style={{
                marginTop: 20, padding: '12px 14px',
                background: 'rgba(79,154,255,0.06)', border: '1px solid rgba(79,154,255,0.2)',
                borderRadius: 9, fontSize: '0.8rem', color: '#64748b',
                display: 'flex', alignItems: 'flex-start', gap: 9,
              }}>
                <GoogleIcon name="info" size={17} color="#1a73e8" style={{ marginTop: 1, flexShrink: 0 }} />
                <span>
                  <strong style={{ color: '#1a73e8' }}>Gestión de usuarios con este rol:</strong>{' '}
                  Ve a <strong>Usuarios del Sistema</strong> en el sidebar para ver y gestionar los usuarios asignados a este rol.
                </span>
              </div>
            </div>
          );
        })() : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 60, background: '#fff', borderRadius: 14, border: '1.5px solid #e2e8f0',
            color: '#94a3b8', gap: 12, textAlign: 'center',
          }}>
            <GoogleIcon name="vpn_key" size={48} color="#cbd5e1" />
            <p style={{ margin: 0 }}>Selecciona un rol de la lista para ver sus detalles</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <RolFormModal
        open={modalOpen}
        rol={editingRol}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveRol}
      />
    </div>
  );
}
