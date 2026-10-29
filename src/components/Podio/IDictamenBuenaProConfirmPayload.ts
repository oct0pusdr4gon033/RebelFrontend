import type { DesestimacionIndividualItem } from "./IDesestimacionIndividualItem";


export interface DictamenBuenaProConfirmPayload {
    ganadorId: string | number;
    comentarioGanador: string;
    desestimaciones: DesestimacionIndividualItem[];
}
