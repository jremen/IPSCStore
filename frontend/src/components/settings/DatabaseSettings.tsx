import { useState, useRef, useEffect } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDatabaseBackup } from '../../hooks/useDatabaseBackup';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

export default function DatabaseSettings() {
  const { exporting, importing, handleExport, handleImport } = useDatabaseBackup();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useTabMenuAction('export-database-backup', () => {
    if (!exporting && !importing) handleExport();
  });
  useTabMenuAction('import-database-backup', () => {
    if (!exporting && !importing) fileInputRef.current?.click();
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!selectedFile) return;
    setShowConfirm(false);
    await handleImport(selectedFile);
    setSelectedFile(null);
  };

  const cancelImport = () => {
    setShowConfirm(false);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold dark:text-white">{t('database.title')}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{t('database.description')}</p>

      <div className="flex gap-3 flex-wrap">
        <Button
          size="sm"
          color="blue"
          onClick={handleExport}
          disabled={exporting || importing}
        >
          {exporting ? t('database.exporting') : `📥 ${t('database.export')}`}
        </Button>
        <Button
          size="sm"
          color="green"
          onClick={handleImportClick}
          disabled={exporting || importing}
        >
          {importing ? t('database.importing') : `📤 ${t('database.import')}`}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".sql"
        className="hidden"
        onChange={handleFileSelect}
      />

      <Modal show={showConfirm} onClose={cancelImport} size="md" popup>
        <ModalHeader>{t('database.importConfirm')}</ModalHeader>
        <ModalBody>
          <Alert color="failure" className="mb-3">
            <p className="font-medium">{t('database.importWarning')}</p>
          </Alert>
          {selectedFile && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('database.file')} <span className="font-mono font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="gray" onClick={cancelImport} disabled={importing}>
            {t('common.cancel')}
          </Button>
          <Button color="red" onClick={confirmImport} disabled={importing}>
            {importing ? t('database.importing') : t('database.confirmButton')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
