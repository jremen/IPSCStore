import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';

interface DeleteMatchModalProps {
  show: boolean;
  onClose: () => void;
  matchId: string | null;
}

export default function DeleteMatchModal({ show, onClose, matchId }: DeleteMatchModalProps) {
  const { deleteMatch } = useMatchStore();
  const { t } = useTranslation();

  const handleDelete = async () => {
    if (!matchId) return;
    await deleteMatch(matchId);
    onClose();
  };

  return (
    <Modal show={show} onClose={onClose} size="md" className="dark:text-white">
      <ModalHeader>{t('matches.deleteMatch')}</ModalHeader>
      <ModalBody>
        <p>{t('matches.deleteMatchConfirm')}</p>
        <p className="text-sm text-red-600 mt-2 font-medium">{t('common.cannotBeUndone')}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={handleDelete}>{t('common.delete')}</Button>
      </ModalFooter>
    </Modal>
  );
}
