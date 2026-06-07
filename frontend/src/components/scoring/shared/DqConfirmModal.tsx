import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';

interface DqConfirmModalProps {
  show: boolean;
  onClose: () => void;
  shooterName: string;
  dqReason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export default function DqConfirmModal({ show, onClose, shooterName, dqReason, onReasonChange, onConfirm }: DqConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal show={show} onClose={onClose} size="sm">
      <ModalHeader>⚠️ {t('scoring.dqTitle')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
          {t('scoring.dqDescription', { name: shooterName })}
        </p>
        <div>
          <Label>{t('scoring.dqReason')}</Label>
          <TextInput
            placeholder={t('scoring.dqReasonPlaceholder')}
            value={dqReason}
            onChange={(e) => onReasonChange(e.target.value)}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={onConfirm}>{t('scoring.dqConfirm')}</Button>
      </ModalFooter>
    </Modal>
  );
}