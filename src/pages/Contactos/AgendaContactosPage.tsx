import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { RegistrarContactoView } from './RegistrarContactoView';
import { ListadoAgendaView } from './ListadoAgendaView';
import { DetalleContactoModal } from './DetalleContactoModal';
import { getContactosApi } from '../../api/services/contactos.service';
import type { ContactoOCAM } from '../../types/contactos';
import './AgendaContactos.css';

interface AgendaContactosPageProps {
  roleAccent?: string;
}

export const AgendaContactosPage: React.FC<AgendaContactosPageProps> = ({
  roleAccent = '#2563eb',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: 'registrar' | 'agenda' = tabParam === 'registrar' ? 'registrar' : 'agenda';

  const setActiveTab = (tab: 'registrar' | 'agenda') => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const [contactos, setContactos] = useState<ContactoOCAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoOCAM | null>(null);

  const cargarContactos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContactosApi();
      setContactos(data);
    } catch (err) {
      console.error('Error al cargar contactos de OCAM:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  const handleContactoRegistrado = () => {
    cargarContactos();
    setActiveTab('agenda');
  };

  return (
    <div className="agenda-page" style={{ '--agenda-accent': roleAccent } as React.CSSProperties}>
      {/* ── HERO BANNER SUPERIOR ── */}
      <div className="agenda-hero">
        <div className="agenda-hero__left">
          <div className="agenda-hero__icon" style={{ background: `${roleAccent}15`, color: roleAccent }}>
            <GoogleIcon name="contact_phone" size={28} color={roleAccent} />
          </div>
          <div className="agenda-hero__title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>Agenda de Contactos OCAM</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #86efac',
                }}
              >
                Trazabilidad 100% Inmutable
              </span>
            </div>
            <p>
              Directorio de comunicaciones, seguimiento de órdenes de compra y trazabilidad con entidades, marcas y relaciones exteriores.
            </p>
          </div>
        </div>

        <div
          className="agenda-hero__tag"
          style={{ background: `${roleAccent}12`, color: roleAccent, border: `1.5px solid ${roleAccent}30` }}
        >
          <GoogleIcon name="verified_user" size={16} color={roleAccent} />
          <span>Auditoría &bull; Perú Compras</span>
        </div>
      </div>

      {/* ── PUSH-BUTTON TABS DE NAVEGACIÓN (FORMATO PADRE E HIJO) ── */}
      <div className="agenda-push-tabs">
        <button
          type="button"
          className={`agenda-push-btn ${activeTab === 'registrar' ? 'agenda-push-btn--active' : ''}`}
          onClick={() => setActiveTab('registrar')}
        >
          <GoogleIcon name="person_add" size={18} />
          <span>Registrar</span>
        </button>

        <button
          type="button"
          className={`agenda-push-btn ${activeTab === 'agenda' ? 'agenda-push-btn--active' : ''}`}
          onClick={() => setActiveTab('agenda')}
        >
          <GoogleIcon name="import_contacts" size={18} />
          <span>Agenda</span>
          <span className="agenda-push-btn__badge">{contactos.length}</span>
        </button>
      </div>

      {/* ── VISTAS HIJAS SEGÚN TAB ACTIVA ── */}
      {activeTab === 'registrar' ? (
        <RegistrarContactoView
          roleAccent={roleAccent}
          onContactoRegistrado={handleContactoRegistrado}
        />
      ) : (
        <ListadoAgendaView
          contactos={contactos}
          loading={loading}
          roleAccent={roleAccent}
          onVerDetalle={(c) => setContactoSeleccionado(c)}
          onIrARegistrar={() => setActiveTab('registrar')}
        />
      )}

      {/* ── MODAL DE DETALLE Y TRAZABILIDAD ── */}
      <DetalleContactoModal
        contacto={contactoSeleccionado}
        onClose={() => setContactoSeleccionado(null)}
        roleAccent={roleAccent}
      />
    </div>
  );
};

export default AgendaContactosPage;
