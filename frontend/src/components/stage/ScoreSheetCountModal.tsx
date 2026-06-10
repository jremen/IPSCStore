import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Label, Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import type { Stage } from '../../types/stage';

interface ScoreSheetCountModalProps {
  show: boolean;
  stages: Stage[];
  onClose: () => void;
  onGenerate: (stageIds: string[], sheetCount: number) => void;
}

export default function ScoreSheetCountModal({ show, stages, onClose, onGenerate }: ScoreSheetCountModalProps) {
  const { t } = useTranslation();
  const [sheetCount, setSheetCount] = useState(5);
  const [selectedStages, setSelectedStages] = useState<Set<string>>(new Set(stages.map(s => s.id)));

  // Filter out chrono stages (no meaningful score sheet)
  const printableStages = stages.filter(s => s.scoring_type !== 'chrono');

  const toggleStage = (id: string) => {
    setSelectedStages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedStages.size === printableStages.length) {
      setSelectedStages(new Set());
    } else {
      setSelectedStages(new Set(printableStages.map(s => s.id)));
    }
  };

  const handleGenerate = () => {
    if (selectedStages.size === 0 || sheetCount < 1) return;
    onGenerate([...selectedStages], sheetCount);
  };

  return (
    <Modal show={show} onClose={onClose} size="md">
      <ModalHeader>{t('stages.printScoreSheets')}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          <div>
            <Label className="mb-1 block">{t('stages.numberOfShooters')}</Label>
            <TextInput
              type="number"
              min={1}
              max={50}
              value={sheetCount}
              onChange={e => setSheetCount(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>{t('stages.selectStages')}</Label>
              <Button size="xs" color="light" onClick={toggleAll}>
                {selectedStages.size === printableStages.length ? t('common.no', { defaultValue: 'Deselect All' }) : t('stages.selectAllStages')}
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {printableStages.map(stage => (
                <label key={stage.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedStages.has(stage.id)}
                    onChange={() => toggleStage(stage.id)}
                  />
                  <span className="text-sm dark:text-white">
                    #{stage.stage_number} {stage.name}
                  </span>
                </label>
              ))}
              {printableStages.length === 0 && (
                <p className="text-sm text-gray-500">{t('stages.empty')}</p>
              )}
            </div>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" onClick={handleGenerate} disabled={selectedStages.size === 0 || sheetCount < 1}>
          {t('stages.printScoreSheets')}
        </Button>
        <Button size="sm" color="light" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}