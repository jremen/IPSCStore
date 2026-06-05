import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';

interface DeleteAllMatchesModalProps {
  show: boolean;
  onClose: () => void;
}

export default function DeleteAllMatchesModal({ show, onClose }: DeleteAllMatchesModalProps) {
  const { matches, deleteMatch } = useMatchStore();
  const { t } = useTranslation();

  const handleDeleteAll = async () => {
    for (const m of matches) {
      await deleteMatch(m.id);
    }
    onClose();
  };

  return (
    <Modal show={show} className="dark:text-white" onClose={onClose} size="md">
      <ModalHeader>{t('matches.deleteAllMatches')}</ModalHeader>
      <ModalBody>
        <p>{t('matches.deleteAllConfirm', { count: matches.length })}</p>
        <p className="text-sm text-gray-500 mt-1">{t('matches.deleteAllWarning')}</p>
        <p className="text-sm text-red-600 mt-2 font-medium">{t('common.cannotBeUndone')}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="red" onClick={handleDeleteAll}>{t('matches.deleteAllButton', { count: matches.length })}</Button>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}