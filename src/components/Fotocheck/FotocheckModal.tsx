import React, { useState, useEffect } from 'react';
import { FotocheckCard, type FotocheckData } from './FotocheckCard';
import { GoogleIcon } from '../GoogleIcon';
import './Fotocheck.css';

interface FotocheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: FotocheckData;
}

export const FotocheckModal: React.FC<FotocheckModalProps> = ({ isOpen, onClose, data }) => {
  const [printMode, setPrintMode] = useState<'both' | 'front' | 'back'>('both');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fc-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fc-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera del Modal */}
        <div className="fc-modal-header no-print">
          <div className="fc-modal-header__title-area">
            <div className="fc-modal-header__icon-box">
              <GoogleIcon name="badge" size={22} color="#2563eb" />
            </div>
            <div className="fc-modal-header__titles">
              <h3>Credencial Oficial — Fotocheck</h3>
              <p>Formato estándar CR80 (54 × 85.6 mm) con QR de verificación</p>
            </div>
          </div>
          <button
            type="button"
            className="fc-modal-close-btn"
            onClick={onClose}
            title="Cerrar ventana"
          >
            <GoogleIcon name="close" size={20} />
          </button>
        </div>

        {/* Barra de Herramientas */}
        <div className="fc-modal-toolbar no-print">
          <div className="fc-mode-tabs">
            <button
              type="button"
              className={`fc-tab-btn ${printMode === 'both' ? 'fc-tab-btn--active' : ''}`}
              onClick={() => setPrintMode('both')}
            >
              Frente & Reverso
            </button>
            <button
              type="button"
              className={`fc-tab-btn ${printMode === 'front' ? 'fc-tab-btn--active' : ''}`}
              onClick={() => setPrintMode('front')}
            >
              Solo Frente
            </button>
            <button
              type="button"
              className={`fc-tab-btn ${printMode === 'back' ? 'fc-tab-btn--active' : ''}`}
              onClick={() => setPrintMode('back')}
            >
              Solo Reverso (QR)
            </button>
          </div>

          <div className="fc-toolbar-actions">
            <button
              type="button"
              className="fc-print-btn"
              onClick={handlePrint}
              title="Abrir diálogo de impresión del navegador"
            >
              <GoogleIcon name="print" size={17} />
              <span>Imprimir Fotocheck</span>
            </button>
          </div>
        </div>

        {/* Escenario de Previsualización y Zona de Impresión */}
        <div className="fc-stage">
          <div className="fc-print-zone fc-cards-wrapper">
            {(printMode === 'both' || printMode === 'front') && (
              <FotocheckCard data={data} side="front" />
            )}
            {(printMode === 'both' || printMode === 'back') && (
              <FotocheckCard data={data} side="back" />
            )}
          </div>
        </div>

        {/* Pie informativo */}
        <div className="fc-modal-footer no-print">
          <div className="fc-help-note">
            <GoogleIcon name="info" size={16} color="#2563eb" />
            <span>
              <strong>Guía de impresión:</strong> En el diálogo de impresión, activa{' '}
              <em>"Gráficos de fondo"</em> y selecciona <em>Escala 100%</em> para tamaño PVC real.
            </span>
          </div>
          <button
            type="button"
            className="account-btn account-btn--outline"
            onClick={onClose}
          >
            Cerrar Vista
          </button>
        </div>
      </div>
    </div>
  );
};

export default FotocheckModal;
