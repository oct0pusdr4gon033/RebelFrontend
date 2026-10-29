import type { PagoOC } from '../../../types/pagos';

export interface PropsHistorialPagosView {
  pagos: PagoOC[];
  roleAccent?: string;
  onNuevoPagoClick: () => void;
  onPagosActualizados: () => void;
  onFiltrarPorOC?: (numeroOC: string) => void;
  onCorregirPago?: (pago: PagoOC) => void;
}
