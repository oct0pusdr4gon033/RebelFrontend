import React from 'react';
import { useSessionGuard } from '../../hooks/useSessionGuard';
import { SessionApprovalModal } from './SessionApprovalModal';

export const GlobalSessionGuard: React.FC = () => {
  const {
    pendingAlert,
    terminatedReason,
    isResolving,
    handleApprove,
    handleReject,
    handleDismissTerminated,
  } = useSessionGuard();

  return (
    <SessionApprovalModal
      alert={pendingAlert}
      terminatedReason={terminatedReason}
      isResolving={isResolving}
      onApprove={handleApprove}
      onReject={handleReject}
      onDismissTerminated={handleDismissTerminated}
    />
  );
};

export default GlobalSessionGuard;

