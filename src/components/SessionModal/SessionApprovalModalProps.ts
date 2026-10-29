
import type { SessionAlert } from '../../api/Dtos/Login';

export interface SessionApprovalModalProps {
    alert: SessionAlert | null;
    terminatedReason: string | null;
    isResolving: boolean;
    onApprove: () => void;
    onReject: () => void;
    onDismissTerminated?: () => void;
}
