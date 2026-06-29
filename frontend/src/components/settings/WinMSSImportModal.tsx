import { useState, useCallback } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Alert, Spinner, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useUIStore } from '../../stores/uiStore';
import { useMatchStore } from '../../stores/matchStore';
import { useEscClose } from '../../hooks/useEscClose';

interface ImportResult {
  matches: Array<{ id: string; name: string; date: string; imported: boolean; updated?: boolean }>;
  stages: Array<{ id: string; name: string; stage_number: number; updated?: boolean }>;
  shooters: { created: number; skipped: number; errors: string[] };
  registrations: { created: number; skipped: number };
  scores: { created: number; errors: string[] };
  warnings: string[];
}

export default function WinMSSImportModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { addToast } = useUIStore();
  const { fetchMatches } = useMatchStore();
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [inspectData, setInspectData] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setImporting(true);
    setError(null);
    setResult(null);
    setInspectData(null);
    try {
      const importResult = await api.importWinMSS(file) as ImportResult;
      setResult(importResult);
      addToast(t('settings.english') === 'English' ? 'WinMSS import completed' : 'WinMSS import dokončený', 'success');
      await fetchMatches();
    } catch (err: any) {
      setError(err.message || 'Import failed');
      addToast(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  }, [addToast, fetchMatches, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleImport,
    accept: {
      'application/x-msaccess': ['.mdb', '.accdb'],
      'application/octet-stream': ['.mdb', '.accdb'],
    },
    multiple: false,
    disabled: importing || inspecting,
  });

  const handleClose = () => {
    onClose();
    setResult(null);
    setError(null);
    setInspectData(null);
  };
  useEscClose(handleClose);

  return (
    <Modal show={show} onClose={handleClose} size="xl">
      <ModalHeader>{t('import.winMss.title')}</ModalHeader>
      <ModalBody>
        {!importing && !inspecting && !result && !inspectData && !error && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">📁</div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {isDragActive ? t('import.winMss.dropHere') : t('import.winMss.dragDropMdb')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('import.winMss.orBrowse')}
            </p>
            <div className="mt-4">
              <Button
                size="xs"
                color="light"
                onClick={async (e) => {
                  e.stopPropagation();
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.mdb,.accdb';
                  input.onchange = async () => {
                    if (input.files?.[0]) {
                      setInspecting(true);
                      try {
                        const data = await api.inspectWinMSS(input.files[0]) as Record<string, any>;
                        setInspectData(data);
                      } catch (err: any) {
                        setError(err.message || 'Inspect failed');
                      } finally {
                        setInspecting(false);
                      }
                    }
                  };
                  input.click();
                }}
              >
                {t('import.winMss.inspectButton')}
              </Button>
            </div>
          </div>
        )}

        {importing && (
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

        {inspecting && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Spinner size="xl" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
              {t('import.winMss.inspecting')}
            </p>
          </div>
        )}

        {inspectData && (
          <div className="space-y-4 max-h-[40vh] overflow-y-auto">
            <Alert color="info">
              <p className="font-medium">{t('import.winMss.inspectionTitle')}</p>
              <p className="text-sm mt-1">{t('import.winMss.inspectionDescription')}</p>
            </Alert>
            {Object.entries(inspectData.tables || {}).map(([tableName, tableData]: [string, any]) => (
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
                  <p className="text-xs text-red-500 mt-1">Error: {tableData.error}</p>
                )}
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <Button size="sm" color="gray" onClick={() => setInspectData(null)}>
                {t('common.back')}
              </Button>
              <Button
                size="sm"
                color="blue"
                onClick={() => {
                  setInspectData(null);
                }}
              >
                {t('import.winMss.importFile')}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="space-y-4 max-h-[40vh] overflow-y-auto">
            <Alert color="failure">
              <p className="font-medium">{t('import.winMss.importFailed')}</p>
              <p className="text-sm mt-1">{error}</p>
            </Alert>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'}`}
            >
              <input {...getInputProps()} />
              <p className="text-gray-600 dark:text-gray-400">
                {t('import.winMss.tryAgain')}
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 max-h-[40vh] overflow-y-auto">
            <Alert color={result.scores.created > 0 ? 'success' : 'warning'}>
              <p className="font-medium">
                {result.scores.created > 0 ? t('import.winMss.importCompleted') : t('import.winMss.importNoScores')}
              </p>
              {result.scores.created === 0 && result.scores.errors.length > 0 && (
                <p className="text-sm mt-1">{t('import.winMss.checkErrors')}</p>
              )}
            </Alert>

            {result.matches.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  {result.matches.length > 1 ? t('import.winMss.matches') : t('import.winMss.match')} ({result.matches.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.matches.map((m, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-sm ${
                        m.updated
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {m.name}{m.date ? ` — ${new Date(m.date).toLocaleDateString()}` : ''}
                      {m.updated ? ` ${t('import.winMss.updated')}` : ''}
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
                <TableRow>
                  <TableCell>{t('import.winMss.stagesRow')}</TableCell>
                  <TableCell>{result.stages.filter(s => !s.updated).length}</TableCell>
                  <TableCell>{result.stages.filter(s => s.updated).length} {t('import.winMss.updated')}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('import.winMss.shootersRow')}</TableCell>
                  <TableCell>{result.shooters.created}</TableCell>
                  <TableCell>{result.shooters.skipped}{result.shooters.errors.length > 0 ? ` (${result.shooters.errors.length} errors)` : ''}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('import.winMss.registrationsRow')}</TableCell>
                  <TableCell>{result.registrations.created}</TableCell>
                  <TableCell>{result.registrations.skipped}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('import.winMss.scoresRow')}</TableCell>
                  <TableCell>{result.scores.created}</TableCell>
                  <TableCell>{result.scores.errors.length} {t('import.winMss.errorsWord')}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            {result.stages.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t('import.winMss.stagesRow')}</h4>
                <div className="flex flex-wrap gap-2">
                  {result.stages.map((s, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-sm ${
                        s.updated
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      #{s.stage_number} {s.name} {s.updated ? t('import.winMss.updated') : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.warnings.length > 0 && (
              <Alert color="warning">
                <p className="font-medium mb-1">{t('import.winMss.warnings')}</p>
                <ul className="list-disc list-inside text-sm">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {result.shooters.errors.length > 0 && (
              <Alert color="failure">
                <p className="font-medium mb-1">Shooter import errors ({result.shooters.errors.length})</p>
                <ul className="list-disc list-inside text-sm">
                  {result.shooters.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.shooters.errors.length > 20 && (
                    <li>...and {result.shooters.errors.length - 20} more</li>
                  )}
                </ul>
              </Alert>
            )}

            {result.scores.errors.length > 0 && (
              <Alert color="failure">
                <p className="font-medium mb-1">{t('import.winMss.scoreErrors')} ({result.scores.errors.length})</p>
                <ul className="list-disc list-inside text-sm">
                  {result.scores.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.scores.errors.length > 20 && (
                    <li>{t('import.moreErrors', { count: result.scores.errors.length - 20 })}</li>
                  )}
                </ul>
              </Alert>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={handleClose}>
          {result || inspectData ? t('common.close') : t('common.cancel')}
        </Button>
        {result && (
          <Button color="blue" onClick={() => { setResult(null); setError(null); }}>
            {t('import.winMss.importAnother')}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
