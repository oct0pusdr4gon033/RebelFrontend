import React, { useState, useMemo } from 'react';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import type { ContactoOCAM } from '../../types/contactos';

interface ListadoAgendaViewProps {
  contactos: ContactoOCAM[];
  loading: boolean;
  roleAccent?: string;
  onVerDetalle: (contacto: ContactoOCAM) => void;
  onIrARegistrar: () => void;
}

export const ListadoAgendaView: React.FC<ListadoAgendaViewProps> = ({
  contactos,
  loading,
  roleAccent = '#2563eb',
  onVerDetalle,
  onIrARegistrar,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroOcam, setFiltroOcam] = useState('todos');
  const [filtroEmpresa, setFiltroEmpresa] = useState('todos');
  const [filtroTipoRelacion, setFiltroTipoRelacion] = useState('todos');
  const [filtroCaso, setFiltroCaso] = useState<'todos' | 'caso1' | 'caso2' | 'otros'>('todos');

  // Listas únicas para los comboboxes de filtro
  const listaOcams = useMemo(() => {
    const set = new Set<string>();
    contactos.forEach((c) => {
      if (c.numeroOCAM && c.numeroOCAM !== 'SIN OCAM') set.add(c.numeroOCAM);
    });
    return Array.from(set).sort();
  }, [contactos]);

  const listaEmpresas = useMemo(() => {
    const set = new Set<string>();
    contactos.forEach((c) => {
      if (c.empresaRelacionada) set.add(c.empresaRelacionada);
    });
    return Array.from(set).sort();
  }, [contactos]);

  // Filtrado reactivo en cliente
  const contactosFiltrados = useMemo(() => {
    return contactos.filter((c) => {
      const esSinOcam = Boolean(c.sinOcamRelacionada || c.numeroOCAM === 'SIN OCAM' || !c.numeroOCAM);

      // Búsqueda general (OCAM, RUC, nombre contacto, teléfono, cargo, entidad, motivo, respuesta)
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const matchesGeneral =
          (c.numeroOCAM || '').toLowerCase().includes(q) ||
          (c.rucEntidad || '').toLowerCase().includes(q) ||
          c.contactoNombre.toLowerCase().includes(q) ||
          c.contactoNumero.includes(q) ||
          c.contactoAreaCargo.toLowerCase().includes(q) ||
          c.empresaRelacionada.toLowerCase().includes(q) ||
          c.contactoMotivo.toLowerCase().includes(q) ||
          c.respuesta.toLowerCase().includes(q);
        if (!matchesGeneral) return false;
      }

      // Filtro por OCAM / Sin OCAM
      if (filtroOcam === 'SIN_OCAM') {
        if (!esSinOcam) return false;
      } else if (filtroOcam === 'CON_OCAM') {
        if (esSinOcam) return false;
      } else if (filtroOcam !== 'todos' && c.numeroOCAM !== filtroOcam) {
        return false;
      }

      // Filtro por Empresa
      if (filtroEmpresa !== 'todos' && c.empresaRelacionada !== filtroEmpresa) {
        return false;
      }

      // Filtro por Tipo de Relación
      if (filtroTipoRelacion !== 'todos' && c.tipoRelacion !== filtroTipoRelacion) {
        return false;
      }

      // Filtro por Caso de Respuesta
      if (filtroCaso !== 'todos') {
        const rUpper = c.respuesta.toUpperCase();
        if (filtroCaso === 'caso1') {
          if (!rUpper.includes('CASO 1') && !rUpper.includes('PERFECTAS')) return false;
        } else if (filtroCaso === 'caso2') {
          if (
            !rUpper.includes('CASO 2') &&
            !rUpper.includes('NO CONTESTO') &&
            !rUpper.includes('NO CONTESTÓ')
          )
            return false;
        } else if (filtroCaso === 'otros') {
          if (
            rUpper.includes('CASO 1') ||
            rUpper.includes('CASO 2') ||
            rUpper.includes('PERFECTAS') ||
            rUpper.includes('NO CONTESTO')
          )
            return false;
        }
      }

      return true;
    });
  }, [contactos, busqueda, filtroOcam, filtroEmpresa, filtroTipoRelacion, filtroCaso]);

  const formatFecha = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="agenda-table-card">
      {/* ── BARRA DE FILTROS SUPERIOR ── */}
      <div className="agenda-filters-bar">
        <div className="agenda-filters-row">
          {/* Búsqueda rápida */}
          <div className="agenda-search-box">
            <span className="agenda-search-icon">
              <GoogleIcon name="search" size={18} />
            </span>
            <input
              type="text"
              placeholder="Buscar por RUC, Nombre de Entidad, Contacto, Teléfono u OCAM..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtro por Número de OCAM o Sin OCAM */}
          <select
            className="agenda-filter-select"
            value={filtroOcam}
            onChange={(e) => setFiltroOcam(e.target.value)}
          >
            <option value="todos">Vínculo OCAM: Todos ({contactos.length})</option>
            <option value="SIN_OCAM">Sin Número de OCAM Relacionada</option>
            <option value="CON_OCAM">Solo con OCAM Relacionada</option>
            {listaOcams.map((ocam) => (
              <option key={ocam} value={ocam}>
                {ocam}
              </option>
            ))}
          </select>

          {/* Filtro por Empresa Solicitante / Relacionada */}
          <select
            className="agenda-filter-select"
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
          >
            <option value="todos">Todas las Entidades ({listaEmpresas.length})</option>
            {listaEmpresas.map((emp) => (
              <option key={emp} value={emp}>
                {emp}
              </option>
            ))}
          </select>

          {/* Filtro por Tipo de Relación */}
          <select
            className="agenda-filter-select"
            value={filtroTipoRelacion}
            onChange={(e) => setFiltroTipoRelacion(e.target.value)}
          >
            <option value="todos">Todos los Tipos de Relación</option>
            <option value="Entidad Solicitante">Entidad Solicitante</option>
            <option value="Entidad / Marca de Cotización">Entidad / Marca de Cotización</option>
            <option value="Relación Exterior">Relación Exterior (Transporte, Embalaje, etc.)</option>
          </select>
        </div>

        {/* Chips de filtro por caso de respuesta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Filtrar Caso:</span>

          <button
            type="button"
            className={`agenda-chip-btn ${filtroCaso === 'todos' ? 'agenda-chip-btn--amber' : ''}`}
            onClick={() => setFiltroCaso('todos')}
          >
            Todos ({contactos.length})
          </button>

          <button
            type="button"
            className="agenda-chip-btn agenda-chip-btn--success"
            style={filtroCaso === 'caso1' ? { fontWeight: 800, borderWidth: '2px' } : {}}
            onClick={() => setFiltroCaso(filtroCaso === 'caso1' ? 'todos' : 'caso1')}
          >
            <GoogleIcon name="check_circle" size={14} color="#15803d" />
            Caso 1: En Perfectas Condiciones
          </button>

          <button
            type="button"
            className="agenda-chip-btn agenda-chip-btn--danger"
            style={filtroCaso === 'caso2' ? { fontWeight: 800, borderWidth: '2px' } : {}}
            onClick={() => setFiltroCaso(filtroCaso === 'caso2' ? 'todos' : 'caso2')}
          >
            <GoogleIcon name="phone_missed" size={14} color="#b91c1c" />
            Caso 2: No contestó teléfono
          </button>

          <button
            type="button"
            className="agenda-chip-btn"
            style={
              filtroCaso === 'otros'
                ? { fontWeight: 800, borderWidth: '2px', borderColor: '#2563eb' }
                : {}
            }
            onClick={() => setFiltroCaso(filtroCaso === 'otros' ? 'todos' : 'otros')}
          >
            Directorio / Otras Respuestas
          </button>

          {(busqueda ||
            filtroOcam !== 'todos' ||
            filtroEmpresa !== 'todos' ||
            filtroTipoRelacion !== 'todos' ||
            filtroCaso !== 'todos') && (
            <button
              type="button"
              className="agenda-chip-btn"
              style={{ color: '#ef4444', borderColor: '#fca5a5' }}
              onClick={() => {
                setBusqueda('');
                setFiltroOcam('todos');
                setFiltroEmpresa('todos');
                setFiltroTipoRelacion('todos');
                setFiltroCaso('todos');
              }}
            >
              <GoogleIcon name="close" size={13} color="#ef4444" />
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* ── TABLA DE CONTACTOS ── */}
      <div className="agenda-table-wrap">
        <table className="agenda-table">
          <thead>
            <tr>
              <th>Vínculo OCAM</th>
              <th>Contacto / Número</th>
              <th>Nombre del Contacto</th>
              <th>Área y Cargo</th>
              <th>RUC & Nombre de la Entidad</th>
              <th>Motivo / Descripción</th>
              <th>Respuesta</th>
              <th>Trazabilidad</th>
              <th style={{ textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                    <GoogleIcon name="hourglass_top" size={20} color={roleAccent} />
                    <span>Cargando agenda de contactos...</span>
                  </div>
                </td>
              </tr>
            ) : contactosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                  <GoogleIcon name="contact_phone" size={36} color="#cbd5e1" />
                  <p style={{ margin: '10px 0 6px', fontWeight: 700, color: '#334155' }}>
                    No se encontraron contactos con los filtros seleccionados
                  </p>
                  <p style={{ margin: 0, fontSize: '0.84rem' }}>
                    Registra uno o varios contactos (con o sin OCAM relacionada).
                  </p>
                  <button
                    type="button"
                    className="agenda-btn-submit"
                    style={{
                      marginTop: 14,
                      background: roleAccent,
                      fontSize: '0.82rem',
                      padding: '8px 16px',
                    }}
                    onClick={onIrARegistrar}
                  >
                    <GoogleIcon name="add" size={16} color="#ffffff" />
                    <span>Registrar Contacto</span>
                  </button>
                </td>
              </tr>
            ) : (
              contactosFiltrados.map((c) => {
                const isCaso1 =
                  c.respuesta.toUpperCase().includes('CASO 1') ||
                  c.respuesta.toLowerCase().includes('perfectas');
                const isCaso2 =
                  c.respuesta.toUpperCase().includes('CASO 2') ||
                  c.respuesta.toLowerCase().includes('no contesto') ||
                  c.respuesta.toLowerCase().includes('no contestó');
                const esSinOcam = Boolean(
                  c.sinOcamRelacionada || c.numeroOCAM === 'SIN OCAM' || !c.numeroOCAM
                );
                const totalHermanos = c.contactosRegistrados?.length || 1;

                return (
                  <tr key={c.id}>
                    {/* VÍNCULO OCAM O SIN OCAM */}
                    <td>
                      {esSinOcam ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          <GoogleIcon name="domain" size={14} color="#059669" />
                          <span>SIN OCAM</span>
                        </span>
                      ) : (
                        <span className="agenda-ocam-badge">
                          <GoogleIcon name="receipt" size={14} color="#1d4ed8" />
                          {c.numeroOCAM}
                        </span>
                      )}
                    </td>

                    {/* CONTACTOS_NUMERO */}
                    <td>
                      <div className="agenda-phone-wrap">
                        <a
                          href={`tel:${c.contactoNumero}`}
                          className="agenda-phone-link"
                          title="Llamar al contacto"
                        >
                          <GoogleIcon name="call" size={14} color="#0284c7" />
                          <span>{c.contactoNumero}</span>
                        </a>
                        <a
                          href={`https://wa.me/51${c.contactoNumero.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="agenda-wa-btn"
                          title="Enviar mensaje de WhatsApp"
                        >
                          <GoogleIcon name="chat" size={14} color="#ffffff" />
                        </a>
                      </div>
                    </td>

                    {/* CONTACTOS_NOMBRE */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div className="agenda-contact-name">{c.contactoNombre}</div>
                        {totalHermanos > 1 && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#2563eb',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              width: 'fit-content',
                            }}
                          >
                            👥 Registro múltiple ({totalHermanos} contactos)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CONTACTOS_AREA_CARGO */}
                    <td>
                      <div className="agenda-contact-cargo">{c.contactoAreaCargo}</div>
                    </td>

                    {/* RUC Y NOMBRE DE LA ENTIDAD */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {c.rucEntidad && (
                          <code
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#1e40af',
                              background: '#eff6ff',
                              padding: '1px 6px',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              width: 'fit-content',
                            }}
                          >
                            RUC: {c.rucEntidad}
                          </code>
                        )}
                        <strong style={{ fontSize: '0.84rem', color: '#1e293b' }}>
                          {c.empresaRelacionada}
                        </strong>
                        <span
                          className={`agenda-relacion-badge ${
                            c.tipoRelacion === 'Entidad Solicitante'
                              ? 'agenda-relacion-badge--solicitante'
                              : c.tipoRelacion === 'Entidad / Marca de Cotización'
                                ? 'agenda-relacion-badge--cotizacion'
                                : 'agenda-relacion-badge--exterior'
                          }`}
                        >
                          {c.tipoRelacion}
                        </span>
                      </div>
                    </td>

                    {/* CONTACTO_MOTIVO/DESCRIPCION */}
                    <td>
                      <div
                        style={{
                          maxWidth: '220px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.83rem',
                        }}
                        title={c.contactoMotivo}
                      >
                        {c.contactoMotivo}
                      </div>
                    </td>

                    {/* RESPUESTA */}
                    <td>
                      <span
                        className={`agenda-respuesta-badge ${
                          isCaso1
                            ? 'agenda-respuesta-badge--caso1'
                            : isCaso2
                              ? 'agenda-respuesta-badge--caso2'
                              : 'agenda-respuesta-badge--otro'
                        }`}
                        title={c.respuesta}
                      >
                        <GoogleIcon
                          name={isCaso1 ? 'verified' : isCaso2 ? 'phone_missed' : 'notes'}
                          size={14}
                        />
                        <span
                          style={{
                            maxWidth: '240px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.respuesta}
                        </span>
                      </span>
                    </td>

                    {/* TRAZABILIDAD */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span
                          className="agenda-trazabilidad-pill"
                          title="Registro inmutable de auditoría"
                        >
                          <GoogleIcon name="lock" size={12} color="#166534" />
                          <span>Inmutable</span>
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {c.registradoPor}
                        </span>
                        <span style={{ fontSize: '0.70rem', color: '#94a3b8' }}>
                          {formatFecha(c.fechaRegistro)}
                        </span>
                      </div>
                    </td>

                    {/* ACCIONES */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="agenda-view-btn"
                        onClick={() => onVerDetalle(c)}
                        title="Ver detalle completo y contactos asociados"
                      >
                        <GoogleIcon name="visibility" size={16} />
                        <span>Detalle</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
