import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  DiaNoLaborableRequest,
  DiaNoLaborableResponse,
} from '../../api/Dtos/DiaNoLaborable';
import type { SedeDto } from '../../api/Dtos/Sede';
import {
  actualizarDiaNoLaborable,
  crearDiaNoLaborable,
  obtenerDiasNoLaborables,
} from '../../api/services/configuracionAsistencia.service';
import { getSedes } from '../../api/services/sede.service';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import Swal from 'sweetalert2';
import '../DashboardLayout.css';
import './DiasNoLaborables.css';
import DiaNoLaborableFormModal from './components/DiaNoLaborableFormModal';

type AmbitoFiltro = 'todas' | 'globales' | 'sede';

function getTodayInPeru(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function getMonthStart(): string {
  return `${getTodayInPeru().slice(0, 7)}-01`;
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export default function DiasNoLaborablesPage() {
  const [sedes, setSedes] = useState<SedeDto[]>([]);
  const [sedesLoading, setSedesLoading] = useState(true);
  const [sedesError, setSedesError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState(getMonthStart);
  const [fechaFin, setFechaFin] = useState(getTodayInPeru);
  const [ambito, setAmbito] = useState<AmbitoFiltro>('todas');
  const [sedeId, setSedeId] = useState('');
  const [dias, setDias] = useState<DiaNoLaborableResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [modalDia, setModalDia] = useState<DiaNoLaborableResponse | null | undefined>();
  const [modalLoading, setModalLoading] = useState(false);
  const requestId = useRef(0);

  const sedesActivas = useMemo(() => sedes.filter((sede) => sede.activo), [sedes]);
  const sedesById = useMemo(
    () => new Map(sedes.map((sede) => [sede.id, sede.nombre])),
    [sedes],
  );
  const dateRangeValid = Boolean(
    /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) &&
    /^\d{4}-\d{2}-\d{2}$/.test(fechaFin) &&
    fechaInicio <= fechaFin,
  );

  const visibleDias = useMemo(() => {
    if (ambito === 'globales') return dias.filter((dia) => dia.sedeId === null);
    if (ambito === 'sede' && sedeId) {
      const selectedId = Number(sedeId);
      return dias.filter((dia) => dia.sedeId === null || dia.sedeId === selectedId);
    }
    return dias;
  }, [ambito, dias, sedeId]);

  const loadSedes = useCallback(async () => {
    setSedesLoading(true);
    setSedesError(null);
    try {
      setSedes(await getSedes(false));
    } catch (reason) {
      setSedesError(reason instanceof Error ? reason.message : 'No se pudieron cargar las sedes.');
    } finally {
      setSedesLoading(false);
    }
  }, []);

  const loadDias = useCallback(async (): Promise<boolean> => {
    if (!dateRangeValid) {
      setError('Selecciona fechas válidas y verifica que la fecha inicial no sea posterior a la final.');
      return false;
    }
    if (ambito === 'sede' && !sedeId) {
      setError('Selecciona una sede para consultar su ámbito.');
      return false;
    }

    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await obtenerDiasNoLaborables({
        fechaInicio,
        fechaFin,
        ...(ambito === 'sede' ? { sedeId: Number(sedeId) } : {}),
      });
      if (currentRequestId !== requestId.current) return false;
      setDias(result);
      setHasSearched(true);
      return true;
    } catch (reason) {
      if (currentRequestId !== requestId.current) return false;
      setDias([]);
      setHasSearched(false);
      setError(reason instanceof Error ? reason.message : 'No se pudieron consultar los días no laborables.');
      return false;
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [ambito, dateRangeValid, fechaFin, fechaInicio, sedeId]);

  useEffect(() => {
    void loadSedes();
  }, [loadSedes]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadDias();
  };

  const handleSave = async (
    request: DiaNoLaborableRequest,
    existing: DiaNoLaborableResponse | null,
  ) => {
    if (existing) {
      await actualizarDiaNoLaborable(existing.id, request);
    } else {
      await crearDiaNoLaborable(request);
    }

    setModalDia(undefined);
    setModalLoading(true);
    const refreshed = await loadDias();
    setModalLoading(false);
    await Swal.fire({
      icon: refreshed ? 'success' : 'warning',
      title: refreshed ? 'Día no laborable guardado' : 'Guardado con lista pendiente',
      text: refreshed
        ? `El día no laborable se ${existing ? 'actualizó' : 'registró'} correctamente.`
        : 'El servidor confirmó el guardado, pero no se pudo actualizar la lista. Intenta recargarla.',
      confirmButtonColor: '#2563eb',
    });
  };

  return (
    <div className="dias-no-laborables-page">
      <header className="dias-no-laborables-header">
        <div>
          <div className="dias-no-laborables-eyebrow">
            <GoogleIcon name="event_busy" size={18} color="#2563eb" />
            Configuración de asistencias
          </div>
          <h1>Días no laborables</h1>
          <p>Consulta y configura días no laborables globales o específicos de una sede.</p>
        </div>
        <button
          type="button"
          className="dias-no-laborables-button-primary"
          onClick={() => setModalDia(null)}
          disabled={sedesLoading || modalDia !== undefined || modalLoading}
        >
          <GoogleIcon name="add" size={18} color="#fff" />
          Registrar día
        </button>
      </header>

      <form className="dias-no-laborables-filters" onSubmit={handleSearch}>
        <div className="dias-no-laborables-field">
          <label htmlFor="dias-no-laborables-desde">Desde</label>
          <input
            id="dias-no-laborables-desde"
            type="date"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            required
          />
        </div>
        <div className="dias-no-laborables-field">
          <label htmlFor="dias-no-laborables-hasta">Hasta</label>
          <input
            id="dias-no-laborables-hasta"
            type="date"
            value={fechaFin}
            onChange={(event) => setFechaFin(event.target.value)}
            required
          />
        </div>
        <div className="dias-no-laborables-field">
          <label htmlFor="dias-no-laborables-ambito">Ámbito de consulta</label>
          <select
            id="dias-no-laborables-ambito"
            value={ambito}
            onChange={(event) => setAmbito(event.target.value as AmbitoFiltro)}
          >
            <option value="todas">Todas las sedes</option>
            <option value="globales">Globales</option>
            <option value="sede">Sede específica</option>
          </select>
        </div>
        {ambito === 'sede' && (
          <div className="dias-no-laborables-field dias-no-laborables-field--sede">
            <label htmlFor="dias-no-laborables-sede">Sede</label>
            <select
              id="dias-no-laborables-sede"
              value={sedeId}
              onChange={(event) => setSedeId(event.target.value)}
              disabled={sedesLoading || sedesActivas.length === 0}
              required
            >
              <option value="">Seleccionar sede</option>
              {sedesActivas.map((sede) => (
                <option value={sede.id} key={sede.id}>{sede.nombre}</option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="dias-no-laborables-button-secondary" disabled={loading || !dateRangeValid || (ambito === 'sede' && !sedeId)}>
          <GoogleIcon name={loading ? 'hourglass_top' : 'search'} size={18} color="#2563eb" />
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {sedesError && (
        <div className="dias-no-laborables-alert" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{sedesError}</span>
          <button type="button" onClick={() => void loadSedes()}>Reintentar</button>
        </div>
      )}
      {error && (
        <div className="dias-no-laborables-alert" role="alert">
          <GoogleIcon name="error" size={18} color="#dc2626" />
          <span>{error}</span>
          <button type="button" onClick={() => void loadDias()}>Reintentar</button>
        </div>
      )}

      <p className="dias-no-laborables-filter-note">
        {ambito === 'todas'
          ? 'Se consultan registros globales y de todas las sedes.'
          : ambito === 'globales'
            ? 'El servicio devuelve todas las sedes y la pantalla muestra únicamente registros globales.'
            : 'El servicio devuelve los registros globales y los de la sede seleccionada.'}
      </p>

      {loading ? (
        <div className="dias-no-laborables-state">
          <span className="dias-no-laborables-spinner" aria-hidden="true" />
          <p>Consultando días no laborables...</p>
        </div>
      ) : hasSearched && !error && visibleDias.length === 0 ? (
        <div className="dias-no-laborables-state">
          <GoogleIcon name="event_available" size={38} color="#94a3b8" />
          <h2>Sin días no laborables</h2>
          <p>No se encontraron registros para el rango y ámbito seleccionados.</p>
        </div>
      ) : hasSearched && !error && (
        <section className="dias-no-laborables-results" aria-labelledby="dias-no-laborables-list-title">
          <div className="dias-no-laborables-results-header">
            <div>
              <h2 id="dias-no-laborables-list-title">Registros encontrados</h2>
              <p>{visibleDias.length} {visibleDias.length === 1 ? 'registro' : 'registros'}</p>
            </div>
            <button type="button" className="dias-no-laborables-refresh" onClick={() => void loadDias()} disabled={loading} aria-label="Actualizar resultados">
              <GoogleIcon name="refresh" size={19} color="#2563eb" />
            </button>
          </div>
          <div className="dias-no-laborables-list">
            {visibleDias.map((dia) => {
              const alcanceLabel = dia.sedeId === null
                ? 'Global'
                : sedesById.get(dia.sedeId) ?? `Sede #${dia.sedeId}`;
              return (
                <article className="dia-no-laborable-card" key={dia.id}>
                  <div className="dia-no-laborable-card-main">
                    <span className={`dia-no-laborable-scope${dia.sedeId === null ? ' dia-no-laborable-scope--global' : ''}`}>
                      <GoogleIcon name={dia.sedeId === null ? 'public' : 'store'} size={16} color={dia.sedeId === null ? '#7c3aed' : '#2563eb'} />
                      {alcanceLabel}
                    </span>
                    <h3>{formatDate(dia.fecha)}</h3>
                    <p>{dia.descripcion}</p>
                  </div>
                  <button
                    type="button"
                    className="dias-no-laborables-button-secondary"
                    onClick={() => setModalDia(dia)}
                    disabled={modalDia !== undefined || modalLoading}
                  >
                    <GoogleIcon name="edit" size={17} color="#2563eb" />
                    Editar
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {!hasSearched && !loading && !error && (
        <div className="dias-no-laborables-state">
          <GoogleIcon name="filter_alt" size={38} color="#94a3b8" />
          <h2>Consulta un rango de fechas</h2>
          <p>Selecciona el periodo y el ámbito para ver los días no laborables registrados.</p>
        </div>
      )}

      {modalDia !== undefined && !sedesLoading && (
        <DiaNoLaborableFormModal
          sedes={sedesActivas}
          dia={modalDia}
          diasExistentes={dias}
          onClose={() => setModalDia(undefined)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
