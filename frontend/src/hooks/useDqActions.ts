import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../stores/scoringStore';
import { useUIStore } from '../stores/uiStore';
import { api } from '../services/api';

/**
 * Hook for DQ/Undq actions shared across all scoring sheets.
 * Returns state and handlers for the DQ modal, plus the handleDq/handleUndq functions.
 */
export function useDqActions() {
  const { currentRegistrationId } = useScoringStore();
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const [dqReason, setDqReason] = useState('');
  const [showDqModal, setShowDqModal] = useState(false);

  const handleDq = async () => {
    if (!activeMatchId || !currentRegistrationId) return;
    try {
      await api.dqShooter(activeMatchId, currentRegistrationId, dqReason || t('scoring.dqReason'));
      addToast(t('scoring.dqShooter'), 'success');
      const updatedRegs = await api.getRegistrations(activeMatchId);
      useScoringStore.setState({ registrations: updatedRegs });
      setShowDqModal(false);
      setDqReason('');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleUndq = async () => {
    if (!activeMatchId || !currentRegistrationId) return;
    try {
      await api.undqShooter(activeMatchId, currentRegistrationId);
      addToast(t('scoring.removeDq'), 'success');
      const updatedRegs = await api.getRegistrations(activeMatchId);
      useScoringStore.setState({ registrations: updatedRegs });
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  return {
    dqReason,
    setDqReason,
    showDqModal,
    setShowDqModal,
    handleDq,
    handleUndq,
  };
}