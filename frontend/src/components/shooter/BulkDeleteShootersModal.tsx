import { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { TbTrash } from "react-icons/tb";
import { useEscClose } from '../../hooks/useEscClose';

interface BulkDeleteShootersModalProps {
  show: boolean;
  onClose: () => void;
  shooterIds: string[];
  shooterNames: string[];
  onDeleted: () => void;
}

export default function BulkDeleteShootersModal({ show, onClose, shooterIds, shooterNames, onDeleted }: BulkDeleteShootersModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ deleted: number; failed: Array<{ id: string; name: string; reason: string }> } | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await api.bulkDeleteShooters(shooterIds);
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
      <ModalHeader>{t('bulkDelete.title')}</ModalHeader>
      <ModalBody>
        {result ? (
          <div className="space-y-3">
            {result.deleted > 0 && (
              <Alert color="success">
                {t('bulkDelete.success', { count: result.deleted })}
              </Alert>
            )}
            {result.failed.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('bulkDelete.partialSuccess', { deleted: result.deleted, failed: result.failed.length })}</p>
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
              {t('bulkDelete.confirm', { count: shooterIds.length })}
            </p>
            <div className="max-h-40 overflow-y-auto text-sm text-gray-600 dark:text-gray-400 border rounded p-2">
              {shooterNames.slice(0, 10).map((name, i) => (
                <div key={i}>{name}</div>
              ))}
              {shooterNames.length > 10 && (
                <div className="italic">...{t('bulkDelete.andMore', { count: shooterNames.length - 10 })}</div>
              )}
            </div>
            <Alert color="info">
              <span className="text-sm">{t('bulkDelete.softDeleteNote')}</span>
            </Alert>
            <p className="text-sm text-red-600 dark:text-red-400">{t('bulkDelete.cannotBeUndone')}</p>
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
              {loading ? t('common.loading') : t('bulkDelete.title')}
            </Button>
            <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
