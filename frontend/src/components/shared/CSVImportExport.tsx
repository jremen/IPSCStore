import { useState, useEffect } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import CSVImportModal from './CSVImportModal';
import { TbFileImport, TbFileExport } from 'react-icons/tb';
import { onMenuAction } from '../../hooks/useMenuActions';

interface Props {
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
  onImportComplete?: () => void;
}

export default function CSVImportExport({ type, matchId, onImportComplete }: Props) {
  const { t } = useTranslation();
  const { addToast } = useUIStore();
  const [show, setShow] = useState(false);
  const [exporting, setExporting] = useState(false);

  const label = t('common.import');

  useEffect(() => {
    const action = type === 'shooters' ? 'import-shooters-csv' : type === 'registrations' ? 'import-registrations-csv' : null;
    if (!action) return;
    return onMenuAction(action, () => {
      if (type === 'registrations' && !matchId) return;
      setShow(true);
    });
  }, [type, matchId]);

  const handleExportRegistrations = async () => {
    if (!matchId) return;
    setExporting(true);
    try {
      const csv = await api.exportRegistrationCSV(matchId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations_${matchId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast(t('import.csvExported'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Button size="sm" color="light" onClick={() => setShow(true)}><TbFileImport className="mr-2 size-4" />{label}</Button>
      {type === 'registrations' && matchId && (
        <Button size="sm" color="light" onClick={handleExportRegistrations} disabled={exporting}>
          <TbFileExport className="mr-2 size-4" />
          {exporting ? t('import.exporting') : t('common.export')}
        </Button>
      )}
      <CSVImportModal show={show} onClose={() => setShow(false)} type={type} matchId={matchId} onImportComplete={onImportComplete} />
    </>
  );
}