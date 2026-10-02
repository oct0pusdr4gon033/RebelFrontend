// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/VerComprobanteModal.tsx
// Modal para inspeccionar la captura de pago en pantalla completa con zoom
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { GoogleIcon } from '../../../components/GoogleIcon';
import type { PagoOC } from '../../../types/pagos';
import './Pagos.css';

interface VerComprobanteModalProps {
  pago: PagoOC | null;
  onClose: () => void;
}

export const VerComprobanteModal: React.FC<VerComprobanteModalProps> = ({ pago, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!pago) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pago.comprobante.dataUrl;
    link.download = pago.comprobante.nombreArchivo || `comprobante_${pago.codigoPago}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const simboloMoneda = pago.moneda === 'PEN' ? 'S/' : '$';

  return (
    <div className="pagos-modal__backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pagos-modal__card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pagos-modal__header">
          <div className="pagos-modal__header-title">
            <div className="pagos-modal__icon-badge">
              <GoogleIcon name="receipt_long" size={22} color="#2563eb" />
            </div>
            <div>
              <h3>Comprobante de Pago · {pago.codigoPago}</h3>
              <p>
                Vinculado a OC <strong>{pago.numeroOC}</strong> (RQ: {pago.numeroRequerimiento})
              </p>
            </div>
          </div>
          <button type="button" className="pagos-modal__close-btn" onClick={onClose} title="Cerrar ventana">
            <GoogleIcon name="close" size={20} color="#64748b" />
          </button>
        </div>

        {/* Body dividido en visor y panel de detalles */}
        <div className="pagos-modal__body">
          {/* Visor interactivo */}
          <div className="pagos-modal__viewer">
            <div className="pagos-modal__toolbar">
              <button type="button" onClick={handleZoomOut} title="Alejar (-)">
                <GoogleIcon name="zoom_out" size={18} />
              </button>
              <span className="pagos-modal__zoom-level">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={handleZoomIn} title="Acercar (+)">
                <GoogleIcon name="zoom_in" size={18} />
              </button>
              <button type="button" onClick={handleRotate} title="Girar 90°">
                <GoogleIcon name="rotate_right" size={18} />
              </button>
              <button type="button" onClick={handleResetZoom} title="Restablecer vista">
                <GoogleIcon name="restart_alt" size={18} />
              </button>
              <div className="pagos-modal__toolbar-sep" />
              <button type="button" onClick={handleDownload} className="pagos-modal__download-btn" title="Descargar imagen">
                <GoogleIcon name="download" size={18} />
                <span>Descargar</span>
              </button>
            </div>

            <div className="pagos-modal__image-viewport">
              <img
                src={pago.comprobante.dataUrl}
                alt={pago.comprobante.nombreArchivo}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Ficha informativa lateral */}
          <div className="pagos-modal__info-sidebar">
            <div className="pagos-modal__amount-card">
              <span className="pagos-modal__amount-label">Monto Desembolsado</span>
              <div className="pagos-modal__amount-value">
                {simboloMoneda} {pago.monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="pagos-modal__concept-chip">
                <GoogleIcon name="category" size={15} />
                <span>{pago.concepto} {pago.conceptoPersonalizado ? `(${pago.conceptoPersonalizado})` : ''}</span>
              </div>
            </div>

            <div className="pagos-modal__info-grid">
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Orden de Compra:</span>
                <span className="pagos-modal__info-val highlight">{pago.numeroOC}</span>
              </div>
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Requerimiento:</span>
                <span className="pagos-modal__info-val">{pago.numeroRequerimiento}</span>
              </div>
              {pago.empresaRazonSocial && (
                <div className="pagos-modal__info-row">
                  <span className="pagos-modal__info-key">Entidad / Cliente:</span>
                  <span className="pagos-modal__info-val">{pago.empresaRazonSocial}</span>
                </div>
              )}
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Fecha de Pago:</span>
                <span className="pagos-modal__info-val">{pago.fechaPago}</span>
              </div>
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Método:</span>
                <span className="pagos-modal__info-val">{pago.metodoPago}</span>
              </div>
              {pago.banco && (
                <div className="pagos-modal__info-row">
                  <span className="pagos-modal__info-key">Banco:</span>
                  <span className="pagos-modal__info-val">{pago.banco}</span>
                </div>
              )}
              {pago.numeroOperacion && (
                <div className="pagos-modal__info-row">
                  <span className="pagos-modal__info-key">N° Operación:</span>
                  <span className="pagos-modal__info-val code">{pago.numeroOperacion}</span>
                </div>
              )}
              {pago.beneficiario && (
                <div className="pagos-modal__info-row">
                  <span className="pagos-modal__info-key">Beneficiario:</span>
                  <span className="pagos-modal__info-val">{pago.beneficiario}</span>
                </div>
              )}
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Archivo adjunto:</span>
                <span className="pagos-modal__info-val file">{pago.comprobante.nombreArchivo}</span>
              </div>
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Tamaño:</span>
                <span className="pagos-modal__info-val">{pago.comprobante.tamanoFormateado}</span>
              </div>
              <div className="pagos-modal__info-row">
                <span className="pagos-modal__info-key">Registrado por:</span>
                <span className="pagos-modal__info-val">{pago.registradoPor}</span>
              </div>
            </div>

            {pago.notas && (
              <div className="pagos-modal__notes-box">
                <div className="pagos-modal__notes-title">
                  <GoogleIcon name="sticky_note_2" size={15} color="#475569" />
                  <span>Observaciones</span>
                </div>
                <p>{pago.notas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pagos-modal__footer">
          <span className="pagos-modal__footer-audit">
            ID Transacción: <code>{pago.id}</code> · Registrado el {new Date(pago.fechaRegistro).toLocaleString('es-PE')}
          </span>
          <button type="button" className="pagos-btn pagos-btn--primary" onClick={onClose}>
            Entendido / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
