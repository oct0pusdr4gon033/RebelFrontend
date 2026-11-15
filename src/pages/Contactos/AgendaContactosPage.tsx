import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { useAuth } from '../../context/AuthContext';
import { RegistrarContactoView } from './RegistrarContactoView';
import { ListadoAgendaView } from './ListadoAgendaView';
import { DetalleContactoModal } from './DetalleContactoModal';
import { getContactosApi } from '../../api/services/contactos.service';
import type { ContactoOCAM } from '../../types/contactos';
import type { DirectorioLlamada } from '../../api/Dtos/Llamada';
import {
  AgendaLlamadasView,
  DirectorioLlamadasView,
  HistorialLlamadasView,
  RegistroLlamadaView,
} from '../Llamadas';
import './AgendaContactos.css';
import type { AgendaContactosPageProps } from './AgendaContactosPageProps';

type AgendaTab = 'registrar' | 'agenda' | 'directorio' | 'llamada' | 'programadas' | 'historial';

const AGENDA_TABS: AgendaTab[] = [
  'registrar',
  'agenda',
  'directorio',
  'llamada',
  'programadas',
  'historial',
];

const TABS_LLAMADAS: AgendaTab[] = ['directorio', 'llamada', 'programadas', 'historial'];

export const AgendaContactosPage: React.FC<AgendaContactosPageProps> = ({
  roleAccent = '#2563eb',
}) => {
  const { empleado } = useAuth();
  const rol = (empleado?.rolNombre || '').toLowerCase();
  const puedeGestionarLlamadas = rol.includes('ventas') && !rol.includes('master');
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tabSolicitada = AGENDA_TABS.includes(tabParam as AgendaTab)
    ? (tabParam as AgendaTab)
    : 'agenda';
  const activeTab: AgendaTab =
    !puedeGestionarLlamadas && TABS_LLAMADAS.includes(tabSolicitada)
      ? 'agenda'
      : tabSolicitada;

  const setActiveTab = (tab: AgendaTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  const [contactos, setContactos] = useState<ContactoOCAM[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ContactoOCAM | null>(null);
  const [contactoLlamada, setContactoLlamada] = useState<DirectorioLlamada | null>(null);
  const [llamadasRefreshKey, setLlamadasRefreshKey] = useState(0);

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

  const handleSeleccionarContactoLlamada = (contacto: DirectorioLlamada | null) => {
    setContactoLlamada(contacto);
    if (contacto) setActiveTab('llamada');
  };

  const handleLlamadaRegistrada = () => {
    setLlamadasRefreshKey((prev) => prev + 1);
    void cargarContactos();
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
              <h1>Agenda de Contactos y Llamadas</h1>
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
              Directorio comercial semanal, registro de llamadas, agenda programada y
              trazabilidad de contactos con entidades y órdenes de compra.
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
          <span>Agenda OCAM</span>
          <span className="agenda-push-btn__badge">{contactos.length}</span>
        </button>

        {puedeGestionarLlamadas && (
          <>
            <button
              type="button"
              className={`agenda-push-btn ${activeTab === 'directorio' ? 'agenda-push-btn--active' : ''}`}
              onClick={() => setActiveTab('directorio')}
            >
              <GoogleIcon name="call" size={18} />
              <span>Directorio</span>
            </button>

            <button
              type="button"
              className={`agenda-push-btn ${activeTab === 'llamada' ? 'agenda-push-btn--active' : ''}`}
              onClick={() => setActiveTab('llamada')}
            >
              <GoogleIcon name="phone_in_talk" size={18} />
              <span>Registrar llamada</span>
            </button>

            <button
              type="button"
              className={`agenda-push-btn ${activeTab === 'programadas' ? 'agenda-push-btn--active' : ''}`}
              onClick={() => setActiveTab('programadas')}
            >
              <GoogleIcon name="event" size={18} />
              <span>Programadas</span>
            </button>

            <button
              type="button"
              className={`agenda-push-btn ${activeTab === 'historial' ? 'agenda-push-btn--active' : ''}`}
              onClick={() => setActiveTab('historial')}
            >
              <GoogleIcon name="history" size={18} />
              <span>Historial</span>
            </button>
          </>
        )}
      </div>

      {/* ── VISTAS HIJAS SEGÚN TAB ACTIVA ── */}
      {activeTab === 'registrar' && (
        <RegistrarContactoView
          roleAccent={roleAccent}
          onContactoRegistrado={handleContactoRegistrado}
        />
      )}

      {activeTab === 'agenda' && (
        <ListadoAgendaView
          contactos={contactos}
          loading={loading}
          roleAccent={roleAccent}
          onVerDetalle={(c) => setContactoSeleccionado(c)}
          onIrARegistrar={() => setActiveTab('registrar')}
        />
      )}

      {activeTab === 'directorio' && (
        <DirectorioLlamadasView
          roleAccent={roleAccent}
          refreshKey={llamadasRefreshKey}
          onSeleccionarContacto={handleSeleccionarContactoLlamada}
        />
      )}

      {activeTab === 'llamada' && (
        <RegistroLlamadaView
          contacto={contactoLlamada}
          roleAccent={roleAccent}
          onSeleccionarContacto={handleSeleccionarContactoLlamada}
          onRegistered={handleLlamadaRegistrada}
        />
      )}

      {activeTab === 'programadas' && (
        <AgendaLlamadasView roleAccent={roleAccent} refreshKey={llamadasRefreshKey} />
      )}

      {activeTab === 'historial' && (
        <HistorialLlamadasView roleAccent={roleAccent} refreshKey={llamadasRefreshKey} />
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
