import { useState } from 'react';
import type { SolicitudResponse } from '../../../api/Dtos/Solicitud';
import {
  aprobarSolicitud,
  observarSolicitud,
  rechazarSolicitud,
} from '../../../api/services/solicitud.service';
import { GoogleIcon } from '../../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';

interface SolicitudResolucionActionsProps {
  solicitudId: number;
  onResolved: (solicitud: SolicitudResponse) => Promise<void>;
}

type AccionResolucion = 'aprobar' | 'observar' | 'rechazar';

export default function SolicitudResolucionActions({
  solicitudId,
  onResolved,
}: SolicitudResolucionActionsProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (accion: AccionResolucion) => {
    let comentario: string | null = null;
    if (accion === 'observar') {
      const observation = await Swal.fire<string>({
        title: 'Solicitar subsanación',
        text: 'Indica qué debe corregir la ejecutiva.',
        input: 'textarea',
        inputPlaceholder: 'Observación obligatoria',
        inputAttributes: {
          maxlength: '2000',
          'aria-label': 'Observación para solicitar subsanación',
        },
        showCancelButton: true,
        confirmButtonText: 'Solicitar subsanación',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
        inputValidator: (value) => {
          if (!value.trim()) return 'La observación es obligatoria.';
          if (value.trim().length > 2000) return 'La observación no puede superar los 2000 caracteres.';
          return undefined;
        },
      });
      if (!observation.isConfirmed) return;
      comentario = observation.value?.trim() ?? '';
    } else {
      const approving = accion === 'aprobar';
      const confirmation = await Swal.fire({
        title: approving ? 'Aprobar solicitud' : 'Rechazar definitivamente',
        text: approving
          ? '¿Confirmas que deseas aprobar esta solicitud?'
          : '¿Estás seguro de que deseas rechazar definitivamente esta solicitud? No permitirá subsanaciones ni modificaciones',
        icon: approving ? 'question' : 'warning',
        showCancelButton: true,
        confirmButtonText: approving ? 'Sí, aprobar' : 'Sí, rechazar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: approving ? '#16a34a' : '#dc2626',
      });
      if (!confirmation.isConfirmed) return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = accion === 'aprobar'
        ? await aprobarSolicitud(solicitudId, null)
        : accion === 'observar'
          ? await observarSolicitud(solicitudId, comentario ?? '')
          : await rechazarSolicitud(solicitudId, null);
      const successTitle = accion === 'aprobar'
        ? 'Solicitud aprobada'
        : accion === 'observar'
          ? 'Subsanación solicitada'
          : 'Solicitud rechazada';
      await Swal.fire({
        icon: 'success',
        title: successTitle,
        text: 'El servidor confirmó la acción.',
        confirmButtonColor: '#2563eb',
      });
      await onResolved(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la solicitud.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="solicitud-resolution">
      {error && (
        <div className="solicitudes-alert solicitudes-alert--error" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}
      <div className="solicitudes-form-actions">
        <button
          type="button"
          className="solicitudes-resolution-button solicitudes-resolution-button--approve"
          onClick={() => void resolve('aprobar')}
          disabled={saving}
        >
          <GoogleIcon name="check_circle" size={18} />
          {saving ? 'Procesando...' : 'Aprobar'}
        </button>
        <button
          type="button"
          className="solicitudes-resolution-button solicitudes-resolution-button--observe"
          onClick={() => void resolve('observar')}
          disabled={saving}
        >
          <GoogleIcon name="rate_review" size={18} />
          {saving ? 'Procesando...' : 'Solicitar subsanación'}
        </button>
        <button
          type="button"
          className="solicitudes-resolution-button solicitudes-resolution-button--reject"
          onClick={() => void resolve('rechazar')}
          disabled={saving}
        >
          <GoogleIcon name="cancel" size={18} />
          {saving ? 'Procesando...' : 'Rechazar definitivamente'}
        </button>
      </div>
    </div>
  );
}
