import { Badge, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDqActions } from '../../../hooks/useDqActions';
import DqConfirmModal from './DqConfirmModal';
import type { RegistrationWithShooter } from '../../../types/scoring';

/** DQ status badge, DQ/Undq button, and DQ reason modal — reads from store directly */
export default function DqSection({ shooter }: { shooter: RegistrationWithShooter | undefined }) {
  const { dqReason, setDqReason, showDqModal, setShowDqModal, handleDq, handleUndq } = useDqActions();
  const { t } = useTranslation();

  const isDq = shooter?.is_dq ?? false;

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>{t('scoring.dq')}</Label>
        {isDq ? (
          <div className="flex items-center gap-2">
            <Badge color="failure" size="sm">{t('registration.disqualified')}</Badge>
            <button
              className="scoring-btn rounded text-xs font-bold bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              onClick={handleUndq}
            >{t('scoring.removeDq')}</button>
          </div>
        ) : (
          <button
            className="scoring-btn px-4 rounded text-sm font-bold transition-colors bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
            onClick={() => setShowDqModal(true)}
          >{t('scoring.dqShooter')}</button>
        )}
      </div>

      <DqConfirmModal
        show={showDqModal}
        onClose={() => { setShowDqModal(false); setDqReason(''); }}
        shooterName={shooter ? `${shooter.first_name} ${shooter.last_name}` : ''}
        dqReason={dqReason}
        onReasonChange={setDqReason}
        onConfirm={handleDq}
      />
    </>
  );
}