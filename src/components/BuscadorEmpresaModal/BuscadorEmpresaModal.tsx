import React, { useState, useEffect } from 'react';
import { GoogleIcon } from '../GoogleIcon';
import { getEmpresasApi } from '../../api/services/empresa.service';
import type { EmpresaOption } from '../../api/Dtos/Empresa';
import './BuscadorEmpresaModal.css';

interface BuscadorEmpresaModalProps {
  onClose: () => void;
  onSelect: (empresa: EmpresaOption) => void;
}

export const BuscadorEmpresaModal: React.FC<BuscadorEmpresaModalProps> = ({ onClose, onSelect }) => {
  const [search, setSearch] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const limit = 6; // Mostramos 6 registros por página en el modal

  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoading(true);
      try {
        const data = await getEmpresasApi(search, page, limit);
        // Compatibilidad backend nuevo y viejo
        if (Array.isArray(data)) {
          const arr = data as any[];
          const filtered = arr.filter(
            (e) => e.razonSocial.toLowerCase().includes(search.toLowerCase()) || e.ruc.includes(search)
          );
          setTotalCount(filtered.length);
          setEmpresas(filtered.slice((page - 1) * limit, page * limit));
        } else if (data) {
          const items = (data as any).items || (data as any).Items || [];
          const total = (data as any).totalCount || (data as any).TotalCount || items.length;
          setEmpresas(items);
          setTotalCount(total);
        }
      } catch (err) {
        console.error('Error fetching empresas:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchEmpresas();
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [search, page]);

  // Al cambiar la búsqueda, volver a la página 1
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  return (
    <div className="empresa-modal-overlay" onClick={onClose}>
      <div className="empresa-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="empresa-modal-header">
          <h2>
            <div style={{ background: '#e0f2fe', borderRadius: '10px', padding: '6px', display: 'flex', color: '#0284c7' }}>
              <GoogleIcon name="corporate_fare" size={20} />
            </div>
            Buscador de Entidades / Empresas
          </h2>
          <button className="empresa-modal-close" onClick={onClose} title="Cerrar">
            <GoogleIcon name="close" size={18} />
          </button>
        </div>

        <div className="empresa-modal-body">
          <div className="empresa-modal-search">
            <div className="search-icon">
              <GoogleIcon name="search" size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar por RUC o Razón Social..."
              value={search}
              onChange={handleSearchChange}
              autoFocus
            />
          </div>

          <div className="empresa-modal-table-wrapper">
            <table className="empresa-modal-table">
              <thead>
                <tr>
                  <th>RUC</th>
                  <th>Razón Social</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading && empresas.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '30px' }}>
                      <GoogleIcon name="sync" size={24} color="#94a3b8" />
                      <div style={{ marginTop: '8px', color: '#64748b', fontSize: '13px' }}>Buscando...</div>
                    </td>
                  </tr>
                ) : empresas.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empresa-modal-empty">
                        <GoogleIcon name="info" size={32} color="#cbd5e1" />
                        <span>No se encontraron empresas con esos criterios.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  empresas.map((emp) => (
                    <tr 
                      key={emp.id} 
                      style={{ 
                        opacity: loading ? 0.5 : 1, 
                        transition: 'opacity 0.2s ease-in-out',
                        pointerEvents: loading ? 'none' : 'auto'
                      }}
                    >
                      <td><span className="empresa-ruc">{emp.ruc}</span></td>
                      <td><div className="empresa-name">{emp.razonSocial}</div></td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="empresa-modal-select-btn"
                          onClick={() => onSelect(emp)}
                          disabled={loading}
                        >
                          <GoogleIcon name="check" size={14} /> Elegir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="empresa-modal-footer">
          <div className="empresa-modal-pagination-info">
            Mostrando {empresas.length > 0 ? (page - 1) * limit + 1 : 0} al {Math.min(page * limit, totalCount)} de <strong>{totalCount}</strong> empresas
          </div>
          <div className="empresa-modal-pagination-controls">
            <button 
              className="empresa-modal-page-btn" 
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <GoogleIcon name="chevron_left" size={16} /> Anterior
            </button>
            <button 
              className="empresa-modal-page-btn" 
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Siguiente <GoogleIcon name="chevron_right" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
