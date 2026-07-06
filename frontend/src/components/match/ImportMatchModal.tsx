import { useState, useCallback } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Alert, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchExport } from '../../hooks/useMatchExport';
import { useEscClose } from '../../hooks/useEscClose';
import { api } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import FileDropzone from './FileDropzone';

type TabType = 'json' | 'winmss' | 'psc';

interface ImportResult {
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: Array<{ id: string; name: string; stage_number: number; updated?: boolean }>;
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; errors: string[] };
  warnings: string[];
}

interface ImportMatchModalProps {
  show: boolean;
  onClose: () => void;
  onImported: () => void;
}

export default function ImportMatchModal({ show, onClose, onImported }: ImportMatchModalProps) {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const fetchMatches = useMatchStore((s) => s.fetchMatches);
  const { importing, handleImport } = useMatchExport();

  const [activeTab, setActiveTab] = useState<TabType>('json');

  // JSON tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // WinMSS tab state
  const [winmssImporting, setWinmssImporting] = useState(false);
  const [winmssInspecting, setWinmssInspecting] = useState(false);
  const [winmssResult, setWinmssResult] = useState<ImportResult | null>(null);
  const [winmssInspectData, setWinmssInspectData] = useState<Record<string, any> | null>(null);
  const [winmssError, setWinmssError] = useState<string | null>(null);

  // PSC tab state
  const [pscFile, setPscFile] = useState<File | null>(null);

  useEscClose(handleClose);

  // ── Tab detection ──
  const detectTab = useCallback((filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.mdb') || lower.endsWith('.accdb')) setActiveTab('winmss');
    else if (lower.endsWith('.psc')) setActiveTab('psc');
    else setActiveTab('json');
  }, []);

  // ── JSON tab handlers ──
  const handleJsonConfirm = async () => {
    if (!selectedFile) return;
    try {
      await handleImport(selectedFile, 'json');
      setSelectedFile(null);
      setError('');
      onImported();
      handleClose();
    } catch (err: any) {
      if (err.message?.includes('MATCH_ID_CONFLICT') || err.message?.includes('already exists')) {
        setError(t('matches.matchIdConflict'));
      } else {
        setError(err.message || t('matches.importError'));
      }
    }
  };

  // ── WinMSS tab handlers ──
  const handleWinMssImport = useCallback(async (file: File) => {
    setWinmssImporting(true);
    setWinmssError(null);
    setWinmssResult(null);
    setWinmssInspectData(null);
    try {
      const importResult = await api.importWinMSS(file) as ImportResult;
      setWinmssResult(importResult);
      addToast(t('import.winMss.title') + ' — ' + t('import.winMss.importCompleted'), 'success');
      await fetchMatches();
    } catch (err: any) {
      setWinmssError(err.message || '');
      addToast(err.message || '', 'error');
    } finally {
      setWinmssImporting(false);
    }
  }, [addToast, fetchMatches, t]);

  const handleWinMssInspect = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.mdb,.accdb';
    input.onchange = async () => {
      if (input.files?.[0]) {
        setWinmssInspecting(true);
        try {
          const data = await api.inspectWinMSS(input.files[0]) as Record<string, any>;
          setWinmssInspectData(data);
        } catch (err: any) {
          setWinmssError(err.message || '');
        } finally {
          setWinmssInspecting(false);
        }
      }
    };
    input.click();
  }, []);

  // ── PSC tab handlers ──
  const handlePscConfirm = async () => {
    if (!pscFile) return;
    try {
      await handleImport(pscFile, 'psc');
      setPscFile(null);
      setError('');
      onImported();
      handleClose();
    } catch (err: any) {
      setError(err.message || t('matches.importError'));
    }
  };

  // ── Shared ──
  function handleClose() {
    setSelectedFile(null);
    setPscFile(null);
    setError('');
    setWinmssResult(null);
    setWinmssError(null);
    setWinmssInspectData(null);
    setWinmssImporting(false);
    setWinmssInspecting(false);
    onClose();
  }

  const tabClass = (tab: TabType) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
    }`;

  return (
    <Modal show={show} onClose={handleClose} size="xl" className="dark:text-white">
      <ModalHeader>{t('matches.importMatch')}</ModalHeader>
      <ModalBody>
        {/* ── Tab bar ── */}
        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button className={tabClass('json')} onClick={() => setActiveTab('json')}>
            IPSCScore JSON
          </button>
          <button className={tabClass('winmss')} onClick={() => setActiveTab('winmss')}>
            {t('import.winMss.title')}
          </button>
          <button className={tabClass('psc')} onClick={() => setActiveTab('psc')}>
            Practiscore (.psc)
          </button>
        </div>

        {/* ── JSON tab ── */}
        {activeTab === 'json' && (
          <div>
            <p className="mb-3">{t('matches.importMatchDescription')}</p>
            <FileDropzone
              accept={{ 'application/json': ['.json'] }}
              onFileSelected={(file) => { setSelectedFile(file); setError(''); detectTab(file.name); }}
              disabled={importing}
              dropHint={t('matches.import.json.dropHere')}
              dragHint={t('matches.import.json.dragDrop')}
              browseHint={t('matches.import.json.orBrowse')}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{selectedFile.name}</p>
            )}
            {error && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
            <p className="text-sm text-red-600 mt-3 font-medium">{t('common.cannotBeUndone')}</p>
          </div>
        )}

        {/* ── WinMSS tab ── */}
        {activeTab === 'winmss' && (
          <div>
            {!winmssImporting && !winmssInspecting && !winmssResult && !winmssInspectData && !winmssError && (
              <FileDropzone
                accept={{
                  'application/x-msaccess': ['.mdb', '.accdb'],
                  'application/octet-stream': ['.mdb', '.accdb'],
                }}
                onFileSelected={handleWinMssImport}
                disabled={winmssImporting || winmssInspecting}
                dropHint={t('import.winMss.dropHere')}
                dragHint={t('import.winMss.dragDropMdb')}
                browseHint={t('import.winMss.orBrowse')}
                extraButton={{
                  label: t('import.winMss.inspectButton'),
                  onClick: handleWinMssInspect,
                }}
              />
            )}

            {winmssImporting && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="xl" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {t('import.winMss.importing')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('import.winMss.importingWait')}
                </p>
              </div>
            )}

            {winmssInspecting && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Spinner size="xl" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                  {t('import.winMss.inspecting')}
                </p>
              </div>
            )}

            {winmssInspectData && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color="info">
                  <p className="font-medium">{t('import.winMss.inspectionTitle')}</p>
                  <p className="text-sm mt-1">{t('import.winMss.inspectionDescription')}</p>
                </Alert>
                {Object.entries(winmssInspectData.tables || {}).map(([tableName, tableData]: [string, any]) => (
                  <div key={tableName} className="border rounded-lg p-3 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200">{tableName}</h4>
                    <p className="text-sm text-gray-500">{tableData.rowCount} {t('import.winMss.rows')}</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {t('import.winMss.columns')} {tableData.columns?.join(', ')}
                    </p>
                    {tableData.sampleRows && tableData.sampleRows.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-500 cursor-pointer">{t('import.winMss.showSample')}</summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(tableData.sampleRows[0], null, 2)}
                        </pre>
                      </details>
                    )}
                    {tableData.error && (
                      <p className="text-xs text-red-500 mt-1">{t('import.winMss.tableError', { message: tableData.error })}</p>
                    )}
                  </div>
                ))}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" color="gray" onClick={() => setWinmssInspectData(null)}>
                    {t('common.back')}
                  </Button>
                  <Button size="sm" color="blue" onClick={() => setWinmssInspectData(null)}>
                    {t('import.winMss.importFile')}
                  </Button>
                </div>
              </div>
            )}

            {winmssError && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color="failure">
                  <p className="font-medium">{t('import.winMss.importFailed')}</p>
                  <p className="text-sm mt-1">{winmssError}</p>
                </Alert>
                <FileDropzone
                  accept={{
                    'application/x-msaccess': ['.mdb', '.accdb'],
                    'application/octet-stream': ['.mdb', '.accdb'],
                  }}
                  onFileSelected={handleWinMssImport}
                  disabled={winmssImporting || winmssInspecting}
                  dropHint={t('import.winMss.dropHere')}
                  dragHint={t('import.winMss.dragDropMdb')}
                  browseHint={t('import.winMss.tryAgain')}
                  icon={undefined}
                />
              </div>
            )}

            {winmssResult && (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto">
                <Alert color={winmssResult.scores.created > 0 ? 'success' : 'warning'}>
                  <p className="font-medium">
                    {winmssResult.scores.created > 0 ? t('import.winMss.importCompleted') : t('import.winMss.importNoScores')}
                  </p>
                  {winmssResult.scores.created === 0 && winmssResult.scores.errors.length > 0 && (
                    <p className="text-sm mt-1">{t('import.winMss.checkErrors')}</p>
                  )}
                </Alert>

                {winmssResult.matches.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      {winmssResult.matches.length > 1 ? t('import.winMss.matches') : t('import.winMss.match')} ({winmssResult.matches.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {winmssResult.matches.map((m, i) => (
                        <span key={i} className={`px-2 py-1 rounded text-sm ${m.updated ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                          {m.name}{m.date ? ` — ${new Date(m.date).toLocaleDateString()}` : ''}{m.updated ? ` ${t('import.winMss.updated')}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Table striped>
                  <TableHead>
                    <TableRow>
                      <TableHeadCell>{t('import.winMss.categoryCol')}</TableHeadCell>
                      <TableHeadCell>{t('import.winMss.createdCol')}</TableHeadCell>
                      <TableHeadCell>{t('import.winMss.skippedCol')}</TableHeadCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow><TableCell>{t('import.winMss.stagesRow')}</TableCell><TableCell>{winmssResult.stages.filter(s => !s.updated).length}</TableCell><TableCell>{winmssResult.stages.filter(s => s.updated).length} {t('import.winMss.updated')}</TableCell></TableRow>
                    <TableRow><TableCell>{t('import.winMss.shootersRow')}</TableCell><TableCell>{winmssResult.shooters.created}</TableCell><TableCell>{winmssResult.shooters.skipped}{winmssResult.shooters.errors.length > 0 ? ` ${t('import.winMss.errorsCount', { count: winmssResult.shooters.errors.length })}` : ''}</TableCell></TableRow>
                    <TableRow><TableCell>{t('import.winMss.registrationsRow')}</TableCell><TableCell>{winmssResult.registrations.created}</TableCell><TableCell>{winmssResult.registrations.skipped}</TableCell></TableRow>
                    <TableRow><TableCell>{t('import.winMss.scoresRow')}</TableCell><TableCell>{winmssResult.scores.created}</TableCell><TableCell>{winmssResult.scores.errors.length} {t('import.winMss.errorsWord')}</TableCell></TableRow>
                  </TableBody>
                </Table>

                {winmssResult.warnings.length > 0 && (
                  <Alert color="warning">
                    <p className="font-medium mb-1">{t('import.winMss.warnings')}</p>
                    <ul className="list-disc list-inside text-sm">
                      {winmssResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </Alert>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PSC tab ── */}
        {activeTab === 'psc' && (
          <div>
            <p className="mb-3">{t('matches.import.psc.description')}</p>
            <FileDropzone
              accept={{
                'application/zip': ['.psc'],
                'application/octet-stream': ['.psc'],
              }}
              onFileSelected={(file) => { setPscFile(file); setError(''); }}
              disabled={importing}
              dropHint={t('matches.import.psc.dropHere')}
              dragHint={t('matches.import.psc.dragDrop')}
              browseHint={t('matches.import.psc.orBrowse')}
            />
            {pscFile && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{pscFile.name}</p>
            )}
            {error && activeTab === 'psc' && (
              <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>
            )}
            <p className="text-sm text-red-600 mt-3 font-medium">{t('common.cannotBeUndone')}</p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>
          {winmssResult || winmssInspectData ? t('common.close') : t('common.cancel')}
        </Button>

        {activeTab === 'json' && (
          <Button color="red" onClick={handleJsonConfirm} disabled={!selectedFile || importing}>
            {importing ? t('matches.importing') : t('matches.importMatch')}
          </Button>
        )}

        {activeTab === 'psc' && (
          <Button color="red" onClick={handlePscConfirm} disabled={!pscFile || importing}>
            {importing ? t('matches.importing') : t('matches.importMatch')}
          </Button>
        )}

        {activeTab === 'winmss' && winmssResult && (
          <Button color="blue" onClick={() => { setWinmssResult(null); setWinmssError(null); }}>
            {t('import.winMss.importAnother')}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
