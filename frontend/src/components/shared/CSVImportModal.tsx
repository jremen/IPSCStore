import { useState, useCallback, useMemo } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, Select, Label, Checkbox } from 'flowbite-react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import type { CSVImportResult } from '../../types/results';

interface Props {
  show: boolean;
  onClose: () => void;
  type: 'shooters' | 'registrations' | 'scores';
  matchId?: string;
}

const COLUMN_DEFINITIONS: Record<string, { key: string; labelKey: string; required: boolean }[]> = {
  shooters: [
    { key: 'first_name', labelKey: 'shooters.firstName', required: true },
    { key: 'last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'category', labelKey: 'shooters.category', required: true },
    { key: 'tag', labelKey: 'shooters.tag', required: false },
    { key: 'division', labelKey: 'shooters.division', required: true },
    { key: 'power_factor', labelKey: 'shooters.powerFactor', required: true },
    { key: 'region', labelKey: 'shooters.region', required: true },
    { key: 'email', labelKey: 'shooters.email', required: false },
  ],
  registrations: [
    { key: 'shooter_first_name', labelKey: 'registration.addTitle', required: true },
    { key: 'shooter_last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'squad', labelKey: 'registration.squad', required: false },
    { key: 'division', labelKey: 'registration.divisionOverride', required: false },
    { key: 'category', labelKey: 'shooters.category', required: false },
    { key: 'power_factor', labelKey: 'registration.powerFactorOverride', required: false },
  ],
  scores: [
    { key: 'shooter_first_name', labelKey: 'shooters.firstName', required: true },
    { key: 'shooter_last_name', labelKey: 'shooters.lastName', required: true },
    { key: 'stage_number', labelKey: 'stages.number', required: true },
    { key: 'time', labelKey: 'scoring.time', required: true },
    { key: 'alpha', labelKey: 'Alpha (A)', required: false },
    { key: 'charlie', labelKey: 'Charlie (C)', required: false },
    { key: 'delta', labelKey: 'Delta (D)', required: false },
    { key: 'miss', labelKey: 'scoring.misses', required: false },
    { key: 'no_shoot_hits', labelKey: 'scoring.noShootTargets', required: false },
    { key: 'steel_hits', labelKey: 'scoring.steelTargets', required: false },
    { key: 'procedural', labelKey: 'scoring.procedurals', required: false },
    { key: 'ftsa', labelKey: 'FTSA', required: false },
  ],
};

export default function CSVImportModal({ show, onClose, type, matchId }: Props) {
  const { addToast } = useUIStore();
  const { t } = useTranslation();
  const [result, setResult] = useState<CSVImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasHeader, setHasHeader] = useState(true);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'result'>('upload');

  const columns = COLUMN_DEFINITIONS[type] || [];

  const parseCSVHeaders = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const firstLine = text.split('\n')[0] || '';
      const headers = firstLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      setCsvHeaders(headers);

      const autoMapping: Record<string, string> = {};
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/[\s_-]+/g, '_'));

      columns.forEach(col => {
        const idx = normalizedHeaders.indexOf(col.key);
        if (idx >= 0) {
          autoMapping[col.key] = headers[idx];
        } else {
          const aliases: Record<string, string[]> = {
            first_name: ['firstname', 'fname', 'first', 'name'],
            last_name: ['lastname', 'lname', 'last', 'surname'],
            shooter_first_name: ['shooter_firstname', 'shooterfname', 'shooter_first', 'firstname', 'fname'],
            shooter_last_name: ['shooter_lastname', 'shooterlname', 'shooter_last', 'lastname', 'lname'],
            stage_number: ['stage', 'stage_num', 'stagenumber', 'stage_no'],
            power_factor: ['pf', 'powerfactor'],
            no_shoot_hits: ['ns_hits', 'noshoot_hits', 'no_shoot', 'ns'],
            steel_hits: ['steel', 'steels'],
            category: ['cat', 'catégorie'],
            division: ['div', 'class'],
            region: ['country', 'country_code', 'region_code'],
          };
          const colAliases = aliases[col.key] || [];
          const aliasIdx = normalizedHeaders.findIndex(h => colAliases.includes(h));
          if (aliasIdx >= 0) {
            autoMapping[col.key] = headers[aliasIdx];
          }
        }
      });

      setColumnMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  }, [columns]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setResult(null);
    parseCSVHeaders(file);
  }, [parseCSVHeaders]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { 'text/csv': [], 'application/vnd.ms-excel': [], 'text/plain': [] },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    try {
      let res: CSVImportResult;
      if (type === 'shooters') {
        res = await api.importShooters(selectedFile, { hasHeader, columnMapping });
      } else if (type === 'registrations' && matchId) {
        res = await api.importRegistrations(matchId, selectedFile, { hasHeader, columnMapping });
      } else if (type === 'scores' && matchId) {
        res = await api.importScores(matchId, selectedFile, { hasHeader, columnMapping });
      } else {
        throw new Error('Missing match ID for this import type');
      }
      setResult(res);
      setStep('result');
      addToast(t('import.importedCount', { count: res.imported }), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    onClose();
    setResult(null);
    setSelectedFile(null);
    setCsvHeaders([]);
    setColumnMapping({});
    setStep('upload');
  };

  const label = type === 'shooters' ? t('import.importShooters') : type === 'registrations' ? t('import.importRegistrations') : t('import.importScores');

  const sampleCSVs: Record<string, string> = {
    shooters: 'first_name,last_name,category,tag,division,power_factor,region,email\nJohn,Doe,regular,,standard,minor,USA,john@example.com',
    registrations: 'shooter_first_name,shooter_last_name,squad,division,category,power_factor\nJohn,Doe,1,standard,regular,minor',
    scores: 'shooter_first_name,shooter_last_name,stage_number,time,alpha,charlie,delta,miss,no_shoot_hits,steel_hits,procedural,ftsa\nJohn,Doe,1,12.45,4,2,0,0,0,2,0,0',
  };

  const downloadSample = () => {
    const csv = sampleCSVs[type];
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}_import.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mappedRequiredFields = useMemo(() => {
    return columns.filter(c => c.required).every(c => columnMapping[c.key]);
  }, [columns, columnMapping]);

  return (
    <Modal show={show} onClose={handleReset} size="xl">
      <ModalHeader>{label} {t('import.fromCsv')}</ModalHeader>
      <ModalBody>
        {step === 'upload' && (
          <>
            <div {...getRootProps()} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center mb-4">
              <input {...getInputProps()} />
              <p className="text-gray-500 mb-2">📂 {t('import.dragDrop')}</p>
              <Button size="sm" color="blue" onClick={open}>{t('import.selectFile')}</Button>
            </div>
            <Button size="xs" color="gray" onClick={downloadSample} className="mb-3">{t('import.downloadSample')}</Button>
          </>
        )}

        {step === 'mapping' && (
          <>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{t('import.file')}</strong> {selectedFile?.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <strong>{t('import.detectedColumns')}</strong> {csvHeaders.length > 0 ? csvHeaders.join(', ') : 'None'}
              </p>
            </div>

            <div className="mb-4">
              <Checkbox checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
              <Label className="ml-2 text-sm">{t('import.firstRowHeader')}</Label>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold dark:text-white text-sm">{t('import.mapColumns')}</h4>
              {columns.map((col) => (
                <div key={col.key} className="flex items-center gap-3">
                  <div className="w-48 text-right">
                    <Label className="text-sm">
                      {t(col.labelKey)}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                  </div>
                  <Select
                    value={columnMapping[col.key] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [col.key]: e.target.value })}
                    className="flex-1"
                  >
                    <option value="">{t('import.skip')}</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            {!mappedRequiredFields && (
              <Alert color="warning" className="mt-3">
                {t('import.validationMessage')}
              </Alert>
            )}
          </>
        )}

        {step === 'result' && result && (
          <Alert color={result.errors.length > 0 ? 'warning' : 'success'}>
            <p className="font-semibold">{t('import.importComplete')}</p>
            <p>{t('import.imported')}: {result.imported} | {t('import.skipped')}: {result.skipped}</p>
            {result.errors.length > 0 && (
              <ul className="text-xs mt-1 list-disc list-inside">
                {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 10 && <li>{t('import.moreErrors', { count: result.errors.length - 10 })}</li>}
              </ul>
            )}
          </Alert>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'mapping' && (
          <>
            <Button color="gray" onClick={() => { setStep('upload'); setSelectedFile(null); setCsvHeaders([]); setColumnMapping({}); }}>{t('common.back')}</Button>
            <Button color="blue" onClick={handleImport} disabled={!mappedRequiredFields || importing}>
              {importing ? t('import.importing') : t('common.create')}
            </Button>
          </>
        )}
        {step === 'result' && (
          <Button color="blue" onClick={handleReset}>{t('import.done')}</Button>
        )}
        {step === 'upload' && (
          <Button color="gray" onClick={handleReset}>{t('common.cancel')}</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}