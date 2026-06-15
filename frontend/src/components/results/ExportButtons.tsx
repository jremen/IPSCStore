import { useState, useCallback, useEffect } from 'react';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useResultsStore } from '../../stores/resultsStore';
import { useMatchStore } from '../../stores/matchStore';
import { api } from '../../services/api';
import { divisionLabel, categoryLabel } from '../../utils/constants';
import { loadPdfFonts, setRegularFont, setBoldFont } from '../../utils/pdfFont';
import { useTabMenuAction } from '../../hooks/useTabMenuAction';

type ResultTab = 'byDivision' | 'overall' | 'byStage' | 'byCategory' | 'byTag';

interface ExportButtonsProps {
  activeTab: ResultTab;
}

const TAB_SUFFIX: Record<ResultTab, string> = {
  byDivision: 'by_division',
  overall: 'overall',
  byStage: 'by_stage',
  byCategory: 'by_category',
  byTag: 'by_tag',
};

/** Try native Save As dialog (Chromium). Returns true if handled, false if cancelled. */
async function nativeSaveAs(blob: Blob, defaultName: string, types: { description: string; accept: Record<string, string[]> }[]): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false;
  try {
    const handle = await (window as any).showSaveFilePicker({ suggestedName: defaultName, types });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err: any) {
    if (err.name === 'AbortError') return false; // user cancelled
    return false;
  }
}

/** Fallback: download blob with a custom filename */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportButtons({ activeTab }: ExportButtonsProps) {
  const { activeMatchId, addToast } = useUIStore();
  const { matches } = useMatchStore();
  const store = useResultsStore();
  const { t } = useTranslation();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [saveModal, setSaveModal] = useState<{ open: boolean; filename: string; blob: Blob; extension: string } | null>(null);

  const activeMatch = matches?.find((m: any) => m.id === activeMatchId);

  const baseName = (activeMatch?.name || 'Match').replace(/[^a-zA-Z0-9]/g, '_');
  const tabSuffix = TAB_SUFFIX[activeTab];

  const handlePrint = useCallback(() => { window.print(); }, []);

  /** Show Save As dialog: native first, then custom modal fallback */
  const showSaveDialog = useCallback(async (blob: Blob, defaultName: string, extension: string, types: { description: string; accept: Record<string, string[]> }[], successKey: string) => {
    // Try native Save As first
    const nativeOk = await nativeSaveAs(blob, defaultName, types);
    if (nativeOk) {
      addToast(t(successKey), 'success');
      return;
    }
    // Fallback: show custom modal so user can change filename
    setSaveModal({ open: true, filename: defaultName, blob, extension });
  }, [addToast, t]);

  const confirmSave = () => {
    if (!saveModal) return;
    const filename = saveModal.filename.endsWith(`.${saveModal.extension}`)
      ? saveModal.filename
      : `${saveModal.filename}.${saveModal.extension}`;
    downloadBlob(saveModal.blob, filename);
    setSaveModal(null);
    addToast(t('results.fileExported'), 'success');
  };

  const handleCSV = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const csv = await api.exportCSV(activeMatchId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.csv`, 'csv', [
        { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
      ], 'results.csvExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, baseName, tabSuffix, showSaveDialog, addToast]);

  const handleHTML = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const html = await api.exportHTML(activeMatchId);
      const blob = new Blob([html], { type: 'text/html' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.html`, 'html', [
        { description: 'HTML file', accept: { 'text/html': ['.html'] } },
      ], 'results.htmlExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, baseName, tabSuffix, showSaveDialog, addToast]);

  const handlePDF = useCallback(async () => {
    if (!activeMatchId) return;
    setPdfLoading(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      await loadPdfFonts(doc);
      setBoldFont(doc);

      const matchName = activeMatch?.name || 'Match';
      const matchDate = activeMatch?.date ? new Date(activeMatch.date).toLocaleDateString(document.documentElement.lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const matchOrg = activeMatch?.organization || '';

      const drawHeader = (data?: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        setBoldFont(doc); doc.setFontSize(16);
        doc.text(matchName, pageWidth / 2, 8, { align: 'center' });
        setRegularFont(doc); doc.setFontSize(9);
        const subtitle = [matchOrg, matchDate].filter(Boolean).join(' • ');
        if (subtitle) doc.text(subtitle, pageWidth / 2, 13, { align: 'center' });
        doc.setDrawColor(0); doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
        if (data?.settings) data.settings.startY = 20;
      };

      drawHeader();

      switch (activeTab) {
        case 'byDivision': drawDivisionPDF(doc, autoTable, drawHeader, store.divisionResults, store.dqDivisions, t); break;
        case 'overall': drawOverallPDF(doc, autoTable, drawHeader, store.overallResults, store.dqOverall, t); break;
        case 'byStage': drawStagePDF(doc, autoTable, drawHeader, store.stageResults, t); break;
        case 'byCategory': drawCategoryPDF(doc, autoTable, drawHeader, store.categoryResults, store.dqCategories, t); break;
        case 'byTag': drawTagPDF(doc, autoTable, drawHeader, store.tagResults, store.dqTags, t); break;
      }

      const pdfBlob = doc.output('blob');
      await showSaveDialog(pdfBlob, `${baseName}_${tabSuffix}.pdf`, 'pdf', [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ], 'results.pdfExported');
    } catch (err: any) {
      console.error('PDF export error:', err);
      addToast(err.message, 'error');
    } finally { setPdfLoading(false); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  useTabMenuAction('print-results', handlePrint);
  useTabMenuAction('export-results-pdf', () => { if (activeMatchId) handlePDF(); });
  useTabMenuAction('export-results-csv', () => { if (activeMatchId) handleCSV(); });
  useTabMenuAction('export-results-html', () => { if (activeMatchId) handleHTML(); });

  return (
    <>
      <div className="flex gap-2 no-print">
        <Button size="xs" color="light" onClick={handlePrint}>🖨 {t('results.print')}</Button>
        <Button size="xs" color="blue" onClick={handlePDF} disabled={pdfLoading}>{t('results.pdf')}</Button>
        <Button size="xs" color="blue" onClick={handleCSV}>{t('results.csv')}</Button>
        <Button size="xs" color="light" onClick={handleHTML}>{t('results.html')}</Button>
      </div>
      <Modal show={saveModal?.open ?? false} onClose={() => setSaveModal(null)} size="md">
        <ModalHeader>{t('results.saveAs')}</ModalHeader>
        <ModalBody>
          <TextInput
            value={saveModal?.filename ?? ''}
            onChange={(e) => setSaveModal(prev => prev ? { ...prev, filename: e.target.value } : null)}
          />
        </ModalBody>
        <ModalFooter>
          <Button size="sm" onClick={confirmSave}>{t('results.save')}</Button>
          <Button size="sm" color="light" onClick={() => setSaveModal(null)}>{t('common.cancel')}</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}

// ── PDF drawing helpers (black & white only) ──────────────────────────

const MARGIN = 10;
const TITLE_SIZE = 14;
const SUBTITLE_SIZE = 11;
const TABLE_FONT = 9;

/** Shared autoTable options for B&W output */
const TABLE_STYLE = {
  theme: 'plain' as const,
  styles: { font: 'OpenSans', fontStyle: 'normal', fontSize: TABLE_FONT, textColor: 0 },
  headStyles: { font: 'OpenSans', fontStyle: 'bold', fontSize: TABLE_FONT, fillColor: [0, 0, 0], textColor: [255, 255, 255] },
  alternateRowStyles: { fillColor: [245, 245, 245] },
};

function drawDivisionPDF(doc: any, autoTable: any, drawHeader: any, divisionResults: Record<string, any[]>, dqShooters: any[], t: any) {
  const divisions = Object.entries(divisionResults).sort(([a], [b]) => a.localeCompare(b));
  for (let i = 0; i < divisions.length; i++) {
    const [division, results] = divisions[i];
    if (i > 0) { doc.addPage(); drawHeader(); }
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(divisionLabel(division), MARGIN, 32);
    setRegularFont(doc);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('results.position'), t('results.shooter'), t('results.matchPercent'), t('results.points')]],
      body: results.map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
      didDrawPage: (data: any) => { drawHeader(data); },
    });
  }
  if (dqShooters?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, 32);
    setRegularFont(doc);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('results.shooter'), t('results.division'), t('results.dqReason')]],
      body: dqShooters.map((s: any) => [`${s.first_name} ${s.last_name}`, divisionLabel(s.division || ''), s.dq_reason || 'DQ']),
    });
  }
}

function drawOverallPDF(doc: any, autoTable: any, drawHeader: any, results: any[], dqShooters: any[], t: any) {
  if (!results.length) return;
  setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(t('results.overall'), MARGIN, 32);
  setRegularFont(doc);
  autoTable(doc, {
    ...TABLE_STYLE,
    startY: 36,
    margin: { left: MARGIN, right: MARGIN },
    head: [[t('results.position'), t('results.shooter'), t('results.division'), t('results.matchPercent'), t('results.points')]],
    body: results.map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, divisionLabel(r.division || ''), `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
    didDrawPage: (data: any) => { drawHeader(data); },
  });
  if (dqShooters?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, 32);
    setRegularFont(doc);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('results.shooter'), t('results.division'), t('results.dqReason')]],
      body: dqShooters.map((s: any) => [`${s.first_name} ${s.last_name}`, divisionLabel(s.division || ''), s.dq_reason || 'DQ']),
    });
  }
}

function drawStagePDF(doc: any, autoTable: any, drawHeader: any, stageResults: any[], t: any) {
  for (let i = 0; i < stageResults.length; i++) {
    const stage = stageResults[i];
    if (i > 0) { doc.addPage(); drawHeader(); }
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`${t('scoring.stage', { number: stage.stage_number })}: ${stage.stage_name}`, MARGIN, 32);

    const head = [[t('results.position'), t('results.shooter'), t('results.stagePercent'), t('results.points'), 'HF', t('results.netPoints'), t('results.time')]];
    const makeRow = (r: any) => [r.position, `${r.first_name} ${r.last_name}`, `${r.stage_percent?.toFixed(2)}%`, r.stage_points?.toFixed(2), r.hit_factor?.toFixed(4), r.net_points?.toFixed(2), r.time?.toFixed(2)];

    if (stage.divisions && Object.keys(stage.divisions).length > 0) {
      const divEntries = Object.entries(stage.divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b));
      let currentY = 36;
      for (const [division, scores] of divEntries) {
        setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
        if (currentY > 36) currentY += 4;
        doc.text(divisionLabel(division), MARGIN, currentY); currentY += 4;
        setRegularFont(doc);
        autoTable(doc, {
          ...TABLE_STYLE,
          startY: currentY, head, body: scores.map(makeRow),
          margin: { left: MARGIN, right: MARGIN },
          didDrawPage: (data: any) => { drawHeader(data); },
        });
        currentY = (doc as any).lastAutoTable.finalY + 6;
        if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
      }
    } else {
      const headAll = [[t('results.position'), t('results.shooter'), t('results.division'), t('results.stagePercent'), t('results.points'), 'HF', t('results.netPoints'), t('results.time')]];
      const makeRowAll = (r: any) => [r.position, `${r.first_name} ${r.last_name}`, divisionLabel(r.division || ''), `${r.stage_percent?.toFixed(2)}%`, r.stage_points?.toFixed(2), r.hit_factor?.toFixed(4), r.net_points?.toFixed(2), r.time?.toFixed(2)];
      setRegularFont(doc);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: 36, head: headAll, body: (stage.scores || []).map(makeRowAll),
        margin: { left: MARGIN, right: MARGIN },
        didDrawPage: (data: any) => { drawHeader(data); },
      });
    }

    if (stage.dq_scores?.length) {
      let currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 36;
      if (currentY > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); drawHeader(); currentY = 32; }
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      doc.text(`⛔ ${t('results.disqualified')}`, MARGIN, currentY);
      setRegularFont(doc);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY + 4,
        margin: { left: MARGIN, right: MARGIN },
        head: [[t('results.shooter'), t('results.division'), 'HF', t('results.netPoints'), t('results.dqReason')]],
        body: stage.dq_scores.map((s: any) => [`${s.first_name} ${s.last_name}`, divisionLabel(s.division || ''), s.hit_factor?.toFixed(4), s.net_points?.toFixed(2), s.dq_reason || 'DQ']),
      });
    }
  }
}

function drawCategoryPDF(doc: any, autoTable: any, drawHeader: any, categoryResults: Record<string, Record<string, any[]>>, dqCategories: any[], t: any) {
  const catEntries = Object.entries(categoryResults).sort(([a], [b]) => a.localeCompare(b));
  for (const [cat, divisions] of catEntries) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(categoryLabel(cat), MARGIN, 32);
    let currentY = 36;
    for (const [division, results] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      if (currentY > 36) currentY += 4;
      doc.text(divisionLabel(division), MARGIN, currentY); currentY += 4;
      setRegularFont(doc);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: [[t('results.position'), t('results.shooter'), t('results.matchPercent'), t('results.points')]],
        body: (results as any[]).map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
        didDrawPage: (data: any) => { drawHeader(data); },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
      if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
    }
  }
  if (dqCategories?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')} — ${t('results.byCategory')}`, MARGIN, 32);
    setRegularFont(doc);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('results.shooter'), t('results.division'), t('results.dqReason')]],
      body: dqCategories.map((s: any) => [`${s.first_name} ${s.last_name}`, divisionLabel(s.division || ''), s.dq_reason || 'DQ']),
    });
  }
}

function drawTagPDF(doc: any, autoTable: any, drawHeader: any, tagResults: Record<string, Record<string, any[]>>, dqTags: any[], t: any) {
  const tagEntries = Object.entries(tagResults).sort(([a], [b]) => a.localeCompare(b));
  for (const [tag, divisions] of tagEntries) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE); doc.text(t('results.tag', { tag }), MARGIN, 32);
    let currentY = 36;
    for (const [division, results] of Object.entries(divisions).sort(([a], [b]) => a.localeCompare(b))) {
      setBoldFont(doc); doc.setFontSize(SUBTITLE_SIZE);
      if (currentY > 36) currentY += 4;
      doc.text(divisionLabel(division), MARGIN, currentY); currentY += 4;
      setRegularFont(doc);
      autoTable(doc, {
        ...TABLE_STYLE,
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: [[t('results.position'), t('results.shooter'), t('results.matchPercent'), t('results.points')]],
        body: (results as any[]).map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
        didDrawPage: (data: any) => { drawHeader(data); },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
      if (currentY > doc.internal.pageSize.getHeight() - 30) { doc.addPage(); drawHeader(); currentY = 32; }
    }
  }
  if (dqTags?.length) {
    doc.addPage(); drawHeader();
    setBoldFont(doc); doc.setFontSize(TITLE_SIZE);
    doc.text(`⛔ ${t('results.disqualified')} — ${t('results.byTag')}`, MARGIN, 32);
    setRegularFont(doc);
    autoTable(doc, {
      ...TABLE_STYLE,
      startY: 36,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('results.shooter'), t('results.division'), t('results.dqReason')]],
      body: dqTags.map((s: any) => [`${s.first_name} ${s.last_name}`, divisionLabel(s.division || ''), s.dq_reason || 'DQ']),
    });
  }
}
