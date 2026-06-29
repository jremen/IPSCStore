import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useEscClose } from '../../hooks/useEscClose';
import { TbTrash } from 'react-icons/tb';

interface BulkDeleteMatchesModalProps {
  show: boolean;
  onClose: () => void;
  matchIds: string[];
  matchNames: string[];
  onDeleted: () => void;
}

export default function BulkDeleteMatchesModal({ show, onClose, matchIds, matchNames, onDeleted }: BulkDeleteMatchesModalProps) {
  const { t } = useTranslation();
  const bulkDeleteMatches = useMatchStore((s) => s.bulkDeleteMatches);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ deleted: number; failed: Array<{ id: string; name: string; reason: string }> } | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await bulkDeleteMatches(matchIds);
      setResult(res);
      if (res.failed.length === 0) {
        onDeleted();
        setTimeout(onClose, 1500);
      }
    } catch (err: any) {
      setResult({ deleted: 0, failed: [{ id: '', name: '', reason: err.message || 'Unknown error' }] });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };
  useEscClose(handleClose);

  return (
    <Modal show={show} onClose={handleClose} size="md">
      <ModalHeader>{t('matches.bulkDeleteTitle')}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.deleted > 0 && (
              <Alert color="success">
                {t('matches.bulkDeleteSuccess', { count: result.deleted })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('matches.bulkDeletePartialSuccess', { deleted: result.deleted, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((f, i) => (
                    <li key={i}>{f.name || f.id}: {f.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3 dark:text-white">
            <p>
              {t('matches.bulkDeleteConfirm', { count: matchIds.length })}
            </p>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 border rounded p-2">
              {matchNames.slice(0, 10).map((name, i) => (
                <div key={i}>{name}</div>
              ))}
              {matchNames.length > 10 && (
                <div className="italic">...{t('matches.bulkDeleteAndMore', { count: matchNames.length - 10 })}</div>
              )}
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{t('matches.bulkDeleteCannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="red" onClick={handleDelete} disabled={loading}>
              <TbTrash className="size-4 mr-2" />
              {loading ? t('common.loading') : t('matches.bulkDeleteTitle')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
