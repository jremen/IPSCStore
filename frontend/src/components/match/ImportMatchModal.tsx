import { useRef, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchExport } from '../../hooks/useMatchExport';
import { useEscClose } from '../../hooks/useEscClose';
import { TbFileImport } from 'react-icons/tb';

interface ImportMatchModalProps {
  show: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportMatchModal({ show, onClose, onImported }: ImportMatchModalProps) {
  const { t } = useTranslation();
  const { importing, handleImport } = useMatchExport();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEscClose(onClose);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setError('');
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    try {
      await handleImport(selectedFile);
      setSelectedFile(null);
      setError('');
      onImported();
      onClose();
    } catch (err: any) {
      if (err.message?.includes('MATCH_ID_CONFLICT') || err.message?.includes('already exists')) {
        setError(t('matches.matchIdConflict'));
      } else {
        setError(err.message || t('matches.importError'));
      }
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setError('');
    onClose();
  };

  return (
    <Modal show={show} onClose={handleClose} size="md" className="dark:text-white">
      <ModalHeader>{t('matches.importMatch')}</ModalHeader>
      <ModalBody>
        <p className="mb-3">{t('matches.importMatchDescription')}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
        />
        {selectedFile && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{selectedFile.name}</p>
        )}
        {error && (
          <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
        )}
        <p className="text-sm text-red-600 mt-3 font-medium">{t('common.cannotBeUndone')}</p>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
        <Button color="red" onClick={handleConfirm} disabled={!selectedFile || importing}>
          {importing ? t('matches.importing') : t('matches.importMatch')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
