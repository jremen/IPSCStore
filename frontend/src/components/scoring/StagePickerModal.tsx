import { Modal, ModalHeader, ModalBody } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../stores/scoringStore';
import { useStageStore } from '../../stores/stageStore';
import { useEscClose } from '../../hooks/useEscClose';
import { useScoringProgress } from '../../hooks/useScoringProgress';

export interface StagePickerModalProps {
  show: boolean;
  onClose: () => void;
}

export default function StagePickerModal({ show, onClose }: StagePickerModalProps) {
  const { t } = useTranslation();
  const { stages } = useStageStore();
  const { activeStageId, setActiveStageId, registrations, scoringProgress } = useScoringStore();

  useEscClose(show ? onClose : undefined);

  const handleSelect = (stageId: string) => {
    setActiveStageId(stageId);
    onClose();
  };

  const stageScored = (stageId: string) => {
    if (!scoringProgress || registrations.length === 0) return false;
    return scoringProgress.scored.filter((e: { stage_id: string }) => e.stage_id === stageId).length === registrations.length;
  };

  return (
    <Modal show={show} onClose={onClose} size="sm" dismissible>
      <ModalHeader>{t('auth.selectStage')}</ModalHeader>
      <ModalBody>
        <div className="space-y-1">
          {stages.map((stage) => {
            const isActive = stage.id === activeStageId;
            const scored = stageScored(stage.id);

            return (
              <button
                key={stage.id}
                onClick={() => handleSelect(stage.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between
                  ${isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 dark:ring-blue-700 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'
                  }`}
              >
                <span className="font-medium text-sm">
                  {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
                </span>
                {scored && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-[10px] leading-none">✓</span>
                )}
                {isActive && !scored && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] leading-none">●</span>
                )}
              </button>
            );
          })}
        </div>
      </ModalBody>
    </Modal>
  );
}
