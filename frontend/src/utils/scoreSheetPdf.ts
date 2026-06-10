/**
 * Printable score sheet PDF generator.
 * Generates blank A4 portrait score sheets for paper scoring,
 * auto-fitting multiple shooter slots per page.
 *
 * Layout: compact — narrow columns for pen tallies, steel/NPM on one line,
 * shooter info = name only.
 *
 * Reuses: loadPdfFonts, setBoldFont, setRegularFont from pdfFont.ts
 *         getScoringCategoryConfig from constants.ts
 */

import { loadPdfFonts, setBoldFont, setRegularFont } from './pdfFont';
import { getScoringCategoryConfig, getScoringCategory, ringValueLabel, SCORING_TYPES } from './constants';
import type { Stage } from '../types/stage';

// ── Public interface ──────────────────────────────────────────────────

export interface ScoreSheetInput {
  matchName: string;
  matchDate: string;
  organization: string;
  stage: Stage;
  sheetCount: number; // how many blank shooter slots
}

/**
 * Generate a printable score sheet PDF for one stage.
 * Returns the jsPDF doc — caller handles saving.
 */
export async function generateScoreSheetPdf(input: ScoreSheetInput): Promise<any> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadPdfFonts(doc);

  drawScoreSheetInDoc(doc, input);

  return doc;
}

/**
 * Draw score sheets into an existing jsPDF doc.
 * Used when combining multiple stages into one PDF.
 * The caller must already have called loadPdfFonts on the doc.
 */
export function generateScoreSheetInDoc(doc: any, input: ScoreSheetInput): void {
  drawScoreSheetInDoc(doc, input);
}

/** Internal: draw score sheets into doc */
function drawScoreSheetInDoc(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;

  // Skip chrono — no meaningful score sheet
  if (stage.scoring_type === 'chrono') return;

  const category = getScoringCategory(stage.scoring_type);

  switch (category) {
    case 'zone_per_target':
      drawZonePerTargetSheets(doc, input);
      break;
    case 'time_plus':
      drawTimePlusSheets(doc, input);
      break;
    case 'ring_per_shot':
      drawRingSheets(doc, input);
      break;
    case 'hit_count':
      drawHitCountSheets(doc, input);
      break;
  }
}

// ── Constants ──────────────────────────────────────────────────────────

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 8;
const USABLE_W = PAGE_W - 2 * MARGIN;

const ROW_H = 6; // mm per target row in autoTable (compact)
const HEADER_H = 16; // match + stage header (compact)
const SHOOTER_INFO_H = 7; // just name line
const PENALTY_H = 6; // penalty row (compact)
const TIME_H = 8; // time row (compact)
const SIGNATURE_H = 10; // signature lines (compact)
const SHEET_PAD = 3; // padding between sheets on same page

/** Shared autoTable options for B&W output */
const TABLE_STYLE = {
  theme: 'plain' as const,
  styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 7, textColor: 0, lineColor: 0, lineWidth: 0.3 },
  headStyles: { font: 'Roboto', fontStyle: 'bold', fontSize: 7, fillColor: [0, 0, 0], textColor: [255, 255, 255], lineColor: 0, lineWidth: 0.3 },
  alternateRowStyles: { fillColor: [255, 255, 255] },
  columnStyles: {} as Record<string, any>,
};

// ── Auto-fit helpers ──────────────────────────────────────────────────

/** Calculate how many mm one blank score sheet occupies (excluding inter-sheet padding) */
function sheetHeight(targetRows: number, penaltyRows: number): number {
  return HEADER_H + SHOOTER_INFO_H + (targetRows * ROW_H) + penaltyRows + PENALTY_H + TIME_H + SIGNATURE_H;
}

/** How many blank sheets fit on one A4 page */
function sheetsPerPage(targetRows: number, penaltyRows: number): number {
  const oneSheet = sheetHeight(targetRows, penaltyRows) + SHEET_PAD;
  const fit = Math.floor((PAGE_H - 2 * MARGIN) / oneSheet);
  return Math.max(1, fit);
}

/** Check if a sheet fits from currentY to end of page */
function fitsOnPage(currentY: number, targetRows: number, penaltyRows: number): boolean {
  return currentY + sheetHeight(targetRows, penaltyRows) <= PAGE_H - MARGIN;
}

// ── Drawing primitives ────────────────────────────────────────────────

function drawHeader(doc: any, input: ScoreSheetInput, y: number): number {
  const { matchName, matchDate, organization, stage } = input;

  // Match name (left) — Stage number + name (right)
  setBoldFont(doc); doc.setFontSize(9);
  doc.text(matchName, MARGIN, y + 4);
  const stageLabel = `Stage ${stage.stage_number}: ${stage.name}`;
  const stageLabelWidth = doc.getTextWidth(stageLabel);
  doc.text(stageLabel, PAGE_W - MARGIN - stageLabelWidth, y + 4);

  // Organization + date (left) — Scoring type (right)
  setRegularFont(doc); doc.setFontSize(7);
  const subLeft = [organization, matchDate].filter(Boolean).join(' • ');
  if (subLeft) doc.text(subLeft, MARGIN, y + 8);

  const scoringLabel = getScoringTypeLabel(stage.scoring_type);
  const rightText = stage.par_time ? `${scoringLabel} • Par ${stage.par_time}s` : scoringLabel;
  doc.text(rightText, PAGE_W - MARGIN, y + 8, { align: 'right' });

  // Separator line
  doc.setDrawColor(0); doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 10, PAGE_W - MARGIN, y + 10);

  return y + HEADER_H;
}

function drawShooterInfo(doc: any, y: number): number {
  setRegularFont(doc); doc.setFontSize(7);
  doc.text('Shooter:', MARGIN, y + 4);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 14, y + 4.5, PAGE_W - MARGIN, y + 4.5);

  return y + SHOOTER_INFO_H;
}

function drawPenaltyRow(doc: any, y: number, labels: string[]): number {
  setBoldFont(doc); doc.setFontSize(6);
  doc.text('Penalties:', MARGIN, y + 3.5);
  setRegularFont(doc); doc.setFontSize(7);

  let x = MARGIN + 18;
  const fieldW = 22;
  for (const label of labels) {
    doc.text(`${label}:`, x, y + 3.5);
    doc.setLineWidth(0.15);
    const labelW = doc.getTextWidth(`${label}:`) + 1;
    doc.line(x + labelW, y + 4, x + fieldW, y + 4);
    x += fieldW + 2;
    if (x > PAGE_W - MARGIN - 8) { x = MARGIN + 18; y += 4; }
  }

  return y + PENALTY_H;
}

function drawTimeRow(doc: any, y: number, label?: string): number {
  const timeLabel = label || 'TIME';
  setBoldFont(doc); doc.setFontSize(8);
  doc.text(`${timeLabel}:`, MARGIN, y + 5);
  doc.setLineWidth(0.3);
  const labelW = doc.getTextWidth(`${timeLabel}:`) + 2;
  doc.line(MARGIN + labelW, y + 5.5, PAGE_W - MARGIN, y + 5.5);
  setRegularFont(doc); doc.setFontSize(6);
  doc.text('s', PAGE_W - MARGIN - 2, y + 5);

  return y + TIME_H;
}

function drawSignatureLines(doc: any, y: number): number {
  setRegularFont(doc); doc.setFontSize(7);
  const halfW = USABLE_W / 2 - 2;

  // RO signature
  doc.text('RO:', MARGIN, y + 5);
  doc.setLineWidth(0.15);
  doc.line(MARGIN + 8, y + 5.5, MARGIN + halfW, y + 5.5);

  // Shooter signature
  const x2 = MARGIN + halfW + 8;
  doc.text('Shooter:', x2, y + 5);
  doc.line(x2 + 14, y + 5.5, x2 + halfW - 6, y + 5.5);

  return y + SIGNATURE_H;
}

function drawSeparator(doc: any, y: number): number {
  doc.setDrawColor(150); doc.setLineWidth(0.15);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0);
  return y + SHEET_PAD;
}

// ── Zone per target (IPSC/USPSA/IDPA) ─────────────────────────────────

function drawZonePerTargetSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;
  const config = getScoringCategoryConfig(stage.scoring_type);
  const isIdpa = stage.scoring_type === 'idpa';
  const labels = isIdpa
    ? (config as any).zoneLabels
    : { alpha: 'A', charlie: 'C', delta: 'D', miss: 'M', no_shoot: 'NS' };

  const hasNoShoot = stage.no_shoot_targets > 0;
  const hasSteel = stage.steel_targets > 0;
  const hasNpm = stage.npm_targets > 0;

  // Count target rows for height calculation:
  // paper targets + 1 for combined steel/NPM row (if any)
  const totalTargetRows = stage.paper_targets + (hasSteel || hasNpm ? 1 : 0);

  // Penalty labels by type
  const penaltyLabels = getPenaltyLabels(stage.scoring_type);
  const penaltyLineCount = Math.ceil(penaltyLabels.length / 6);
  const penaltyHeight = PENALTY_H * penaltyLineCount;

  let currentY = MARGIN;
  let sheetIndex = 0;

  while (sheetIndex < input.sheetCount) {
    // Check if a full sheet fits on the remaining page
    if (sheetIndex > 0 && !fitsOnPage(currentY, totalTargetRows, penaltyHeight)) {
      doc.addPage();
      currentY = MARGIN;
    }

    // Draw header
    currentY = drawHeader(doc, input, currentY);

    // Draw shooter info (name only)
    currentY = drawShooterInfo(doc, currentY);

    // Draw target table: steel/NPM combined row + paper target rows
    if (stage.paper_targets > 0 || hasSteel || hasNpm) {
      const paperCols = ['Tgt', labels.alpha, labels.charlie, labels.delta, labels.miss];
      if (hasNoShoot) paperCols.push(labels.no_shoot);
      const colCount = hasNoShoot ? 6 : 5;
      const paperBody: any[][] = [];

      // Steel + NPM combined row (first row, before paper targets)
      if (hasSteel || hasNpm) {
        let content = '';
        if (hasSteel) {
          content += `Steel (${stage.steel_targets}):  Hit ____  Miss ____`;
          if (hasNoShoot) content += '  NS ____';
        }
        if (hasNpm) {
          if (hasSteel) content += '   ';
          content += `NPM (${stage.npm_targets}):  Hit ____`;
        }
        paperBody.push([{ content, colSpan: colCount, styles: { fontStyle: 'bold', fontSize: 7, fillColor: [245, 245, 245] } }]);
      }

      // Paper target rows
      for (let i = 1; i <= stage.paper_targets; i++) {
        const row: string[] = [String(i), '', '', '', ''];
        if (hasNoShoot) row.push('');
        paperBody.push(row);
      }

      const colWidths = getPaperColumnWidths(hasNoShoot, USABLE_W);
      (doc as any).autoTable({
        ...TABLE_STYLE,
        startY: currentY,
        margin: { left: MARGIN, right: MARGIN },
        head: [paperCols],
        body: paperBody,
        columnStyles: colWidths,
        rowPageBreak: 'avoid',
      });
      currentY = (doc as any).lastAutoTable.finalY + 1;
    }

    // Draw penalties
    currentY = drawPenaltyRow(doc, currentY, penaltyLabels);

    // Draw time
    const timeLabel = stage.scoring_type === 'fixed_time' ? `TIME (Par ${stage.par_time || 0}s)` : undefined;
    currentY = drawTimeRow(doc, currentY, timeLabel);

    // Draw signatures
    currentY = drawSignatureLines(doc, currentY);

    sheetIndex++;

    // Inter-sheet separator
    if (sheetIndex < input.sheetCount) {
      currentY = drawSeparator(doc, currentY);
    }
  }
}

// ── Time Plus (Action Steel, Multi-Gun) ───────────────────────────────

function drawTimePlusSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;

  if (stage.scoring_type === 'action_steel') {
    drawActionSteelSheets(doc, input);
    return;
  }

  // Multi-Gun: neutralize targets + penalties + time
  drawMultiGunSheets(doc, input);
}

function drawActionSteelSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;
  const numStrings = stage.config?.number_of_strings || 5;

  // Build per-string time table
  const head = [['#', 'Time (s)', 'Misses', 'Penalty']];
  const body: string[][] = [];
  for (let i = 1; i <= numStrings; i++) {
    body.push([String(i), '', '', '']);
  }

  const targetRows = numStrings;

  let currentY = MARGIN;
  let sheetIndex = 0;

  while (sheetIndex < input.sheetCount) {
    if (sheetIndex > 0 && !fitsOnPage(currentY, targetRows, 0)) {
      doc.addPage();
      currentY = MARGIN;
    }

    currentY = drawHeader(doc, input, currentY);
    currentY = drawShooterInfo(doc, currentY);

    const colW0 = 12;
    const colW1 = USABLE_W * 0.35;
    const colW2 = USABLE_W * 0.25;
    const colW3 = USABLE_W - colW0 - colW1 - colW2;
    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: currentY,
      margin: { left: MARGIN, right: MARGIN },
      head,
      body,
      columnStyles: {
        0: { cellWidth: colW0 },
        1: { cellWidth: colW1 },
        2: { cellWidth: colW2 },
        3: { cellWidth: colW3 },
      },
      tableWidth: USABLE_W,
    });
    currentY = (doc as any).lastAutoTable.finalY + 2;

    // Total time row
    setBoldFont(doc); doc.setFontSize(8);
    doc.text('Total Time:', MARGIN, currentY + 4);
    doc.setLineWidth(0.3);
    doc.line(MARGIN + 22, currentY + 4.5, PAGE_W - MARGIN, currentY + 4.5);
    currentY += 6;

    currentY = drawSignatureLines(doc, currentY);

    sheetIndex++;
    if (sheetIndex < input.sheetCount) {
      currentY = drawSeparator(doc, currentY);
    }
  }
}

function drawMultiGunSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;
  const numTargets = stage.config?.num_targets || stage.steel_targets || 5;
  const hasNoShoot = stage.config?.has_no_shoot || stage.no_shoot_targets > 0;

  // Target table: each target = Neutralized (Y/N)
  const headCols = ['Tgt', 'Neutralized'];
  if (hasNoShoot) headCols.push('NS');
  const head = [headCols];
  const body: string[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    const row = [String(i), ''];
    if (hasNoShoot) row.push('');
    body.push(row);
  }

  const targetRows = numTargets;
  const penaltyLabels = ['FTN', 'Miss', 'NS', 'Proc (s)'];
  const penaltyLineCount = Math.ceil(penaltyLabels.length / 6);
  const penaltyHeight = PENALTY_H * penaltyLineCount;

  let currentY = MARGIN;
  let sheetIndex = 0;

  while (sheetIndex < input.sheetCount) {
    if (sheetIndex > 0 && !fitsOnPage(currentY, targetRows, penaltyHeight)) {
      doc.addPage();
      currentY = MARGIN;
    }

    currentY = drawHeader(doc, input, currentY);
    currentY = drawShooterInfo(doc, currentY);

    const colW0 = 12;
    const colW1 = hasNoShoot ? USABLE_W * 0.5 : USABLE_W * 0.75;
    const colW2 = hasNoShoot ? USABLE_W - colW0 - colW1 : 0;
    const colStyles: Record<string, any> = {
      0: { cellWidth: colW0 },
      1: { cellWidth: colW1 },
    };
    if (hasNoShoot) colStyles[2] = { cellWidth: colW2 };

    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: currentY,
      margin: { left: MARGIN, right: MARGIN },
      head,
      body,
      columnStyles: colStyles,
      tableWidth: USABLE_W,
    });
    currentY = (doc as any).lastAutoTable.finalY + 2;

    currentY = drawPenaltyRow(doc, currentY, penaltyLabels);
    currentY = drawTimeRow(doc, currentY);
    currentY = drawSignatureLines(doc, currentY);

    sheetIndex++;
    if (sheetIndex < input.sheetCount) {
      currentY = drawSeparator(doc, currentY);
    }
  }
}

// ── Ring per shot (Bullseye, Archery) ──────────────────────────────────

function drawRingSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;
  const config = getScoringCategoryConfig(stage.scoring_type) as any;
  const isArchery = stage.scoring_type === 'archery';
  const ringValues: number[] = config.ringValues || (isArchery ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [10, 9, 8, 7, 6, 5]);
  const hasX = config.hasX && !isArchery;

  // Build header: Shot # | ring value columns
  const ringHeaders = hasX ? ['X', ...ringValues.map(v => ringValueLabel(v))] : ringValues.map(v => ringValueLabel(v));
  const head = [['#', ...ringHeaders]];
  const body: string[][] = [];

  const numLines = isArchery ? 6 : 3; // typical: 6 ends for archery, 3 strings for bullseye
  for (let i = 1; i <= numLines; i++) {
    body.push([String(i), ...ringHeaders.map(() => '')]);
  }

  // Total score row
  body.push(['Total', '']);

  const targetRows = numLines + 1;

  let currentY = MARGIN;
  let sheetIndex = 0;

  while (sheetIndex < input.sheetCount) {
    if (sheetIndex > 0 && !fitsOnPage(currentY, targetRows, 0)) {
      doc.addPage();
      currentY = MARGIN;
    }

    currentY = drawHeader(doc, input, currentY);
    currentY = drawShooterInfo(doc, currentY);

    // Draw ring score table
    const colCount = 1 + ringHeaders.length;
    const colW = USABLE_W / colCount;
    const colStyles: Record<string, any> = {};
    for (let c = 0; c < colCount; c++) {
      colStyles[c] = { cellWidth: colW };
    }

    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: currentY,
      margin: { left: MARGIN, right: MARGIN },
      head,
      body,
      columnStyles: colStyles,
      tableWidth: USABLE_W,
    });
    currentY = (doc as any).lastAutoTable.finalY + 2;

    // Total score row is already in the table; just add signature
    currentY += 3;
    currentY = drawSignatureLines(doc, currentY);

    sheetIndex++;
    if (sheetIndex < input.sheetCount) {
      currentY = drawSeparator(doc, currentY);
    }
  }
}

// ── Hit count (NRL22, PRS variant) ────────────────────────────────────

function drawHitCountSheets(doc: any, input: ScoreSheetInput): void {
  const { stage } = input;
  const numTargets = stage.config?.num_targets || stage.npm_targets || stage.steel_targets || 10;
  const isPrs = stage.config?.variant === 'prs' || stage.scoring_type === 'nrl22';

  const head = [['Tgt', 'Hit']];
  const body: string[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    body.push([String(i), '']);
  }

  const targetRows = numTargets;
  const hasTime = isPrs && stage.scoring_type !== 'nrl22';

  let currentY = MARGIN;
  let sheetIndex = 0;

  while (sheetIndex < input.sheetCount) {
    if (sheetIndex > 0 && !fitsOnPage(currentY, targetRows, 0)) {
      doc.addPage();
      currentY = MARGIN;
    }

    currentY = drawHeader(doc, input, currentY);
    currentY = drawShooterInfo(doc, currentY);

    const colW1 = 12;
    const colW2 = USABLE_W - colW1;
    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: currentY,
      margin: { left: MARGIN, right: MARGIN },
      head,
      body,
      columnStyles: { 0: { cellWidth: colW1 }, 1: { cellWidth: colW2 } },
      tableWidth: USABLE_W,
    });
    currentY = (doc as any).lastAutoTable.finalY + 2;

    if (hasTime) {
      currentY = drawTimeRow(doc, currentY);
    }

    currentY = drawSignatureLines(doc, currentY);

    sheetIndex++;
    if (sheetIndex < input.sheetCount) {
      currentY = drawSeparator(doc, currentY);
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function getScoringTypeLabel(type: string): string {
  const found = SCORING_TYPES.find(s => s.value === type);
  return found ? found.label : type;
}

function getPenaltyLabels(scoringType: string): string[] {
  switch (scoringType) {
    case 'comstock':
    case 'hit_factor':
      return ['Proc', 'FTSA'];
    case 'virginia':
      return ['Proc', 'FTSA', 'Ex Shot', 'Ex Hit', 'Stack'];
    case 'fixed_time':
      return ['NS', 'Proc', 'Ex Shot', 'Ex Hit', 'Stack', 'Overtime'];
    case 'idpa':
      return ['PE', 'HNT', 'FTN', 'FP', 'FTDR'];
    default:
      return [];
  }
}

/** Very narrow column widths for paper targets — shooters make pen tally marks */
function getPaperColumnWidths(hasNoShoot: boolean, _usableW: number): Record<string, any> {
  // Target number column: wide enough for "1", "2", etc.
  const tgtW = 12;
  // Zone columns: narrow — just for pen tallies like || or ||||
  const zoneW = 15;
  const nsW = 15; // no-shoot column same narrow width

  const cols: Record<string, any> = {
    0: { cellWidth: tgtW },   // Tgt #
    1: { cellWidth: zoneW },  // A / -0
    2: { cellWidth: zoneW },  // C / -1
    3: { cellWidth: zoneW },  // D / -3
    4: { cellWidth: zoneW },  // M
  };
  if (hasNoShoot) {
    cols[5] = { cellWidth: nsW }; // NS
  }
  return cols;
}

// ── Save helpers (reused from ExportButtons pattern) ──────────────────

/** Try native Save As dialog (Chromium). Returns true if handled. */
export async function nativeSaveAs(
  blob: Blob,
  defaultName: string,
  types: { description: string; accept: Record<string, string[]> }[]
): Promise<boolean> {
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

/** Fallback: download blob with a custom filename */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}