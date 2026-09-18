import { useState, useEffect } from 'react';
import type { SedeDto, CrearSedeRequest, ActualizarSedeRequest } from '../../../../../api/Dtos/Sede';
import { GoogleIcon } from '../../../../../components/GoogleIcon';

interface Props {
  open: boolean;
  sede?: SedeDto | null;   // null = crear, SedeDto = editar
  onClose: () => void;
  onSave: (data: CrearSedeRequest | ActualizarSedeRequest) => Promise<void>;
}

const EMPTY_FORM: CrearSedeRequest = {
  nombre: '',
  ubicacion: '',
  direccion: '',
  telefono: '',
  email: '',
};

export default function SedeFormModal({ open, sede, onClose, onSave }: Props) {
  const [form, setForm] = useState<CrearSedeRequest>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof CrearSedeRequest, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isEditing = !!sede;

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (sede) {
        setForm({
          nombre: sede.nombre,
          ubicacion: sede.ubicacion ?? '',
          direccion: sede.direccion ?? '',
          telefono: sede.telefono ?? '',
          email: sede.email ?? '',
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, sede]);

  const validate = (): boolean => {
    const e: Partial<Record<keyof CrearSedeRequest, string>> = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Ingrese un email válido.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (field: keyof CrearSedeRequest, value: string) => {
    setForm((prev: CrearSedeRequest) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      await onSave({
        nombre: form.nombre.trim(),
        ubicacion: form.ubicacion?.trim() || undefined,
        direccion: form.direccion?.trim() || undefined,
        telefono: form.telefono?.trim() || undefined,
        email: form.email?.trim() || undefined,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="empresa-modal-overlay" role="dialog" aria-modal="true" aria-label={isEditing ? 'Editar sede' : 'Nueva sede'}>
      <div className="empresa-modal">
        <div className="empresa-modal-header">
          <h2>
            <GoogleIcon name="domain" size={20} color="#3b5bdb" />
            {isEditing ? 'Editar Sede' : 'Nueva Sede'}
          </h2>
          <button id="btn-close-sede-modal" className="btn-modal-close" onClick={onClose} aria-label="Cerrar">
            <GoogleIcon name="close" size={18} color="currentColor" />
          </button>
        </div>

        {apiError && (
          <div className="empresa-error" style={{ marginBottom: '16px' }}>
            <GoogleIcon name="error" size={18} color="#dc2626" />
            <span>{apiError}</span>
          </div>
        )}

        <form id="form-sede" className="empresa-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="sede-nombre">Nombre <span className="required">*</span></label>
            <input
              id="sede-nombre"
              className={`form-control${errors.nombre ? ' error' : ''}`}
              type="text"
              placeholder="Ej: Sede Lima Centro"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              autoFocus
            />
            {errors.nombre && <span className="form-error">{errors.nombre}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sede-ubicacion">Ciudad / Región</label>
              <input
                id="sede-ubicacion"
                className="form-control"
                type="text"
                placeholder="Ej: Lima"
                value={form.ubicacion ?? ''}
                onChange={(e) => handleChange('ubicacion', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="sede-telefono">Teléfono</label>
              <input
                id="sede-telefono"
                className="form-control"
                type="tel"
                placeholder="Ej: 01-4556789"
                value={form.telefono ?? ''}
                onChange={(e) => handleChange('telefono', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="sede-direccion">Dirección</label>
            <input
              id="sede-direccion"
              className="form-control"
              type="text"
              placeholder="Ej: Av. Arequipa 1234, Miraflores"
              value={form.direccion ?? ''}
              onChange={(e) => handleChange('direccion', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="sede-email">Email</label>
            <input
              id="sede-email"
              className={`form-control${errors.email ? ' error' : ''}`}
              type="email"
              placeholder="sede@empresa.com"
              value={form.email ?? ''}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="empresa-modal-footer">
            <button id="btn-cancel-sede" type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button id="btn-submit-sede" type="submit" className="btn-submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Guardando...
                </>
              ) : (
                <>
                  <GoogleIcon name="save" size={16} color="#fff" />
                  {isEditing ? 'Actualizar Sede' : 'Crear Sede'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
