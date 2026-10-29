import type { Oportunidad } from "../../types/oportunidades";
import type { DictamenBuenaProConfirmPayload } from "./IDictamenBuenaProConfirmPayload";

export interface DictamenBuenaProModalProps {
    ganadorOp: Oportunidad;
    otrosCompetidores: Oportunidad[];
    onClose: () => void;
    onConfirm: (payload: DictamenBuenaProConfirmPayload) => Promise<void>;
    procesando?: boolean;
}
