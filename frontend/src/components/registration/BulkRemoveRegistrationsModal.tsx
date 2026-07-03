import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useEscClose } from '../../hooks/useEscClose';

interface BulkRemoveRegistrationsModalProps {
  show: boolean;
  onClose: () => void;
  registrationIds: string[];
  registrationNames: string[];
  matchId: string;
  onRemoved: () => void;
}

export default function BulkRemoveRegistrationsModal({ show, onClose, registrationIds, registrationNames, matchId, onRemoved }: BulkRemoveRegistrationsModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ removed: number; failed: Array<{ id: string; name: string; reason: string }> } | null>(null);

  const handleRemove = async () => {
    setLoading(true);
    try {
      const res = await api.bulkRemoveRegistrations(matchId, registrationIds);
      setResult(res);
      if (res.failed.length === 0) {
        onRemoved();
        setTimeout(onClose, 1500);
      }
    } catch (err: any) {
      setResult({ removed: 0, failed: [{ id: '', name: '', reason: err.message || t('common.unknownError') }] });
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
      <ModalHeader>{t('bulkRemove.title')}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.removed > 0 && (
              <Alert color="success">
                {t('bulkRemove.success', { count: result.removed })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('bulkRemove.partialSuccess', { removed: result.removed, failed: result.failed.length })}</p>
                <ul className="text-sm list-disc pl-4">
                  {result.failed.map((f, i) => (
                    <li key={i}>{f.name || f.id}: {f.reason}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p>
              {t('bulkRemove.confirm', { count: registrationIds.length })}
            </p>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 border rounded p-2">
              {registrationNames.slice(0, 10).map((name, i) => (
                <div key={i}>{name}</div>
              ))}
              {registrationNames.length > 10 && (
                <div className="italic">...{t('bulkDelete.andMore', { count: registrationNames.length - 10 })}</div>
              )}
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{t('bulkRemove.cannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {result ? (
          <Button color="gray" onClick={handleClose}>{t('common.close')}</Button>
        ) : (
          <>
            <Button color="failure" onClick={handleRemove} disabled={loading}>
              {loading ? t('common.loading') : t('bulkRemove.title')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}