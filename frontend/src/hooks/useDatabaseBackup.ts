import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';

export function useDatabaseBackup() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const blob = await api.exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ipscscore-backup-${date}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(t('database.exportSuccess'), 'success');
    } catch (err: any) {
      addToast(err.message || t('database.exportError'), 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, t]);

  const handleImport = useCallback(async (file: File) => {
    setImporting(true);
    try {
      const result = await api.importBackup(file);
      addToast(t('database.importSuccess'), 'success');
      // Reload the page after a short delay so the new data shows
      setTimeout(() => window.location.reload(), 1500);
      return result;
    } catch (err: any) {
      addToast(err.message || t('database.importError'), 'error');
    } finally {
      setImporting(false);
    }
  }, [addToast, t]);

  return { exporting, importing, handleExport, handleImport };
}