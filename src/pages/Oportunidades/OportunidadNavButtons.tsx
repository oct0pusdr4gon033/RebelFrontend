import React from 'react';
import { GoogleIcon } from '../../components/GoogleIcon';

export type OportunidadTab = 'registrar' | 'mis-oportunidades' | 'listar' | 'podio' | 'subir-evidencia';

interface OportunidadNavButtonsProps {
  activeTab: OportunidadTab;
  onTabChange: (tab: OportunidadTab) => void;
  roleAccent: string;
  totalOportunidades?: number;
  totalEvidencias?: number;
}

export const OportunidadNavButtons: React.FC<OportunidadNavButtonsProps> = ({
  activeTab,
  onTabChange,
  roleAccent,
  totalOportunidades = 0,
  totalEvidencias = 0,
}) => {
  const tabs: {
    id: OportunidadTab;
    label: string;
    icon: string;
    badge?: string | number;
    description: string;
  }[] = [
    {
      id: 'registrar',
      label: 'Registrar',
      icon: 'flash_on',
      description: 'Formulario Exprés',
    },
    {
      id: 'mis-oportunidades',
      label: 'Mis Oportunidades',
      icon: 'person',
      description: 'Mi Pipeline',
    },
    {
      id: 'listar',
      label: 'Listar',
      icon: 'table_chart',
      badge: totalOportunidades > 0 ? totalOportunidades : undefined,
      description: 'Todas las Oportunidades',
    },
    {
      id: 'podio',
      label: 'Podio',
      icon: 'emoji_events',
      badge: 'Top Ventas',
      description: 'Ranking de Ejecutivas',
    },
    {
      id: 'subir-evidencia',
      label: 'Subir Evidencia',
      icon: 'upload_file',
      badge: totalEvidencias > 0 ? totalEvidencias : undefined,
      description: 'Constancias Perú Compras',
    },
  ];

  return (
    <div className="reg-push-bar" role="tablist" aria-label="Navegación de Oportunidades">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`reg-push-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            style={
              isActive
                ? ({
                    borderColor: `${roleAccent}40`,
                    color: roleAccent,
                    boxShadow: `0 4px 12px ${roleAccent}20`,
                  } as React.CSSProperties)
                : undefined
            }
          >
            <div
              className="reg-push-btn__icon"
              style={{
                background: isActive ? `${roleAccent}15` : 'transparent',
                color: isActive ? roleAccent : '#64748b',
              }}
            >
              <GoogleIcon
                name={tab.icon}
                size={18}
                color={isActive ? roleAccent : 'currentColor'}
              />
            </div>
            <div className="reg-push-btn__text">
              <span className="reg-push-btn__label">{tab.label}</span>
              <span className="reg-push-btn__desc">{tab.description}</span>
            </div>
            {tab.badge !== undefined && (
              <span
                className="reg-push-btn__badge"
                style={
                  isActive
                    ? { background: `${roleAccent}18`, color: roleAccent }
                    : undefined
                }
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
