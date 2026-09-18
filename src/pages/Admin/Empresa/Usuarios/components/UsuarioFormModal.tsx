import { useState, useEffect } from 'react';
import type { UsuarioDto, CrearUsuarioRequest, ActualizarUsuarioRequest, RolDto } from '../../../../../api/Dtos/Usuario';
import type { EmpleadoDto } from '../../../../../api/Dtos/Empleado';
import type { SedeDto } from '../../../../../api/Dtos/Sede';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  open: boolean;
  usuario?: UsuarioDto | null;
  roles: RolDto[];
  empleados: EmpleadoDto[];
  sedes: SedeDto[];
  onClose: () => void;
  onSave: (data: CrearUsuarioRequest | ActualizarUsuarioRequest) => Promise<void>;
}

const EMPTY_CREATE: CrearUsuarioRequest = {
  email: '',
  password: '',
  nombreCompleto: '',
  rolId: '',
  empleadoId: undefined,
  sedeId: undefined,
};

const EMPTY_UPDATE: ActualizarUsuarioRequest = {
  nombreCompleto: '',
  rolId: '',
  empleadoId: undefined,
  sedeId: undefined,
  activo: true,
};

export default function UsuarioFormModal({ open, usuario, roles, empleados, sedes, onClose, onSave }: Props) {
  const isEditing = !!usuario;
  const [createForm, setCreateForm] = useState<CrearUsuarioRequest>(EMPTY_CREATE);
  const [updateForm, setUpdateForm] = useState<ActualizarUsuarioRequest>(EMPTY_UPDATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      setShowPassword(false);
      if (usuario) {
        setUpdateForm({
          nombreCompleto: usuario.nombreCompleto,
          rolId: usuario.rolId ?? '',
          empleadoId: usuario.empleadoId,
          sedeId: usuario.sedeId,
          activo: usuario.activo,
        });
      } else {
        setCreateForm(EMPTY_CREATE);
      }
    }
  }, [open, usuario]);

  const validateCreate = (): boolean => {
    const e: Record<string, string> = {};
    if (!createForm.email.trim()) e.email = 'El email es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) e.email = 'Ingrese un email válido.';
    if (!createForm.password || createForm.password.length < 8) e.password = 'Mínimo 8 caracteres.';
    if (!createForm.nombreCompleto.trim()) e.nombreCompleto = 'El nombre completo es obligatorio.';
    if (!createForm.rolId) e.rolId = 'Debe seleccionar un rol.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateUpdate = (): boolean => {
    const e: Record<string, string> = {};
    if (!updateForm.nombreCompleto.trim()) e.nombreCompleto = 'El nombre completo es obligatorio.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = isEditing ? validateUpdate() : validateCreate();
    if (!valid) return;
    setSaving(true);
    setApiError(null);
    try {
      if (isEditing) {
        await onSave({ ...updateForm, nombreCompleto: updateForm.nombreCompleto.trim() });
      } else {
        await onSave({ ...createForm, nombreCompleto: createForm.nombreCompleto.trim(), email: createForm.email.trim() });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const sedesFiltradas = sedes.filter((s) => s.activo);
  const empleadosSinUsuario = empleados.filter(
    (e) => e.activo && (!e.userId || e.id === usuario?.empleadoId)
  );

  // typed setters to avoid implicit any
  const setCreateField = <K extends keyof CrearUsuarioRequest>(field: K, value: CrearUsuarioRequest[K]) => {
    setCreateForm((prev: CrearUsuarioRequest) => ({ ...prev, [field]: value }));
  };
  const setUpdateField = <K extends keyof ActualizarUsuarioRequest>(field: K, value: ActualizarUsuarioRequest[K]) => {
    setUpdateForm((prev: ActualizarUsuarioRequest) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
      <div className="empresa-modal" style={{ maxWidth: 580 }}>
        <div className="empresa-modal-header">
          <h2>
            <GoogleIcon name="manage_accounts" size={20} color="#3b5bdb" />
            {isEditing ? 'Editar Usuario' : 'Nuevo Usuario del Sistema'}
          </h2>
          <button id="btn-close-usuario-modal" className="btn-modal-close" onClick={onClose}>
            <GoogleIcon name="close" size={18} color="currentColor" />
          </button>
        </div>

        {apiError && (
          <div className="empresa-error" style={{ marginBottom: '16px' }}>
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{apiError}</span>
          </div>
        )}

        <form id="form-usuario" className="empresa-form" onSubmit={handleSubmit} noValidate>
          {!isEditing && (
            <>
              <div className="form-group">
                <label htmlFor="user-email">Email <span className="required">*</span></label>
                <input
                  id="user-email"
                  className={`form-control${errors.email ? ' error' : ''}`}
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={createForm.email}
                  onChange={(e) => setCreateField('email', e.target.value)}
                  autoFocus
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="user-password">Contraseña <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="user-password"
                    className={`form-control${errors.password ? ' error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres, 1 mayúscula, 1 número"
                    value={createForm.password}
                    onChange={(e) => setCreateField('password', e.target.value)}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
                      display: 'flex', alignItems: 'center'
                    }}
                    tabIndex={-1}
                  >
                    <GoogleIcon name={showPassword ? 'visibility_off' : 'visibility'} size={18} color="currentColor" />
                  </button>
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="user-nombre">Nombre Completo <span className="required">*</span></label>
            <input
              id="user-nombre"
              className={`form-control${errors.nombreCompleto ? ' error' : ''}`}
              type="text"
              placeholder="Ej: María García López"
              value={isEditing ? updateForm.nombreCompleto : createForm.nombreCompleto}
              onChange={(e) => {
                if (isEditing) setUpdateField('nombreCompleto', e.target.value);
                else setCreateField('nombreCompleto', e.target.value);
              }}
              autoFocus={isEditing}
            />
            {errors.nombreCompleto && <span className="form-error">{errors.nombreCompleto}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="user-rol">Rol {!isEditing && <span className="required">*</span>}</label>
            <select
              id="user-rol"
              className={`form-control${errors.rolId ? ' error' : ''}`}
              value={isEditing ? (updateForm.rolId ?? '') : createForm.rolId}
              onChange={(e) => {
                if (isEditing) setUpdateField('rolId', e.target.value);
                else setCreateField('rolId', e.target.value);
              }}
            >
              <option value="">— Seleccionar rol —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
            {errors.rolId && <span className="form-error">{errors.rolId}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="user-empleado">Empleado Vinculado</label>
              <select
                id="user-empleado"
                className="form-control"
                value={isEditing ? (updateForm.empleadoId ?? '') : (createForm.empleadoId ?? '')}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  if (isEditing) setUpdateField('empleadoId', val);
                  else setCreateField('empleadoId', val);
                }}
              >
                <option value="">— Sin empleado —</option>
                {empleadosSinUsuario.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombreCompleto} ({e.dni})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="user-sede">Sede</label>
              <select
                id="user-sede"
                className="form-control"
                value={isEditing ? (updateForm.sedeId ?? '') : (createForm.sedeId ?? '')}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  if (isEditing) setUpdateField('sedeId', val);
                  else setCreateField('sedeId', val);
                }}
              >
                <option value="">— Sin sede —</option>
                {sedesFiltradas.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {isEditing && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  id="user-activo"
                  type="checkbox"
                  checked={updateForm.activo}
                  onChange={(e) => setUpdateField('activo', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#3b5bdb', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
                  Usuario activo
                </span>
              </label>
            </div>
          )}

          <div className="empresa-modal-footer">
            <button id="btn-cancel-usuario" type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button id="btn-submit-usuario" type="submit" className="btn-submit" disabled={saving}>
              {saving ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} />Guardando...</>
              ) : (
                <><GoogleIcon name="save" size={16} color="#fff" />{isEditing ? 'Actualizar Usuario' : 'Crear Usuario'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
