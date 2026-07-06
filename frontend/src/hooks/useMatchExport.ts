import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';

export function useMatchExport() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const addToast = useUIStore((s) => s.addToast);
  const { t } = useTranslation();

  const handleExport = useCallback(async (matchId: string, matchName: string) => {
    setExporting(true);
    try {
      const blob = await api.exportMatch(matchId);
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (matchName || 'match').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-${date}.match.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(t('matches.exportSuccess'), 'success');
    } catch (err: any) {
      addToast(err.message || t('matches.exportError'), 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, t]);

  const handleExportPsc = useCallback(async (matchId: string, matchName: string) => {
    setExporting(true);
    try {
      const blob = await api.exportMatchPsc(matchId);
      const date = new Date().toISOString().slice(0, 10);
      const safeName = (matchName || 'match').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-${date}.psc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast(t('matches.exportSuccess'), 'success');
    } catch (err: any) {
      addToast(err.message || t('matches.exportError'), 'error');
    } finally {
      setExporting(false);
    }
  }, [addToast, t]);

  const handleImport = useCallback(async (file: File, format?: 'json' | 'psc') => {
    setImporting(true);
    try {
      const ext = format || (file.name.endsWith('.psc') ? 'psc' : 'json');
      let result: any;
      if (ext === 'psc') {
        result = await api.importMatchPsc(file);
        if (result.synced_shooters && result.warnings?.length) {
          addToast(result.warnings[result.warnings.length - 1], 'info');
        }
        addToast(t('matches.importSuccess'), 'success');
      } else {
        result = await api.importMatch(file);
        addToast(t('matches.importSuccess'), 'success');
      }
      setTimeout(() => window.location.reload(), 1500);
      return result;
    } catch (err: any) {
      const msg = err.message || t('matches.importError');
      if (msg.includes('MATCH_ID_CONFLICT') || msg.includes('already exists')) {
        addToast(t('matches.matchIdConflict'), 'error');
      } else {
        addToast(msg, 'error');
      }
      throw err;
    } finally {
      setImporting(false);
    }
  }, [addToast, t]);

  return { exporting, importing, handleExport, handleExportPsc, handleImport };
}
