import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useEscClose } from '../../../hooks/useEscClose';

interface RescoreConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shooterName: string;
  stageName: string;
}

export default function RescoreConfirmModal({
  show,
  onClose,
  onConfirm,
  shooterName,
  stageName,
}: RescoreConfirmModalProps) {
  const { t } = useTranslation();
  useEscClose(onClose);

  return (
    <Modal show={show} onClose={onClose} size="sm">
      <ModalHeader>⚠️ {t('scoring.rescoreTitle')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-600 dark:text-gray-200">
          {t('scoring.rescoreDescription', { name: shooterName, stage: stageName })}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={onConfirm}>{t('scoring.rescoreConfirm')}</Button>
      </ModalFooter>
    </Modal>
  );
}
