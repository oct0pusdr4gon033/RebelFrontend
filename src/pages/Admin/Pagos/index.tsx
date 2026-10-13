// ─────────────────────────────────────────────────────────────────────────────
// src/pages/Admin/Pagos/index.tsx
// Módulo principal de Pagos para el rol de Administrador
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '../../../components/GoogleIcon';
import { getOportunidadesApi } from '../../../api/services/oportunidades.service';
import { mapApiToOportunidad } from '../../../hooks/useOportunidades';
import type { Oportunidad } from '../../../types/oportunidades';
import type { PagoOC } from '../../../types/pagos';
import { obtenerPagos } from '../../../api/services/pagos.service';
import { HistorialPagosView } from './HistorialPagosView';
import { RegistrarPagoView } from './RegistrarPagoView';
import { ResumenLiquidacionOCView } from './ResumenLiquidacionOCView';
import './Pagos.css';

interface PagosPageProps {
  roleAccent?: string;
}

type TabPagos = 'historial' | 'registrar' | 'resumen-oc';

export const PagosPage: React.FC<PagosPageProps> = ({ roleAccent = '#2563eb' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as TabPagos) || 'historial';
  const ocParam = searchParams.get('oc') || undefined;

  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [pagos, setPagos] = useState<PagoOC[]>(() => obtenerPagos());
  const [loading, setLoading] = useState(true);

  // Carga de oportunidades desde el backend / servicio
  const cargarOportunidades = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOportunidadesApi();
      if (Array.isArray(data)) {
        setOportunidades(data.map(mapApiToOportunidad));
      }
    } catch {
      // Backend no disponible
    } finally {
      setLoading(false);
    }
  }, []);

  const refrescarPagos = useCallback(() => {
    setPagos(obtenerPagos());
  }, []);

  useEffect(() => {
    cargarOportunidades();
  }, [cargarOportunidades]);

  // Escuchar evento personalizado de actualización de pagos
  useEffect(() => {
    const handleUpdate = () => refrescarPagos();
    window.addEventListener('sales_rebel_pagos_updated', handleUpdate);
    return () => window.removeEventListener('sales_rebel_pagos_updated', handleUpdate);
  }, [refrescarPagos]);

  const cambiarTab = (tab: TabPagos, extraParams?: Record<string, string>) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) => nextParams.set(k, v));
    } else if (tab !== 'registrar') {
      nextParams.delete('oc');
    }
    setSearchParams(nextParams);
  };

  const handlePagoRegistrado = (_nuevoPago: PagoOC) => {
    refrescarPagos();
    cambiarTab('historial');
  };

  const handleRegistrarParaOC = (numeroOC: string) => {
    cambiarTab('registrar', { oc: numeroOC });
  };

  return (
    <div className="pagos-page">
      {/* Header Principal con Push Buttons integrados */}
      <div className="pagos-header">
        <div className="pagos-header__left">
          <div className="pagos-header__icon-box" style={{ background: roleAccent, color: '#fff' }}>
            <GoogleIcon name="payments" size={28} color="#fff" />
          </div>
          <div className="pagos-header__text">
            <h1>Módulo de Pagos y Liquidaciones de OC</h1>
            <p>
              Registra pagos de <strong>flete</strong>, <strong>comisiones</strong>, <strong>gastos varios</strong> y compra de mercadería vinculados a Órdenes de Compra.
            </p>
          </div>
        </div>

        {/* Push-button selector de pestañas sincronizado con Sidebar */}
        <div className="pagos-push-tabs">
          <button
            type="button"
            className={`pagos-push-btn ${currentTab === 'historial' ? 'pagos-push-btn--active' : ''}`}
            onClick={() => cambiarTab('historial')}
          >
            <GoogleIcon name="receipt_long" size={18} />
            <span>Historial de Pagos</span>
            <span className="pagos-push-btn__badge">{pagos.length}</span>
          </button>

          <button
            type="button"
            className={`pagos-push-btn ${currentTab === 'registrar' ? 'pagos-push-btn--active' : ''}`}
            onClick={() => cambiarTab('registrar')}
          >
            <GoogleIcon name="add_card" size={18} />
            <span>Agregar Pago</span>
            <span className="pagos-push-btn__badge" style={{ background: '#ecfdf5', color: '#059669' }}>
              Nuevo
            </span>
          </button>

          <button
            type="button"
            className={`pagos-push-btn ${currentTab === 'resumen-oc' ? 'pagos-push-btn--active' : ''}`}
            onClick={() => cambiarTab('resumen-oc')}
          >
            <GoogleIcon name="analytics" size={18} />
            <span>Liquidación por OC</span>
          </button>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {loading && oportunidades.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <span className="pagos-spinner" style={{ width: '24px', height: '24px', borderColor: 'rgba(37, 99, 235, 0.3)', borderTopColor: roleAccent }} />
        </div>
      ) : (
        <>
          {currentTab === 'registrar' && (
            <RegistrarPagoView
              oportunidades={oportunidades}
              roleAccent={roleAccent}
              preselectedOC={ocParam}
              onPagoRegistrado={handlePagoRegistrado}
              onCancelar={() => cambiarTab('historial')}
            />
          )}

          {currentTab === 'historial' && (
            <HistorialPagosView
              pagos={pagos}
              roleAccent={roleAccent}
              onNuevoPagoClick={() => cambiarTab('registrar')}
              onPagosActualizados={refrescarPagos}
              onFiltrarPorOC={handleRegistrarParaOC}
            />
          )}

          {currentTab === 'resumen-oc' && (
            <ResumenLiquidacionOCView
              oportunidades={oportunidades}
              pagos={pagos}
              roleAccent={roleAccent}
              onRegistrarPagoParaOC={handleRegistrarParaOC}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PagosPage;
