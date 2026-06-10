/**
 * Printable score sheet PDF generator.
 * Generates blank A4 portrait score sheets — one page per shooter,
 * multiple stages in 2-column layout.
 *
 * Layout: 2 columns per page, stages side by side.
 * Full-width: page header, shooter name, signatures.
 * Per-column: stage header, target table, penalties, time.
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
  stages: Stage[];
  sheetCount: number;
}

/**
 * Generate a printable score sheet PDF — one page per shooter with all stages.
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
 * The caller must already have called loadPdfFonts on the doc.
 */
export function generateScoreSheetInDoc(doc: any, input: ScoreSheetInput): void {
  drawScoreSheetInDoc(doc, input);
}

// ── Layout types ──────────────────────────────────────────────────────

interface Col {
  leftX: number;
  rightX: number;
  width: number;
}

interface StagePair {
  left: Stage;
  right?: Stage;
}

interface PageLayout {
  pairs: StagePair[];
  isFirst: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const USABLE_W = PAGE_W - 2 * MARGIN;

const ROW_H = 6;
const PAGE_HEADER_H = 10;
const SHOOTER_PER_STAGE_H = 5;  // shooter name line per stage block
const STAGE_HEADER_H = 6;
const PENALTY_H = 6;
const TIME_H = 8;
const SIGNATURE_H = 10;
const STAGE_GAP = 2;
const MINI_HEADER_H = 5;
const COLUMN_GAP = 4;
const COLUMN_W = (USABLE_W - COLUMN_GAP) / 2;
const LEFT_COL: Col = { leftX: MARGIN, rightX: MARGIN + COLUMN_W, width: COLUMN_W };
const RIGHT_COL: Col = { leftX: MARGIN + COLUMN_W + COLUMN_GAP, rightX: PAGE_W - MARGIN, width: COLUMN_W };
const FULL_COL: Col = { leftX: MARGIN, rightX: PAGE_W - MARGIN, width: USABLE_W };

const TABLE_STYLE = {
  theme: 'plain' as const,
  styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 7, textColor: 0, lineColor: 0, lineWidth: 0.3 },
  headStyles: { font: 'Roboto', fontStyle: 'bold', fontSize: 7, fillColor: [0, 0, 0], textColor: [255, 255, 255], lineColor: 0, lineWidth: 0.3 },
  alternateRowStyles: { fillColor: [255, 255, 255] },
  columnStyles: {} as Record<string, any>,
};

// ── Height estimation ──────────────────────────────────────────────────

function stageBlockHeight(stage: Stage): number {
  const category = getScoringCategory(stage.scoring_type);
  if (stage.scoring_type === 'chrono') return 0;

  let tableRows = 1; // header row
  switch (category) {
    case 'zone_per_target': {
      const hasSteel = stage.steel_targets > 0;
      const hasNpm = stage.npm_targets > 0;
      tableRows += stage.paper_targets + (hasSteel || hasNpm ? 1 : 0);
      break;
    }
    case 'time_plus': {
      if (stage.scoring_type === 'action_steel') {
        tableRows += (stage.config?.number_of_strings || 5) + 1;
      } else {
        tableRows += (stage.config?.num_targets || stage.steel_targets || 5);
      }
      break;
    }
    case 'ring_per_shot': {
      const isArchery = stage.scoring_type === 'archery';
      tableRows += (isArchery ? 6 : 3) + 1;
      break;
    }
    case 'hit_count': {
      tableRows += (stage.config?.num_targets || stage.npm_targets || stage.steel_targets || 10);
      break;
    }
  }

  const tableH = tableRows * ROW_H;
  const penaltyLabels = getPenaltyLabels(stage.scoring_type);
  const penaltyH = penaltyLabels.length > 0 ? PENALTY_H : 0;
  const hasTime = category !== 'ring_per_shot' &&
    !(category === 'hit_count' && (stage.config?.variant === 'prs' || stage.scoring_type === 'nrl22'));
  const timeH = hasTime ? TIME_H : 0;

  return SHOOTER_PER_STAGE_H + STAGE_HEADER_H + tableH + penaltyH + timeH + STAGE_GAP;
}

/** Layout stages into page pairs for one shooter (2-column grid). */
function layoutPagesForShooter(stages: Stage[]): PageLayout[] {
  const printableStages = stages.filter(s => s.scoring_type !== 'chrono');
  if (printableStages.length === 0) return [];

  // Pair stages: [0,1], [2,3], [4,5], ...
  const pairs: StagePair[] = [];
  for (let i = 0; i < printableStages.length; i += 2) {
    pairs.push({ left: printableStages[i], right: printableStages[i + 1] });
  }

  const pages: PageLayout[] = [];
  let currentPairs: StagePair[] = [];
  let currentY = 0;

  for (const pair of pairs) {
    const leftH = stageBlockHeight(pair.left);
    const rightH = pair.right ? stageBlockHeight(pair.right) : 0;
    const pairH = Math.max(leftH, rightH);

    const isFirstPage = pages.length === 0 && currentPairs.length === 0;
    const headerH = isFirstPage ? PAGE_HEADER_H : MINI_HEADER_H;
    const overhead = currentPairs.length === 0 ? headerH : STAGE_GAP;
    const neededY = currentY + overhead + pairH;
    const maxY = PAGE_H - MARGIN - SIGNATURE_H;

    if (currentPairs.length === 0 || neededY <= maxY) {
      currentPairs.push(pair);
      currentY += (currentPairs.length === 1 ? overhead : STAGE_GAP) + pairH;
    } else {
      pages.push({ pairs: currentPairs, isFirst: pages.length === 0 });
      currentPairs = [pair];
      currentY = MINI_HEADER_H + pairH;
    }
  }

  if (currentPairs.length > 0) {
    pages.push({ pairs: currentPairs, isFirst: pages.length === 0 });
  }

  return pages;
}

// ── Main orchestration ─────────────────────────────────────────────────

function drawScoreSheetInDoc(doc: any, input: ScoreSheetInput): void {
  const { stages, sheetCount } = input;
  const printableStages = stages.filter(s => s.scoring_type !== 'chrono');
  if (printableStages.length === 0) return;

  const pages = layoutPagesForShooter(printableStages);
  if (pages.length === 0) return;

  for (let copy = 0; copy < sheetCount; copy++) {
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      if (copy > 0 || pageIndex > 0) doc.addPage();

      const page = pages[pageIndex];
      let currentY = MARGIN;

      // Page header (full width)
      currentY = drawPageHeader(doc, input, currentY, !page.isFirst);

      // Draw stage pairs in 2-column layout (shooter name is per-stage inside drawStageBlock)
      for (const pair of page.pairs) {
        const leftEndY = drawStageBlock(doc, pair.left, currentY, LEFT_COL);

        const rightEndY = pair.right
          ? drawStageBlock(doc, pair.right, currentY, RIGHT_COL)
          : currentY;

        // Advance Y to the bottom of the taller column
        currentY = Math.max(leftEndY, rightEndY) + STAGE_GAP;
      }

      // Signatures (full width)
      if (currentY + SIGNATURE_H > PAGE_H - MARGIN) {
        doc.addPage();
        currentY = MARGIN;
        currentY = drawPageHeader(doc, input, currentY, true);
      }
      currentY = drawSignatureLines(doc, currentY);
    }
  }
}

// ── Drawing primitives ──────────────────────────────────────────────────

function drawPageHeader(doc: any, input: ScoreSheetInput, y: number, isContinuation: boolean): number {
  const { matchName, matchDate, organization } = input;

  if (!isContinuation) {
    setBoldFont(doc); doc.setFontSize(10);
    doc.text(matchName, MARGIN, y + 4);
    setRegularFont(doc); doc.setFontSize(7);
    const subRight = [organization, matchDate].filter(Boolean).join(' • ');
    if (subRight) doc.text(subRight, PAGE_W - MARGIN, y + 4, { align: 'right' });
    doc.setDrawColor(0); doc.setLineWidth(0.4);
    doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
    return y + PAGE_HEADER_H;
  } else {
    setRegularFont(doc); doc.setFontSize(7);
    doc.text(`${matchName} (continued)`, MARGIN, y + 3);
    doc.setDrawColor(150); doc.setLineWidth(0.15);
    doc.line(MARGIN, y + 4, PAGE_W - MARGIN, y + 4);
    return y + MINI_HEADER_H;
  }
}

function drawShooterInfo(doc: any, y: number, col?: Col): number {
  const c = col || FULL_COL;
  setRegularFont(doc); doc.setFontSize(7);
  doc.text('Shooter:', c.leftX, y + 3);
  doc.setLineWidth(0.2);
  const labelW = doc.getTextWidth('Shooter:') + 1;
  doc.line(c.leftX + labelW, y + 3.5, c.rightX, y + 3.5);
  return y + 5;
}

function drawPenaltyRow(doc: any, y: number, labels: string[], col: Col): number {
  if (labels.length === 0) return y;

  setBoldFont(doc); doc.setFontSize(8);
  doc.text('Penalties:', col.leftX, y + 3.5);
  setRegularFont(doc); doc.setFontSize(8);

  let x = col.leftX + 20;
  const fieldW = 25;
  for (const label of labels) {
    // Wrap to next line if exceeding column width
    if (x + fieldW > col.rightX) { x = col.leftX + 18; y += 4; }
    doc.text(`${label}:`, x, y + 3.5);
    doc.setLineWidth(0.15);
    const labelW = doc.getTextWidth(`${label}:`) + 1;
    doc.line(x + labelW, y + 4, x + fieldW, y + 4);
    x += fieldW + 2;
  }

  return y + PENALTY_H;
}

function drawTimeRow(doc: any, y: number, label: string | undefined, col: Col): number {
  const timeLabel = label || 'TIME';
  setBoldFont(doc); doc.setFontSize(8);
  doc.text(`${timeLabel}:`, col.leftX, y + 5);
  doc.setLineWidth(0.3);
  const labelW = doc.getTextWidth(`${timeLabel}:`) + 2;
  doc.line(col.leftX + labelW, y + 5.5, col.rightX, y + 5.5);
  setRegularFont(doc); doc.setFontSize(6);
  doc.text('s', col.rightX - 2, y + 5);
  return y + TIME_H;
}

function drawSignatureLines(doc: any, y: number): number {
  setRegularFont(doc); doc.setFontSize(7);
  const halfW = USABLE_W / 2 - 2;

  doc.text('RO:', MARGIN, y + 5);
  doc.setLineWidth(0.15);
  doc.line(MARGIN + 8, y + 5.5, MARGIN + halfW, y + 5.5);

  const x2 = MARGIN + halfW + 8;
  doc.text('Shooter:', x2, y + 5);
  doc.line(x2 + 14, y + 5.5, x2 + halfW - 6, y + 5.5);

  return y + SIGNATURE_H;
}

// ── Stage block drawing ────────────────────────────────────────────────

function drawStageHeader(doc: any, stage: Stage, y: number, col: Col): number {
  setBoldFont(doc); doc.setFontSize(7);
  const stageLabel = `Stg ${stage.stage_number}: ${stage.name}`;
  doc.text(stageLabel, col.leftX, y + 3.5);

  setRegularFont(doc); doc.setFontSize(5.5);
  const scoringLabel = getScoringTypeLabel(stage.scoring_type);
  const targetParts: string[] = [];
  if (stage.paper_targets > 0) targetParts.push(`${stage.paper_targets}×${stage.hits_per_paper}`);
  if (stage.steel_targets > 0) targetParts.push(`${stage.steel_targets}stl`);
  if (stage.npm_targets > 0) targetParts.push(`${stage.npm_targets}npm`);
  const rightText = targetParts.length > 0 ? `${scoringLabel} ${targetParts.join(' ')}` : scoringLabel;
  if (stage.par_time) {
    doc.text(`${rightText} • Par ${stage.par_time}s`, col.rightX, y + 3.5, { align: 'right' });
  } else {
    doc.text(rightText, col.rightX, y + 3.5, { align: 'right' });
  }

  doc.setDrawColor(0); doc.setLineWidth(0.15);
  doc.line(col.leftX, y + 5, col.rightX, y + 5);

  return y + STAGE_HEADER_H;
}

function drawStageBlock(doc: any, stage: Stage, y: number, col: Col): number {
  const category = getScoringCategory(stage.scoring_type);
  if (stage.scoring_type === 'chrono') return y;

  // Shooter name line (per-column)
  y = drawShooterInfo(doc, y, col);

  y = drawStageHeader(doc, stage, y, col);

  switch (category) {
    case 'zone_per_target':
      y = drawZonePerTargetTable(doc, stage, y, col);
      break;
    case 'time_plus':
      y = drawTimePlusTable(doc, stage, y, col);
      break;
    case 'ring_per_shot':
      y = drawRingTable(doc, stage, y, col);
      break;
    case 'hit_count':
      y = drawHitCountTable(doc, stage, y, col);
      break;
  }

  return y;
}

// ── Zone per target (IPSC/USPSA/IDPA) ─────────────────────────────────

function drawZonePerTargetTable(doc: any, stage: Stage, y: number, col: Col): number {
  const config = getScoringCategoryConfig(stage.scoring_type);
  const isIdpa = stage.scoring_type === 'idpa';
  const labels = isIdpa
    ? (config as any).zoneLabels
    : { alpha: 'A', charlie: 'C', delta: 'D', miss: 'M', no_shoot: 'NS' };

  const hasNoShoot = stage.no_shoot_targets > 0;
  const hasSteel = stage.steel_targets > 0;
  const hasNpm = stage.npm_targets > 0;

  if (stage.paper_targets > 0 || hasSteel || hasNpm) {
    const paperCols = ['Tgt', labels.alpha, labels.charlie, labels.delta, labels.miss];
    if (hasNoShoot) paperCols.push(labels.no_shoot);
    const colCount = hasNoShoot ? 6 : 5;
    const paperBody: any[][] = [];

    if (hasSteel || hasNpm) {
      let content = '';
      if (hasSteel) {
        content += `Steel (${stage.steel_targets}): Hit __ Miss __`;
        if (hasNoShoot) content += ' NS __';
      }
      if (hasNpm) {
        if (hasSteel) content += '  ';
        content += `NPM (${stage.npm_targets}): Hit __`;
      }
      paperBody.push([{ content, colSpan: colCount, styles: { fontStyle: 'bold', fontSize: 8, fillColor: [245, 245, 245] } }]);
    }

    for (let i = 1; i <= stage.paper_targets; i++) {
      const row: string[] = [String(i), '', '', '', ''];
      if (hasNoShoot) row.push('');
      paperBody.push(row);
    }

    const colWidths = getPaperColumnWidths(hasNoShoot, col.width);
    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: y,
      margin: { left: col.leftX, right: PAGE_W - col.rightX },
      head: [paperCols],
      body: paperBody,
      columnStyles: colWidths,
      rowPageBreak: 'avoid',
    });
    y = (doc as any).lastAutoTable.finalY + 1;
  }

  const penaltyLabels = getPenaltyLabels(stage.scoring_type);
  y = drawPenaltyRow(doc, y, penaltyLabels, col);

  const timeLabel = stage.scoring_type === 'fixed_time' ? `TIME (Par ${stage.par_time || 0}s)` : undefined;
  y = drawTimeRow(doc, y, timeLabel, col);

  return y;
}

// ── Time Plus (Action Steel, Multi-Gun) ───────────────────────────────

function drawTimePlusTable(doc: any, stage: Stage, y: number, col: Col): number {
  if (stage.scoring_type === 'action_steel') {
    return drawActionSteelTable(doc, stage, y, col);
  }
  return drawMultiGunTable(doc, stage, y, col);
}

function drawActionSteelTable(doc: any, stage: Stage, y: number, col: Col): number {
  const numStrings = stage.config?.number_of_strings || 5;

  const head = [['#', 'Time (s)', 'Miss', 'Pen']];
  const body: string[][] = [];
  for (let i = 1; i <= numStrings; i++) {
    body.push([String(i), '', '', '']);
  }

  (doc as any).autoTable({
    ...TABLE_STYLE,
    startY: y,
    margin: { left: col.leftX, right: PAGE_W - col.rightX },
    head,
    body,
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: col.width * 0.4 },
      2: { cellWidth: col.width * 0.25 },
      3: { cellWidth: col.width - 10 - col.width * 0.4 - col.width * 0.25 },
    },
    tableWidth: col.width,
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  setBoldFont(doc); doc.setFontSize(7);
  doc.text('Total:', col.leftX, y + 3.5);
  doc.setLineWidth(0.3);
  doc.line(col.leftX + 14, y + 4, col.rightX, y + 4);
  y += 5;

  return y;
}

function drawMultiGunTable(doc: any, stage: Stage, y: number, col: Col): number {
  const numTargets = stage.config?.num_targets || stage.steel_targets || 5;
  const hasNoShoot = stage.config?.has_no_shoot || stage.no_shoot_targets > 0;

  const headCols = ['Tgt', 'Neutralized'];
  if (hasNoShoot) headCols.push('NS');
  const head = [headCols];
  const body: string[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    const row = [String(i), ''];
    if (hasNoShoot) row.push('');
    body.push(row);
  }

  const colW0 = 10;
  const colW1 = hasNoShoot ? col.width * 0.55 : col.width * 0.8;
  const colW2 = hasNoShoot ? col.width - colW0 - colW1 : 0;
  const colStyles: Record<string, any> = { 0: { cellWidth: colW0 }, 1: { cellWidth: colW1 } };
  if (hasNoShoot) colStyles[2] = { cellWidth: colW2 };

  (doc as any).autoTable({
    ...TABLE_STYLE,
    startY: y,
    margin: { left: col.leftX, right: PAGE_W - col.rightX },
    head,
    body,
    columnStyles: colStyles,
    tableWidth: col.width,
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  const penaltyLabels = ['FTN', 'Miss', 'NS', 'Proc (s)'];
  y = drawPenaltyRow(doc, y, penaltyLabels, col);
  y = drawTimeRow(doc, y, undefined, col);

  return y;
}

// ── Ring per shot (Bullseye, Archery) ──────────────────────────────────

function drawRingTable(doc: any, stage: Stage, y: number, col: Col): number {
  const config = getScoringCategoryConfig(stage.scoring_type) as any;
  const isArchery = stage.scoring_type === 'archery';
  const ringValues: number[] = config.ringValues || (isArchery ? [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] : [10, 9, 8, 7, 6, 5]);
  const hasX = config.hasX && !isArchery;

  const ringHeaders = hasX ? ['X', ...ringValues.map(v => ringValueLabel(v))] : ringValues.map(v => ringValueLabel(v));
  const head = [['#', ...ringHeaders]];
  const body: string[][] = [];

  const numLines = isArchery ? 6 : 3;
  for (let i = 1; i <= numLines; i++) {
    body.push([String(i), ...ringHeaders.map(() => '')]);
  }
  body.push(['Total', '']);

  const colCount = 1 + ringHeaders.length;
  const colW = col.width / colCount;
  const colStyles: Record<string, any> = {};
  for (let c = 0; c < colCount; c++) {
    colStyles[c] = { cellWidth: colW };
  }

  (doc as any).autoTable({
    ...TABLE_STYLE,
    startY: y,
    margin: { left: col.leftX, right: PAGE_W - col.rightX },
    head,
    body,
    columnStyles: colStyles,
    tableWidth: col.width,
  });
  y = (doc as any).lastAutoTable.finalY + 2;
  y += 2;

  return y;
}

// ── Hit count (NRL22, PRS variant) ────────────────────────────────────

function drawHitCountTable(doc: any, stage: Stage, y: number, col: Col): number {
  const numTargets = stage.config?.num_targets || stage.npm_targets || stage.steel_targets || 10;

  const head = [['Tgt', 'Hit']];
  const body: string[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    body.push([String(i), '']);
  }

  (doc as any).autoTable({
    ...TABLE_STYLE,
    startY: y,
    margin: { left: col.leftX, right: PAGE_W - col.rightX },
    head,
    body,
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: col.width - 10 } },
    tableWidth: col.width,
  });
  y = (doc as any).lastAutoTable.finalY + 1;

  const isPrs = stage.config?.variant === 'prs' || stage.scoring_type === 'nrl22';
  const hasTime = isPrs && stage.scoring_type !== 'nrl22';
  if (hasTime) {
    y = drawTimeRow(doc, y, undefined, col);
  }

  return y;
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

/** Column widths for paper targets — scaled to column width */
function getPaperColumnWidths(hasNoShoot: boolean, colWidth: number): Record<string, any> {
  const tgtW = Math.max(8, colWidth * 0.13);
  const zoneW = (colWidth - tgtW) / (hasNoShoot ? 5 : 4);

  const cols: Record<string, any> = {
    0: { cellWidth: tgtW },
    1: { cellWidth: zoneW },
    2: { cellWidth: zoneW },
    3: { cellWidth: zoneW },
    4: { cellWidth: zoneW },
  };
  if (hasNoShoot) {
    cols[5] = { cellWidth: zoneW };
  }
  return cols;
}

// ── Save helpers ────────────────────────────────────────────────────────

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

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}