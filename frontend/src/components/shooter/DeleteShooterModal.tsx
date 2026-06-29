import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useEscClose } from '../../hooks/useEscClose';

interface DeleteShooterModalProps {
  show: boolean;
  onClose: () => void;
  shooter: { id: string; first_name: string; last_name: string } | null;
  onDeleted: () => void;
}

export default function DeleteShooterModal({ show, onClose, shooter, onDeleted }: DeleteShooterModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEscClose(onClose);

  useEffect(() => {
    if (show && shooter) {
      setMatchesLoading(true);
      api.getShooterMatches(shooter.id)
        .then(setMatches)
        .catch(() => setMatches([]))
        .finally(() => setMatchesLoading(false));
    } else {
      setMatches([]);
    }
  }, [show, shooter]);

  const handleDelete = async () => {
    if (!shooter) return;
    setLoading(true);
    try {
      await api.deleteShooter(shooter.id);
      onDeleted();
      onClose();
    } catch {
      // Error toast is handled by the caller
    } finally {
      setLoading(false);
    }
  };

  if (!shooter) return null;
  const shooterName = `${shooter.first_name} ${shooter.last_name}`;

  return (
    <Modal show={show} onClose={onClose} size="md">
      <ModalHeader>{t('shooters.deleteTitle')}</ModalHeader>
      <ModalBody>
        <div className="space-y-3">
          <p>
            {t('shooters.deleteConfirm', { name: shooterName })}
          </p>

          {matchesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Spinner size="sm" />
              {t('common.loading')}
            </div>
          ) : matches.length > 0 ? (
            <Alert color="warning">
              <p className="font-medium mb-1">
                {t('shooters.deleteRegisteredWarning', { name: shooterName, count: matches.length })}
              </p>
              <ul className="text-sm list-disc pl-4 mt-1">
                {matches.slice(0, 5).map((m: any) => (
                  <li key={m.match_id}>
                    {m.match_name}{m.date ? ` (${new Date(m.date).toLocaleDateString()})` : ''}
                  </li>
                ))}
                {matches.length > 5 && (
                  <li className="italic">{t('bulkDelete.andMore', { count: matches.length - 5 })}</li>
                )}
              </ul>
            </Alert>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('shooters.deleteNoMatches')}
            </p>
          )}

          <p className="text-sm text-red-600 dark:text-red-400">{t('bulkDelete.cannotBeUndone')}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={handleDelete} disabled={loading}>
          {loading ? t('common.loading') : t('shooters.deleteTitle')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}