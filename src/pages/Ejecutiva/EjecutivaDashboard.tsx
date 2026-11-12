import { Link } from 'react-router-dom'; import { useAuth } from '../../context/AuthContext';
import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';

import { OportunidadesDashboard } from '../../components/OportunidadesDashboard';
import { ColorVariable } from './ColorsVariables'

export default function EjecutivaDashboard() {
    const { empleado } = useAuth();
    const colores = new ColorVariable();


    return (
        <>
            <div
                className="dash__welcome"
                style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(8,145,178,0.06))',
                    border: `1.5px solid ${colores.ACCENT_BORDER}`,
                }}
            >
                <div className="dash__welcome-tag" style={{ color: colores.ACCENT, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GoogleIcon name="work" size={16} color={colores.ACCENT} />
                    <span>Ejecutiva de Ventas</span>
                </div>
                <h2>¡Bienvenida, {empleado?.nombres ?? 'Rebel'}!</h2>
                <p>
                    ¡Es hora de romper récords! Registra tus ventas, revisa tus metas y sube en el ranking.
                </p>
            </div>

            <OportunidadesDashboard
                scope="personal"
                detailPath="/ejecutiva/registro-oportunidad?tab=mis-oportunidades"
                accent={colores.ACCENT}
            />

            <p className="dash__section-title">Acciones Rápidas</p>
            <div className="dash__actions-grid">
                <Link to="/ejecutiva/registro-oportunidad" style={{ textDecoration: 'none' }}>
                    <button className="dash__action-btn" style={{ borderColor: colores.ACCENT_BORDER, width: '100%' }}>
                        <div className="dash__action-btn-icon">
                            <GoogleIcon name="assignment" size={24} color={colores.ACCENT} />
                        </div>
                        <strong>Registro Oportunidad</strong>
                        <span>Licitación Perú Compras</span>
                    </button>
                </Link>
                <Link to="/ejecutiva/cartera" style={{ textDecoration: 'none' }}>
                    <button className="dash__action-btn" style={{ borderColor: colores.ACCENT_BORDER, width: '100%' }}>
                        <div className="dash__action-btn-icon">
                            <GoogleIcon name="folder_shared" size={24} color={colores.ACCENT} />
                        </div>
                        <strong>Ver Cartera</strong>
                        <span>Mis clientes</span>
                    </button>
                </Link>
                <Link to="/ejecutiva/ranking" style={{ textDecoration: 'none' }}>
                    <button className="dash__action-btn" style={{ borderColor: colores.ACCENT_BORDER, width: '100%' }}>
                        <div className="dash__action-btn-icon">
                            <GoogleIcon name="leaderboard" size={24} color={colores.ACCENT} />
                        </div>
                        <strong>Ver Ranking</strong>
                        <span>Mi posición hoy</span>
                    </button>
                </Link>
                <Link to="/ejecutiva/reportes" style={{ textDecoration: 'none' }}>
                    <button className="dash__action-btn" style={{ borderColor: colores.ACCENT_BORDER, width: '100%' }}>
                        <div className="dash__action-btn-icon">
                            <GoogleIcon name="bar_chart" size={24} color={colores.ACCENT} />
                        </div>
                        <strong>Mis Reportes</strong>
                        <span>Historial de ventas</span>
                    </button>
                </Link>
            </div>
        </>
    );
}