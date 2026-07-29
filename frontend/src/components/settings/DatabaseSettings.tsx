import { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, ToggleSwitch, Spinner, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useDatabaseBackup } from '../../hooks/useDatabaseBackup';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';
import { api } from '../../services/api';

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron?.();

export default function DatabaseSettings() {
  const { exporting, importing, handleExport, handleImport } = useDatabaseBackup();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Local backup state
  const [backupFolder, setBackupFolder] = useState('');
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [lastFull, setLastFull] = useState<string | null>(null);
  const [deltasSinceFull, setDeltasSinceFull] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');
  const [folderAccessible, setFolderAccessible] = useState(true);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{
    folder: string;
    fullFile: string;
    fullSize: number;
    fullDate: string;
    deltasCount: number;
    deltaDates: { earliest: string | null; latest: string | null };
  } | null>(null);
  const [restoring, setRestoring] = useState(false);

  useTabMenuAction('export-database-backup', () => {
    if (!exporting && !importing) handleExport();
  });
  useTabMenuAction('import-database-backup', () => {
    if (!exporting && !importing) fileInputRef.current?.click();
  });

  // Load backup status
  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getLocalBackupStatus();
      setBackupFolder(status.folder);
      setBackupEnabled(status.enabled);
      setLastFull(status.lastFullBackupAt);
      setDeltasSinceFull(status.deltasSinceFull);
      setDiskUsage(status.diskUsage);
      setFolderAccessible(status.folderAccessible);
    } catch {
      // Not configured yet
    }
  }, []);

  useEffect(() => {
    if (isElectron) loadStatus();
  }, [loadStatus]);

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirm(true);
    }
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

  // --- Local backup handlers ---

  const pickBackupFolder = async () => {
    const path = await window.electronAPI?.pickBackupFolder();
    if (path) {
      try {
        await api.saveLocalBackupConfig({ folder: path, enabled: true });
        setBackupFolder(path);
        setBackupEnabled(true);
        setMessage(t('localBackup.folderSet'));
        await loadStatus();
      } catch (err: any) {
        setMessage(err.message);
      }
    }
  };

  const handleBackupNow = async () => {
    setTriggering(true);
    try {
      const result = await api.triggerLocalBackup();
      setMessage(t('localBackup.backupDone', { key: result.key }));
      await loadStatus();
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setTriggering(false);
    }
  };

  const handleToggle = async (newVal: boolean) => {
    setBackupEnabled(newVal);
    try {
      await api.saveLocalBackupConfig({ enabled: newVal });
    } catch (err: any) {
      setBackupEnabled(!newVal);
      setMessage(err.message);
    }
  };

  const handleRestoreFolder = async () => {
    const folder = await window.electronAPI?.pickBackupFolder();
    if (!folder) return;
    try {
      const preview = await api.previewLocalBackupFolder(folder);
      setRestorePreview({ folder, ...preview });
      setShowRestoreConfirm(true);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const confirmRestore = async () => {
    if (!restorePreview) return;
    setShowRestoreConfirm(false);
    setRestoring(true);
    try {
      const result = await api.restoreLocalBackupFromFolder(restorePreview.folder);
      setMessage(t('localBackup.restoreDone', { deltas: result.deltasApplied }));
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setRestoring(false);
      setRestorePreview(null);
    }
  };

  const cancelRestore = () => {
    setShowRestoreConfirm(false);
    setRestorePreview(null);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t('database.unitsByte')}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('database.unitsKb')}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('database.unitsMb')}`;
  };

  return (
    <div className="relative border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex flex-col h-full space-y-4">

        {(importing || exporting) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-gray-800/50 dark:text-white">
            <Spinner size="lg" />
            <h3 className="text-xl">
              {importing ? t('database.importing') : t('database.exporting')}
            </h3>
            <p className="text-sm text-gray-200">{t('database.busyWait')}</p>
          </div>
        )}
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

        {/* ─── Local Automatic Backup (Electron only) ─── */}
        {isElectron && (
          <div className="relative border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
            <h3 className="text-lg font-semibold dark:text-white">{t('localBackup.title')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('localBackup.description')}</p>

            <div className="space-y-3">
              {/* Folder selection */}
                {backupFolder ? (
                  <div className="flex items-center gap-2 text-sm dark:text-white">
                    <span className="text-blue-600 dark:text-blue-400">📁</span>
                    <span className="font-mono truncate">{backupFolder}</span>
                    <Button size="xs" color="gray" onClick={pickBackupFolder}>
                      {t('localBackup.changeFolder')}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" color="blue" onClick={pickBackupFolder}>
                    {t('localBackup.pickFolder')}
                  </Button>
                )}

              {/* Status */}
              {backupFolder && (
                <div className="text-sm space-y-1 p-3 bg-gray-50 dark:bg-gray-800 dark:text-white rounded-lg">
                  <Label htmlFor="backup" className="cursor-pointer flex items-center gap-3">
                    <ToggleSwitch
                      checked={backupEnabled}
                      onChange={handleToggle}
                      disabled={!folderAccessible}
                      id="backup"
                    />
                    <span>{backupEnabled ? t('localBackup.enabled') : t('localBackup.disabled')}</span>
                  </Label>
                  {!folderAccessible && (
                    <Alert color="warning" className="mt-2">
                      <p className="text-sm font-medium">{t('localBackup.folderNotAccessible')}</p>
                    </Alert>
                  )}
                  <p>
                    <span className="font-medium">{t('localBackup.lastFull')}:</span>{' '}
                    {lastFull ? new Date(lastFull).toLocaleString() : t('localBackup.never')}
                  </p>
                  <p>
                    <span className="font-medium">{t('localBackup.deltas')}:</span> {deltasSinceFull}
                  </p>
                  <p>
                    <span className="font-medium">{t('localBackup.diskUsage')}:</span> {formatBytes(diskUsage)}
                  </p>
                </div>
              )}

              {/* Buttons */}
              {backupFolder && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" color="purple" onClick={handleBackupNow} disabled={restoring || triggering}>
                    {triggering ? '...' : t('localBackup.backupNow')}
                  </Button>
                  <Button size="sm" color="red" onClick={handleRestoreFolder} disabled={restoring}>
                    {restoring ? '...' : t('localBackup.restore')}
                  </Button>
                </div>
              )}

              {message && (
                <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>
              )}
            </div>

            <Modal show={showRestoreConfirm} onClose={cancelRestore} size="md" popup>
              <ModalHeader>{t('localBackup.restoreConfirm')}</ModalHeader>
              <ModalBody>
                <Alert color="failure" className="mb-3">
                  <p className="font-medium">{t('localBackup.restoreWarning')}</p>
                </Alert>
                {restorePreview && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>{t('localBackup.restoreFrom')} <span className="font-mono font-medium">{restorePreview.folder}</span></p>
                    <p>{t('localBackup.restoreSummary', {
                      file: restorePreview.fullFile,
                      size: formatBytes(restorePreview.fullSize),
                      deltas: restorePreview.deltasCount,
                      earliest: restorePreview.deltaDates.earliest
                        ? new Date(restorePreview.deltaDates.earliest).toLocaleString()
                        : t('localBackup.never'),
                      latest: restorePreview.deltaDates.latest
                        ? new Date(restorePreview.deltaDates.latest).toLocaleString()
                        : t('localBackup.never'),
                    })}</p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="gray" onClick={cancelRestore} disabled={restoring}>
                  {t('common.cancel')}
                </Button>
                <Button color="red" onClick={confirmRestore} disabled={restoring}>
                  {restoring ? '...' : t('localBackup.restoreConfirm')}
                </Button>
              </ModalFooter>
            </Modal>
            {restoring && <div className="absolute flex top-0 left-0 z-1 size-full bg-gray-800/50 rounded-lg pt-4 flex-col gap-4 items-center justify-center dark:text-white">
              <Spinner size="lg" />
              <h3 className="text-xl">{t('localBackup.restoring')}</h3>
            </div>
            }
          </div>
        )}
      </div>
    </div>
  );
}
