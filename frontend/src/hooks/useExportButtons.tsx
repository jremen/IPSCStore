import { useCallback, useState } from "react";
import { useTabMenuAction } from "./useTabMenuAction";
import { useUIStore } from "../stores/uiStore";
import { useMatchStore } from "../stores/matchStore";
import { useResultsStore } from "../stores/resultsStore";
import { categoryLabel, divisionLabel } from "../utils/constants";
import { useTranslation } from "react-i18next";
import { loadPdfFonts, setBoldFont, setRegularFont } from "../utils/pdfFont";


type ResultTab = 'byDivision' | 'overall' | 'byStage' | 'byCategory' | 'byTag';

export interface ExportButtonsProps {
  activeTab: ResultTab;
}

export interface SaveProps { open: boolean; filename: string; blob: Blob; extension: string }

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
    if (err.name === 'AbortError') return false;
    return false;
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDateLong(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(document.documentElement.lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
}

const useExportButtons = (activeTab: ResultTab) => {
    const { t } = useTranslation();
  
    const [pdfLoading, setPdfLoading] = useState(false);
    const [saveModal, setSaveModal] = useState<SaveProps | null>(null);
    const { activeMatchId, addToast } = useUIStore();
    const { matches } = useMatchStore();
  
  
    const activeMatch = matches?.find((m: any) => m.id === activeMatchId);
    const baseName = (activeMatch?.name || 'Match').replace(/[^a-zA-Z0-9]/g, '_');
    const tabSuffix = TAB_SUFFIX[activeTab];

  const handlePrint = useCallback(() => { window.print(); }, []);

  const showSaveDialog = useCallback(async (blob: Blob, defaultName: string, extension: string, types: { description: string; accept: Record<string, string[]> }[], successKey: string) => {
    const nativeOk = await nativeSaveAs(blob, defaultName, types);
    if (nativeOk) {
      addToast(t(successKey), 'success');
      return;
    }
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

  // ── CSV: client-side generation ──────────────────────────────────────

  const handleCSV = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const s = useResultsStore.getState();
      const lines: string[] = [];

      switch (activeTab) {
        case 'byDivision': {
          for (const [division, results] of Object.entries(s.divisionResults).sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`--- ${divisionLabel(division)} ---`);
            lines.push('Position;First Name;Last Name;Division;Category;Power Factor;A;C;D;M;NS;P;Time;Match Percent;Match Points');
            for (const r of results as any[]) {
              lines.push(`${r.position};${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.power_factor || ''};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${r.time != null ? Number(r.time).toFixed(2) : ''};${Number(r.match_percent).toFixed(2)}%;${Number(r.match_points).toFixed(2)}`);
            }
            lines.push('');
          }
          if (s.dqDivisions.length) {
            lines.push('--- Disqualified ---');
            lines.push('First Name;Last Name;Division;Category;Power Factor;DQ Reason');
            for (const r of s.dqDivisions) {
              lines.push(`${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.power_factor || ''};${r.dq_reason || 'DQ'}`);
            }
          }
          break;
        }
        case 'overall': {
          lines.push('Position;First Name;Last Name;Division;Category;Power Factor;A;C;D;M;NS;P;Time;Match Percent;Match Points');
          for (const r of s.overallResults as any[]) {
            lines.push(`${r.position};${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.power_factor || ''};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${r.time != null ? Number(r.time).toFixed(2) : ''};${Number(r.match_percent).toFixed(2)}%;${Number(r.match_points).toFixed(2)}`);
          }
          lines.push('');
          if (s.dqOverall.length) {
            lines.push('--- Disqualified ---');
            lines.push('First Name;Last Name;Division;Category;DQ Reason');
            for (const r of s.dqOverall) {
              lines.push(`${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.dq_reason || 'DQ'}`);
            }
          }
          break;
        }
        case 'byStage': {
          for (const stage of s.stageResults) {
            lines.push(`--- Stage ${stage.stage_number}: ${stage.stage_name} ---`);
            if (stage.divisions && Object.keys(stage.divisions).length > 0) {
              for (const [division, scores] of Object.entries(stage.divisions).sort(([a], [b]) => a.localeCompare(b))) {
                lines.push(divisionLabel(division));
                lines.push('Position;First Name;Last Name;A;C;D;M;NS;P;Time;Stage Percent;Stage Points;HF;Net Points');
                for (const r of scores as any[]) {
                  lines.push(`${r.position};${r.first_name};${r.last_name};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${r.time != null ? Number(r.time).toFixed(2) : ''};${Number(r.stage_percent).toFixed(2)}%;${Number(r.stage_points).toFixed(2)};${Number(r.hit_factor).toFixed(4)};${Number(r.net_points).toFixed(2)}`);
                }
                lines.push('');
              }
            } else {
              lines.push('Position;First Name;Last Name;Division;A;C;D;M;NS;P;Time;Stage Percent;Stage Points;HF;Net Points');
              for (const r of stage.scores || []) {
                lines.push(`${r.position};${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${r.time != null ? Number(r.time).toFixed(2) : ''};${Number(r.stage_percent).toFixed(2)}%;${Number(r.stage_points).toFixed(2)};${Number(r.hit_factor).toFixed(4)};${Number(r.net_points).toFixed(2)}`);
              }
              lines.push('');
            }
            if (stage.dq_scores?.length) {
              lines.push('--- Disqualified ---');
              lines.push('First Name;Last Name;Division;HF;Net Points;DQ Reason');
              for (const r of stage.dq_scores) {
                lines.push(`${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${Number(r.hit_factor).toFixed(4)};${Number(r.net_points).toFixed(2)};${r.dq_reason || 'DQ'}`);
              }
              lines.push('');
            }
          }
          break;
        }
        case 'byCategory': {
          for (const [cat, divisions] of Object.entries(s.categoryResults).sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`--- ${categoryLabel(cat)} ---`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              lines.push(divisionLabel(division));
              lines.push('Position;First Name;Last Name;Time;A;C;D;M;NS;P;Match Percent;Match Points');
              for (const r of results) {
                lines.push(`${r.position};${r.first_name};${r.last_name};${r.time != null ? Number(r.time).toFixed(2) : ''};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${Number(r.match_percent).toFixed(2)}%;${Number(r.match_points).toFixed(2)}`);
              }
              lines.push('');
            }
          }
          if (s.dqCategories.length) {
            lines.push('--- Disqualified ---');
            lines.push('First Name;Last Name;Division;Category;DQ Reason');
            for (const r of s.dqCategories) {
              lines.push(`${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.dq_reason || 'DQ'}`);
            }
          }
          break;
        }
        case 'byTag': {
          for (const [tag, divisions] of Object.entries(s.tagResults).sort(([a], [b]) => a.localeCompare(b))) {
            lines.push(`--- Tag: ${tag} ---`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              lines.push(divisionLabel(division));
              lines.push('Position;First Name;Last Name;Time;A;C;D;M;NS;P;Match Percent;Match Points');
              for (const r of results) {
                lines.push(`${r.position};${r.first_name};${r.last_name};${r.time != null ? Number(r.time).toFixed(2) : ''};${r.alpha};${r.charlie};${r.delta};${r.miss};${r.no_shoot};${r.procedurals};${Number(r.match_percent).toFixed(2)}%;${Number(r.match_points).toFixed(2)}`);
              }
              lines.push('');
            }
          }
          if (s.dqTags.length) {
            lines.push('--- Disqualified ---');
            lines.push('First Name;Last Name;Division;Category;DQ Reason');
            for (const r of s.dqTags) {
              lines.push(`${r.first_name};${r.last_name};${divisionLabel(r.division || '')};${categoryLabel(r.category || '')};${r.dq_reason || 'DQ'}`);
            }
          }
          break;
        }
      }

      const matchHeader = [
        `Match: ${activeMatch?.name || 'Match'} (${activeMatch?.organization || ''})`,
        `Date: ${formatDateLong(activeMatch?.date)}`,
        '',
      ].join('\n');

      const csv = '\uFEFF' + matchHeader + lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.csv`, 'csv', [
        { description: 'CSV file', accept: { 'text/csv': ['.csv'] } },
      ], 'results.csvExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  // ── HTML: client-side generation ─────────────────────────────────────

  const handleHTML = useCallback(async () => {
    if (!activeMatchId) return;
    try {
      const s = useResultsStore.getState();
      const parts: string[] = [];

      parts.push(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeMatch?.name || 'Match'} Results</title>
<style>
body{font-family:Arial,sans-serif;margin:20px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f4f4f4}
tr:nth-child(even){background:#f9f9f9}
.section{margin-bottom:24px;page-break-after:always}
.section:last-child{page-break-after:auto}
.section h2{margin:0 0 12px}
.section h3{margin:16px 0 8px;color:#555}
.dq-section{background:#fff0f0}
.dq-section th{background:#ffcccc}
</style></head><body>
<h1>${activeMatch?.name || 'Match'} (${activeMatch?.organization || ''})</h1>
<p>Date: ${formatDateLong(activeMatch?.date)}</p>`);

      switch (activeTab) {
        case 'byDivision': {
          for (const [division, results] of Object.entries(s.divisionResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section"><h2>${divisionLabel(division)}</h2>
<table><tr><th>Pos</th><th>Name</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>Time</th><th>%</th><th>Points</th></tr>`);
            for (const r of results as any[]) {
              parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${Number(r.match_percent).toFixed(2)}%</td><td>${Number(r.match_points).toFixed(2)}</td></tr>`);
            }
            parts.push('</table></div>');
          }
          if (s.dqDivisions.length) {
            parts.push(`<div class="section dq-section"><h2>Disqualified</h2>
<table><tr><th>Name</th><th>Division</th><th>DQ Reason</th></tr>`);
            for (const r of s.dqDivisions) {
              parts.push(`<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${r.dq_reason || 'DQ'}</td></tr>`);
            }
            parts.push('</table></div>');
          }
          break;
        }
        case 'overall': {
          parts.push(`<div class="section"><h2>Overall</h2>
<table><tr><th>Pos</th><th>Name</th><th>Division</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>Time</th><th>%</th><th>Points</th></tr>`);
          for (const r of s.overallResults as any[]) {
            parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${Number(r.match_percent).toFixed(2)}%</td><td>${Number(r.match_points).toFixed(2)}</td></tr>`);
          }
          parts.push('</table></div>');
          if (s.dqOverall.length) {
            parts.push(`<div class="section dq-section"><h2>Disqualified</h2>
<table><tr><th>Name</th><th>Division</th><th>DQ Reason</th></tr>`);
            for (const r of s.dqOverall) {
              parts.push(`<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${r.dq_reason || 'DQ'}</td></tr>`);
            }
            parts.push('</table></div>');
          }
          break;
        }
        case 'byStage': {
          for (const stage of s.stageResults) {
            parts.push(`<div class="section"><h2>Stage ${stage.stage_number}: ${stage.stage_name}</h2>`);
            if (stage.divisions && Object.keys(stage.divisions).length > 0) {
              for (const [division, scores] of Object.entries(stage.divisions).sort(([a], [b]) => a.localeCompare(b))) {
                parts.push(`<h3>${divisionLabel(division)}</h3>
<table><tr><th>Pos</th><th>Name</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>Time</th><th>%</th><th>Points</th><th>HF</th><th>Net</th></tr>`);
                for (const r of scores as any[]) {
                  parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${Number(r.stage_percent).toFixed(2)}%</td><td>${Number(r.stage_points).toFixed(2)}</td><td>${Number(r.hit_factor).toFixed(4)}</td><td>${Number(r.net_points).toFixed(2)}</td></tr>`);
                }
                parts.push('</table>');
              }
            } else {
              parts.push(`<table><tr><th>Pos</th><th>Name</th><th>Div</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>Time</th><th>%</th><th>Points</th><th>HF</th><th>Net</th></tr>`);
              for (const r of stage.scores || []) {
                parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${Number(r.stage_percent).toFixed(2)}%</td><td>${Number(r.stage_points).toFixed(2)}</td><td>${Number(r.hit_factor).toFixed(4)}</td><td>${Number(r.net_points).toFixed(2)}</td></tr>`);
              }
              parts.push('</table>');
            }
            if (stage.dq_scores?.length) {
              parts.push(`<h3>Disqualified</h3>
<table class="dq-section"><tr><th>Name</th><th>Division</th><th>HF</th><th>Net</th><th>DQ Reason</th></tr>`);
              for (const r of stage.dq_scores) {
                parts.push(`<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${Number(r.hit_factor).toFixed(4)}</td><td>${Number(r.net_points).toFixed(2)}</td><td>${r.dq_reason || 'DQ'}</td></tr>`);
              }
              parts.push('</table>');
            }
            parts.push('</div>');
          }
          break;
        }
        case 'byCategory': {
          for (const [cat, divisions] of Object.entries(s.categoryResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section"><h2>${categoryLabel(cat)}</h2>`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              parts.push(`<h3>${divisionLabel(division)}</h3>
<table><tr><th>Pos</th><th>Name</th><th>Time</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>%</th><th>Points</th></tr>`);
              for (const r of results) {
                parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${Number(r.match_percent).toFixed(2)}%</td><td>${Number(r.match_points).toFixed(2)}</td></tr>`);
              }
              parts.push('</table>');
            }
            parts.push('</div>');
          }
          if (s.dqCategories.length) {
            parts.push(`<div class="section dq-section"><h2>Disqualified</h2>
<table><tr><th>Name</th><th>Division</th><th>Category</th><th>DQ Reason</th></tr>`);
            for (const r of s.dqCategories) {
              parts.push(`<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${categoryLabel(r.category || '')}</td><td>${r.dq_reason || 'DQ'}</td></tr>`);
            }
            parts.push('</table></div>');
          }
          break;
        }
        case 'byTag': {
          for (const [tag, divisions] of Object.entries(s.tagResults).sort(([a], [b]) => a.localeCompare(b))) {
            parts.push(`<div class="section"><h2>Tag: ${tag}</h2>`);
            for (const [division, results] of Object.entries(divisions as Record<string, any[]>).sort(([a], [b]) => a.localeCompare(b))) {
              parts.push(`<h3>${divisionLabel(division)}</h3>
<table><tr><th>Pos</th><th>Name</th><th>Time</th><th>A</th><th>C</th><th>D</th><th>M</th><th>NS</th><th>P</th><th>%</th><th>Points</th></tr>`);
              for (const r of results) {
                parts.push(`<tr><td>${r.position}</td><td>${r.first_name} ${r.last_name}</td><td>${r.time != null ? Number(r.time).toFixed(2) : '—'}</td><td>${r.alpha}</td><td>${r.charlie}</td><td>${r.delta}</td><td>${r.miss}</td><td>${r.no_shoot}</td><td>${r.procedurals}</td><td>${Number(r.match_percent).toFixed(2)}%</td><td>${Number(r.match_points).toFixed(2)}</td></tr>`);
              }
              parts.push('</table>');
            }
            parts.push('</div>');
          }
          if (s.dqTags.length) {
            parts.push(`<div class="section dq-section"><h2>Disqualified</h2>
<table><tr><th>Name</th><th>Division</th><th>Category</th><th>DQ Reason</th></tr>`);
            for (const r of s.dqTags) {
              parts.push(`<tr><td>${r.first_name} ${r.last_name}</td><td>${divisionLabel(r.division || '')}</td><td>${categoryLabel(r.category || '')}</td><td>${r.dq_reason || 'DQ'}</td></tr>`);
            }
            parts.push('</table></div>');
          }
          break;
        }
      }

      parts.push('</body></html>');
      const html = parts.join('\n');
      const blob = new Blob([html], { type: 'text/html' });
      await showSaveDialog(blob, `${baseName}_${tabSuffix}.html`, 'html', [
        { description: 'HTML file', accept: { 'text/html': ['.html'] } },
      ], 'results.htmlExported');
    } catch (err: any) { addToast(err.message, 'error'); }
  }, [activeMatchId, activeTab, activeMatch, baseName, tabSuffix, showSaveDialog, addToast, t]);

  // ── PDF: client-side generation with fresh state ─────────────────────

  const handlePDF = useCallback(async () => {
    if (!activeMatchId) return;
    setPdfLoading(true);
    try {
      const s = useResultsStore.getState();
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      await loadPdfFonts(doc);
      setBoldFont(doc);

      const matchName = activeMatch?.name || 'Match';
      const matchDate = formatDateLong(activeMatch?.date);
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
        case 'byDivision': drawDivisionPDF(doc, autoTable, drawHeader, s.divisionResults, s.dqDivisions, t); break;
        case 'overall': drawOverallPDF(doc, autoTable, drawHeader, s.overallResults, s.dqOverall, t); break;
        case 'byStage': drawStagePDF(doc, autoTable, drawHeader, s.stageResults, t); break;
        case 'byCategory': drawCategoryPDF(doc, autoTable, drawHeader, s.categoryResults, s.dqCategories, t); break;
        case 'byTag': drawTagPDF(doc, autoTable, drawHeader, s.tagResults, s.dqTags, t); break;
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

  return {
    handlePrint,
    handlePDF,
    pdfLoading,
    handleCSV,
    handleHTML,
    saveModal,
    setSaveModal,
    confirmSave,
  }
}

export default useExportButtons;


// ── PDF drawing helpers (black & white only) ──────────────────────────

const MARGIN = 10;
const TITLE_SIZE = 14;
const SUBTITLE_SIZE = 11;
const TABLE_FONT = 9;

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
      head: [[t('results.position'), t('results.shooter'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.time'), t('results.matchPercent'), t('results.points')]],
      body: results.map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, r.time?.toFixed(2), `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
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
    head: [[t('results.position'), t('results.shooter'), t('results.division'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.time'), t('results.matchPercent'), t('results.points')]],
    body: results.map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, divisionLabel(r.division || ''), r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, r.time?.toFixed(2), `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
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

    const head = [[t('results.position'), t('results.shooter'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.time'), t('results.stagePercent'), t('results.points'), 'HF', t('results.netPoints')]];
    const makeRow = (r: any) => [r.position, `${r.first_name} ${r.last_name}`, r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, r.time?.toFixed(2), `${r.stage_percent?.toFixed(2)}%`, r.stage_points?.toFixed(2), r.hit_factor?.toFixed(4), r.net_points?.toFixed(2)];

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
      const headAll = [[t('results.position'), t('results.shooter'), t('results.division'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.time'), t('results.stagePercent'), t('results.points'), 'HF', t('results.netPoints')]];
      const makeRowAll = (r: any) => [r.position, `${r.first_name} ${r.last_name}`, divisionLabel(r.division || ''), r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, r.time?.toFixed(2), `${r.stage_percent?.toFixed(2)}%`, r.stage_points?.toFixed(2), r.hit_factor?.toFixed(4), r.net_points?.toFixed(2)];
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
        head: [[t('results.position'), t('results.shooter'), t('results.time'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.matchPercent'), t('results.points')]],
        body: (results as any[]).map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, r.time?.toFixed(2), r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
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
        head: [[t('results.position'), t('results.shooter'), t('results.time'), 'A', 'C', 'D', 'M', 'NS', 'P', t('results.matchPercent'), t('results.points')]],
        body: (results as any[]).map((r: any) => [r.position, `${r.first_name} ${r.last_name}`, r.time?.toFixed(2), r.alpha, r.charlie, r.delta, r.miss, r.no_shoot, r.procedurals, `${r.match_percent?.toFixed(2)}%`, r.match_points?.toFixed(2)]),
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
