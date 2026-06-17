import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Label, Select } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../../hooks/useEscClose';
import { DQ_REASONS } from '../../../utils/constants';

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
  useEscClose(onClose);

  return (
    <Modal show={show} onClose={onClose} size="sm">
      <ModalHeader>⚠️ {t('scoring.dqTitle')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-200 mb-3">
          {t('scoring.dqDescription', { name: shooterName })}
        </p>
        <div>
          <Label>{t('scoring.dqReason')}</Label>
          <Select
            value={dqReason}
            onChange={(e) => onReasonChange(e.target.value)}
          >
            <option value="">{t('scoring.dqReasonPlaceholder')}</option>
            {DQ_REASONS.map((r) => (
              <option key={r.value} value={t(r.i18nKey)}>
                {t(r.i18nKey)}
              </option>
            ))}
          </Select>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={onConfirm}>{t('scoring.dqConfirm')}</Button>
      </ModalFooter>
    </Modal>
  );
}