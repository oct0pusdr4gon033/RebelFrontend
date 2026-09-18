import { useState, useEffect } from 'react';
import type { EmpleadoDto, CrearEmpleadoRequest, ActualizarEmpleadoRequest } from '../../../../../api/Dtos/Empleado';
import type { SedeDto } from '../../../../../api/Dtos/Sede';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  open: boolean;
  empleado?: EmpleadoDto | null;
  sedes: SedeDto[];
  onClose: () => void;
  onSave: (data: CrearEmpleadoRequest | ActualizarEmpleadoRequest) => Promise<void>;
}

const EMPTY: CrearEmpleadoRequest = {
  nombres: '',
  apellidos: '',
  dni: '',
  cargo: '',
  telefono: '',
  email: '',
  fechaIngreso: new Date().toISOString().split('T')[0],
  sedeId: undefined,
};

export default function EmpleadoFormModal({ open, empleado, sedes, onClose, onSave }: Props) {
  const [form, setForm] = useState<CrearEmpleadoRequest>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CrearEmpleadoRequest, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isEditing = !!empleado;

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (empleado) {
        setForm({
          nombres: empleado.nombres,
          apellidos: empleado.apellidos,
          dni: empleado.dni,
          cargo: empleado.cargo,
          telefono: empleado.telefono ?? '',
          email: empleado.email ?? '',
          fechaIngreso: empleado.fechaIngreso
            ? new Date(empleado.fechaIngreso).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          sedeId: empleado.sedeId,
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, empleado]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof CrearEmpleadoRequest, string>> = {};
    if (!form.nombres.trim()) e.nombres = 'Los nombres son obligatorios.';
    if (!form.apellidos.trim()) e.apellidos = 'Los apellidos son obligatorios.';
    if (!form.dni.trim()) e.dni = 'El DNI es obligatorio.';
    if (!form.cargo.trim()) e.cargo = 'El cargo es obligatorio.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Ingrese un email válido.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: keyof CrearEmpleadoRequest, value: string | number | undefined) => {
    setForm((prev: CrearEmpleadoRequest) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      await onSave({
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        dni: form.dni.trim(),
        cargo: form.cargo.trim(),
        telefono: form.telefono?.trim() || undefined,
        email: form.email?.trim() || undefined,
        fechaIngreso: form.fechaIngreso,
        sedeId: form.sedeId,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="empresa-modal-overlay" role="dialog" aria-modal="true">
      <div className="empresa-modal" style={{ maxWidth: 580 }}>
        <div className="empresa-modal-header">
          <h2>
            <GoogleIcon name="badge" size={20} color="#3b5bdb" />
            {isEditing ? 'Editar Empleado' : 'Nuevo Empleado'}
          </h2>
          <button id="btn-close-empleado-modal" className="btn-modal-close" onClick={onClose}>
            <GoogleIcon name="close" size={18} color="currentColor" />
          </button>
        </div>

        {apiError && (
          <div className="empresa-error" style={{ marginBottom: '16px' }}>
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{apiError}</span>
          </div>
        )}

        <form id="form-empleado" className="empresa-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emp-nombres">Nombres <span className="required">*</span></label>
              <input
                id="emp-nombres"
                className={`form-control${errors.nombres ? ' error' : ''}`}
                type="text"
                placeholder="Ej: María Elena"
                value={form.nombres}
                onChange={(e) => handleChange('nombres', e.target.value)}
                autoFocus
              />
              {errors.nombres && <span className="form-error">{errors.nombres}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="emp-apellidos">Apellidos <span className="required">*</span></label>
              <input
                id="emp-apellidos"
                className={`form-control${errors.apellidos ? ' error' : ''}`}
                type="text"
                placeholder="Ej: García López"
                value={form.apellidos}
                onChange={(e) => handleChange('apellidos', e.target.value)}
              />
              {errors.apellidos && <span className="form-error">{errors.apellidos}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emp-dni">DNI <span className="required">*</span></label>
              <input
                id="emp-dni"
                className={`form-control${errors.dni ? ' error' : ''}`}
                type="text"
                placeholder="Ej: 12345678"
                maxLength={8}
                value={form.dni}
                onChange={(e) => handleChange('dni', e.target.value)}
              />
              {errors.dni && <span className="form-error">{errors.dni}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="emp-cargo">Cargo <span className="required">*</span></label>
              <input
                id="emp-cargo"
                className={`form-control${errors.cargo ? ' error' : ''}`}
                type="text"
                placeholder="Ej: Ejecutiva de Ventas"
                value={form.cargo}
                onChange={(e) => handleChange('cargo', e.target.value)}
              />
              {errors.cargo && <span className="form-error">{errors.cargo}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emp-email">Email</label>
              <input
                id="emp-email"
                className={`form-control${errors.email ? ' error' : ''}`}
                type="email"
                placeholder="empleado@empresa.com"
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="emp-telefono">Teléfono</label>
              <input
                id="emp-telefono"
                className="form-control"
                type="tel"
                placeholder="Ej: 987654321"
                value={form.telefono ?? ''}
                onChange={(e) => handleChange('telefono', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="emp-fecha-ingreso">Fecha de Ingreso</label>
              <input
                id="emp-fecha-ingreso"
                className="form-control"
                type="date"
                value={form.fechaIngreso ?? ''}
                onChange={(e) => handleChange('fechaIngreso', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="emp-sede">Sede</label>
              <select
                id="emp-sede"
                className="form-control"
                value={form.sedeId ?? ''}
                onChange={(e) => handleChange('sedeId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">— Sin sede asignada —</option>
                {sedes.filter(s => s.activo).map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}{s.ubicacion ? ` (${s.ubicacion})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="empresa-modal-footer">
            <button id="btn-cancel-empleado" type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button id="btn-submit-empleado" type="submit" className="btn-submit" disabled={saving}>
              {saving ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} />Guardando...</>
              ) : (
                <><GoogleIcon name="save" size={16} color="#fff" />{isEditing ? 'Actualizar Empleado' : 'Crear Empleado'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
