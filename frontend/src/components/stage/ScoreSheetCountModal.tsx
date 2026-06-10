import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import type { Stage } from '../../types/stage';

interface ScoreSheetCountModalProps {
  show: boolean;
  stages: Stage[];
  onClose: () => void;
  onGenerate: () => void;
}

export default function ScoreSheetCountModal({ show, stages, onClose, onGenerate }: ScoreSheetCountModalProps) {
  const { t } = useTranslation();

  // Filter out chrono stages (no meaningful score sheet)
  const printableStages = stages.filter(s => s.scoring_type !== 'chrono');

  const handleGenerate = () => {
    if (printableStages.length === 0) return;
    onGenerate();
  };

  return (
    <Modal show={show} onClose={onClose} size="sm">
      <ModalHeader>{t('stages.printScoreSheets')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('stages.printSheetsDescription', { defaultValue: `Generate blank score sheets for ${printableStages.length} stage(s). Set number of copies in the print dialog.` })}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button size="sm" onClick={handleGenerate} disabled={printableStages.length === 0}>
          {t('stages.printScoreSheets')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
