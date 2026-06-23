import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScoringStore, triggerSync } from '../stores/scoringStore';
import { useUIStore } from '../stores/uiStore';
import { api, getAuthToken } from '../services/api';
import { isNetworkError } from '../services/connectivity';
import * as offlineDB from '../services/offlineDB';

/**
 * Hook for DQ/Undq actions shared across all scoring sheets.
 * Returns state and handlers for the DQ modal, plus the handleDq/handleUndq functions.
 * Routes through the offline queue when offline or when the endpoint is unreachable.
 */
export function useDqActions() {
  const { currentRegistrationId, updateRegistrationLocal } = useScoringStore();
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();
  const [dqReason, setDqReason] = useState('');
  const [showDqModal, setShowDqModal] = useState(false);

  const handleDq = async () => {
    if (!activeMatchId || !currentRegistrationId) return;
    const reason = dqReason || t('scoring.dqReason');
    const token = getAuthToken() || '';
    const registrationId = currentRegistrationId;

    const queueDq = async () => {
      await offlineDB.addPendingSave({
        matchId: activeMatchId,
        stageId: '',
        registrationId,
        endpoint: 'dqShooter',
        payload: { dq_reason: reason },
        authToken: token,
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0,
      });
      updateRegistrationLocal(registrationId, { is_dq: true, dq_reason: reason });
      addToast(t('scoring.dqQueued', 'DQ saved offline — will sync when online'), 'info');
      triggerSync();
      setShowDqModal(false);
      setDqReason('');
    };

    if (!navigator.onLine) {
      await queueDq();
      return;
    }

    try {
      await api.dqShooter(activeMatchId, registrationId, reason);
      addToast(t('scoring.dqShooter'), 'success');
      const updatedRegs = await api.getRegistrations(activeMatchId);
      useScoringStore.setState({ registrations: updatedRegs });
      setShowDqModal(false);
      setDqReason('');
    } catch (err: any) {
      if (isNetworkError(err)) {
        await queueDq();
        return;
      }
      addToast(err.message, 'error');
    }
  };

  const handleUndq = async () => {
    if (!activeMatchId || !currentRegistrationId) return;
    const registrationId = currentRegistrationId;
    const token = getAuthToken() || '';

    const queueUndq = async () => {
      await offlineDB.addPendingSave({
        matchId: activeMatchId,
        stageId: '',
        registrationId,
        endpoint: 'undqShooter',
        payload: {},
        authToken: token,
        status: 'pending',
        createdAt: Date.now(),
        retryCount: 0,
      });
      updateRegistrationLocal(registrationId, { is_dq: false, dq_reason: undefined });
      addToast(t('scoring.undqQueued', 'DQ removal queued — will sync when online'), 'info');
      triggerSync();
    };

    if (!navigator.onLine) {
      await queueUndq();
      return;
    }

    try {
      await api.undqShooter(activeMatchId, registrationId);
      addToast(t('scoring.removeDq'), 'success');
      const updatedRegs = await api.getRegistrations(activeMatchId);
      useScoringStore.setState({ registrations: updatedRegs });
    } catch (err: any) {
      if (isNetworkError(err)) {
        await queueUndq();
        return;
      }
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