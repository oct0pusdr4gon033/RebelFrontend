import { GoogleIcon } from '../../components/GoogleIcon/GoogleIcon';
import '../DashboardLayout.css';
import './Gerente.css';

interface GerenteModulePageProps {
  title: string;
  description: string;
}

export default function GerenteModulePage({ title, description }: GerenteModulePageProps) {
  return (
    <section className="dash__empty-state" aria-labelledby="gerente-module-title">
      <div className="dash__empty-state-icon">
        <GoogleIcon name="pending_actions" size={32} color="#2563eb" />
      </div>
      <h2 id="gerente-module-title">{title}</h2>
      <p>{description}</p>
      <span>Este módulo estará disponible cuando se integren sus servicios.</span>
    </section>
  );
}
