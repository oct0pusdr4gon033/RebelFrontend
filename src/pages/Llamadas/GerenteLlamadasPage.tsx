import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import { SupervisionLlamadasView } from './SupervisionLlamadasView';
import { CargaLlamadasExcel } from './CargaLlamadasExcel';
import './GerenteLlamadasPage.css';

interface GerenteLlamadasPageProps {
  roleAccent?: string;
}

type LlamadasTab = 'supervision' | 'carga';

export function GerenteLlamadasPage({ roleAccent = '#2563eb' }: GerenteLlamadasPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: LlamadasTab = tabParam === 'carga' ? 'carga' : 'supervision';

  const setTab = (tab: LlamadasTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  return (
    <div className="gerente-llamadas" style={{ '--llamadas-accent': roleAccent } as CSSProperties}>
      <div className="gerente-llamadas__hero">
        <div className="gerente-llamadas__hero-main">
          <span className="gerente-llamadas__icon">
            <GoogleIcon name="support_agent" size={28} color={roleAccent} />
          </span>
          <div>
            <h1>Control de Llamadas Comerciales</h1>
            <p>
              Supervisa el cumplimiento diario por ejecutiva, autoriza desbloqueos
              excepcionales y carga el directorio semanal desde Excel.
            </p>
          </div>
        </div>
        <span className="gerente-llamadas__badge">
          <GoogleIcon name="schedule" size={15} color={roleAccent} />
          08:00 a 13:00 · 20 diarias · 100 semanales
        </span>
      </div>

      <div className="gerente-llamadas__tabs">
        <button
          type="button"
          className={`gerente-llamadas__tab ${
            activeTab === 'supervision' ? 'gerente-llamadas__tab--active' : ''
          }`}
          onClick={() => setTab('supervision')}
        >
          <GoogleIcon name="monitoring" size={17} />
          Supervisión del equipo
        </button>
        <button
          type="button"
          className={`gerente-llamadas__tab ${
            activeTab === 'carga' ? 'gerente-llamadas__tab--active' : ''
          }`}
          onClick={() => setTab('carga')}
        >
          <GoogleIcon name="upload_file" size={17} />
          Carga masiva
        </button>
      </div>

      {activeTab === 'supervision' ? (
        <SupervisionLlamadasView roleAccent={roleAccent} />
      ) : (
        <CargaLlamadasExcel roleAccent={roleAccent} />
      )}
    </div>
  );
}

export default GerenteLlamadasPage;
