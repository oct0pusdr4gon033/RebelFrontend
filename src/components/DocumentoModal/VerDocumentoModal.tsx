// ─────────────────────────────────────────────────────────────────────────────
// src/components/DocumentoModal/VerDocumentoModal.tsx
// Modal integrado para previsualizar documentos (PDF, imágenes, etc.) en pantalla
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { GoogleIcon } from '../GoogleIcon/GoogleIcon';
import { getDocumentoVisualProps } from '../../utils/documentosPoolUtils';

export interface DocumentoVisualizable {
  nombre: string;
  url: string;
  tipo?: string;
  tamanoTexto?: string;
}

interface VerDocumentoModalProps {
  documento: DocumentoVisualizable | null;
  onClose: () => void;
}

export const VerDocumentoModal: React.FC<VerDocumentoModalProps> = ({
  documento,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!documento) return null;

  const visual = getDocumentoVisualProps(documento.nombre, documento.tipo);

  const esPdf =
    documento.nombre.toLowerCase().endsWith('.pdf') ||
    documento.tipo?.toLowerCase().includes('pdf') ||
    documento.url.startsWith('data:application/pdf');

  const esImagen =
    /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(documento.nombre) ||
    documento.tipo?.toLowerCase().includes('image') ||
    documento.url.startsWith('data:image/');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = documento.url;
    link.download = documento.nombre || 'documento_oficial.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        style={{
          width: '92vw',
          maxWidth: '1200px',
          height: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: 6,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1.5px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span
              style={{
                width: 38,
                height: 38,
                borderRadius: 6,
                backgroundColor: visual.badgeBg,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <GoogleIcon name={visual.icon} size={22} color={visual.color} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  maxWidth: '550px',
                }}
                title={documento.nombre}
              >
                {documento.nombre}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: 8, marginTop: 2 }}>
                {documento.tamanoTexto && <span>{documento.tamanoTexto}</span>}
                <span>&bull;</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>Visor Oficial de Perú Compras</span>
              </div>
            </div>
          </div>

          {/* Acciones de la Cabecera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: '7px 14px',
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: 4,
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Descargar archivo en tu computadora"
            >
              <GoogleIcon name="download" size={16} color="#334155" />
              <span>Descargar</span>
            </button>

            <a
              href={documento.url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: '7px 14px',
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: 4,
                color: '#1d4ed8',
                fontSize: '12.5px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              title="Abrir en pestaña nueva del navegador"
            >
              <GoogleIcon name="open_in_new" size={16} color="#1d4ed8" />
              <span>Pestaña nueva</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}
              title="Cerrar visor (Esc)"
            >
              <GoogleIcon name="close" size={20} color="#475569" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Visor */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {esPdf ? (
            <iframe
              src={documento.url}
              title={documento.nombre}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                backgroundColor: '#334155',
              }}
            />
          ) : esImagen ? (
            <div
              style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                backgroundColor: '#0f172a',
              }}
            >
              <img
                src={documento.url}
                alt={documento.nombre}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
              />
              {/* Barra de herramientas para imagen */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  padding: '6px 12px',
                  borderRadius: 24,
                  backdropFilter: 'blur(4px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                  title="Alejar (-)"
                >
                  <GoogleIcon name="zoom_out" size={18} color="#ffffff" />
                </button>
                <span style={{ color: '#ffffff', fontSize: '12px', fontWeight: 700, minWidth: 42, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                  title="Acercar (+)"
                >
                  <GoogleIcon name="zoom_in" size={18} color="#ffffff" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                  title="Girar 90°"
                >
                  <GoogleIcon name="rotate_right" size={18} color="#ffffff" />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 4 }}
                  title="Restablecer vista"
                >
                  <GoogleIcon name="restart_alt" size={18} color="#ffffff" />
                </button>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '40px 32px',
                borderRadius: 8,
                textAlign: 'center',
                maxWidth: 450,
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <GoogleIcon name={visual.icon} size={54} color={visual.color} />
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {documento.nombre}
                </h4>
                <p style={{ fontSize: '13px', color: '#64748b', marginTop: 6 }}>
                  Este tipo de archivo no admite visor web embebido directo. Puedes descargarlo para abrirlo en tu aplicación local.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <GoogleIcon name="download" size={18} color="#ffffff" />
                <span>Descargar Archivo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

