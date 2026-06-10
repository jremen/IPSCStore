/**
 * Printable score sheet PDF generator.
 * Generates blank A4 portrait score sheets — one page per shooter,
 * multiple stages in 2-column layout.
 *
 * Layout: 2 columns per page, stages side by side.
 * Full-width: page header, shooter name, signatures.
 * Per-column: stage header, target table (with penalties/time inside).
 *
 * Reuses: loadPdfFonts, setBoldFont, setRegularFont from pdfFont.ts
 *         getScoringCategoryConfig from constants.ts
 */

import { loadPdfFonts, setBoldFont, setRegularFont } from './pdfFont';
import { getScoringCategoryConfig, getScoringCategory, ringValueLabel, SCORING_TYPES } from './constants';
import type { Stage } from '../types/stage';
import i18next from "i18next";

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
const STEEL_ROW_H = 9;       // taller row for pen-friendly steel/NPM fields
const PAGE_HEADER_H = 10;
const SHOOTER_PER_STAGE_H = 10;
const STAGE_HEADER_H = 8;    // taller for bold "Stage N" header
const PENALTY_ROW_H = 10;     // height of a single penalty row inside the table
const TIME_ROW_H = 10;        // height of the time row inside the table
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
  let steelRows = 0;
  switch (category) {
    case 'zone_per_target': {
      const hasSteel = stage.steel_targets > 0;
      const hasNpm = stage.npm_targets > 0;
      tableRows += stage.paper_targets;
      if (hasSteel || hasNpm) steelRows = 1;
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

  const tableH = tableRows * ROW_H + steelRows * STEEL_ROW_H;

  // Penalty and time rows are now inside the table
  const penaltyLabels = getPenaltyLabels(stage.scoring_type);
  const penaltyRows = penaltyLabels.length > 0 ? Math.ceil(penaltyLabels.length / 3) : 0;
  const penaltyH = penaltyRows * PENALTY_ROW_H;
  const hasTime = category !== 'ring_per_shot' &&
    !(category === 'hit_count' && (stage.config?.variant === 'prs' || stage.scoring_type === 'nrl22'));
  const timeH = hasTime ? TIME_ROW_H : 0;

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
  setRegularFont(doc); doc.setFontSize(10);
  doc.text(`${i18next.t('results.shooter')}:`, c.leftX, y + 8);
  doc.setLineWidth(0.2);
  const labelW = doc.getTextWidth(`${i18next.t('results.shooter')}:`) + 1;
  doc.line(c.leftX + labelW, y + 8, c.rightX, y + 8);
  return y + 10;
}

function drawSignatureLines(doc: any, y: number): number {
  setRegularFont(doc); doc.setFontSize(7);
  const halfW = USABLE_W / 2 - 2;

  doc.text('RO:', MARGIN, y + 5);
  doc.setLineWidth(0.15);
  doc.line(MARGIN + 8, y + 5.5, MARGIN + halfW, y + 5.5);

  const x2 = MARGIN + halfW + 8;
  doc.text(`${i18next.t('results.shooter')}:`, x2, y + 5);
  doc.line(x2 + 14, y + 5.5, x2 + halfW - 6, y + 5.5);

  return y + SIGNATURE_H;
}

// ── Stage block drawing ────────────────────────────────────────────────

function drawStageHeader(doc: any, stage: Stage, y: number, col: Col): number {
  setBoldFont(doc); doc.setFontSize(9);
  const stageLabel = `${i18next.t('auth.stage')} ${stage.stage_number}: ${stage.name}`;
  doc.text(stageLabel, col.leftX, y + 4.5);

  setRegularFont(doc); doc.setFontSize(5.5);
  const scoringLabel = getScoringTypeLabel(stage.scoring_type);
  const targetParts: string[] = [];
  if (stage.paper_targets > 0) targetParts.push(`${stage.paper_targets}×${stage.hits_per_paper}`);
  if (stage.steel_targets > 0) targetParts.push(`${stage.steel_targets}stl`);
  if (stage.npm_targets > 0) targetParts.push(`${stage.npm_targets}npm`);
  const rightText = targetParts.length > 0 ? `${scoringLabel} ${targetParts.join(' ')}` : scoringLabel;
  if (stage.par_time) {
    doc.text(`${rightText} • Par ${stage.par_time}s`, col.rightX, y + 4.5, { align: 'right' });
  } else {
    doc.text(rightText, col.rightX, y + 4.5, { align: 'right' });
  }

  doc.setDrawColor(0); doc.setLineWidth(0.15);
  doc.line(col.leftX, y + 6, col.rightX, y + 6);

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

    // Steel/NPM row with larger writable fields
    if (hasSteel || hasNpm) {
      // Build steel/NPM content — separate rows for steel and NPM for better writability
      if (hasSteel) {
        // Build a row with dedicated columns for Hit, Miss, and optionally NS
        if (hasNoShoot) {
          // 6 columns: Tgt=Steel, A=Hit, C=Miss, D=_, M=_, NS=NS
          paperBody.push([
            { content: `${i18next.t('stages.steel')} (${stage.steel_targets})`, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: i18next.t('scoring.hits'), styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: 'Miss', styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: 'NS', styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
          ]);
        } else {
          // 5 columns: Tgt=Steel, A=Hit, C=Miss, D=_, M=_
          paperBody.push([
            { content: `${i18next.t('stages.steel')} (${stage.steel_targets})`, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: i18next.t('scoring.hits'), styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: 'Miss', styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
          ]);
        }
      }

      if (hasNpm) {
        if (hasNoShoot) {
          paperBody.push([
            { content: `NPM (${stage.npm_targets})`, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: i18next.t('scoring.hits'), styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
          ]);
        } else {
          paperBody.push([
            { content: `NPM (${stage.npm_targets})`, styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: i18next.t('scoring.hits'), styles: { fontStyle: 'bold', fontSize: 9, fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
            { content: '', styles: { fillColor: [245, 245, 245], minCellHeight: STEEL_ROW_H } },
          ]);
        }
      }
    }

    for (let i = 1; i <= stage.paper_targets; i++) {
      const row: string[] = [String(i), '', '', '', ''];
      if (hasNoShoot) row.push('');
      paperBody.push(row);
    }

    // ── Penalties row inside the table ──
    const penaltyLabels = getPenaltyLabels(stage.scoring_type);
    if (penaltyLabels.length > 0) {
      // Add penalty labels as a row spanning the full table width
      const penaltyText = `${i18next.t('scoring.penalties')}:  ` + penaltyLabels.map(l => `${l} ____`).join('    ');
      paperBody.push([{ content: penaltyText, colSpan: colCount, styles: { fontStyle: 'bold', fontSize: 9, minCellHeight: PENALTY_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);
    }

    // ── Time row inside the table ──
    // zone_per_target stages always have a time field (comstock, virginia, fixed_time, idpa, hit_factor)
    const hasTime = true;
    if (hasTime) {
      const timeLabel = stage.scoring_type === 'fixed_time' ? `${i18next.t('results.time').toUpperCase()} (Par ${stage.par_time || 0}s)` : i18next.t('results.time').toUpperCase();
      paperBody.push([{ content: `${timeLabel}: __________ s`, colSpan: colCount, styles: { fontStyle: 'bold', fontSize: 9, minCellHeight: TIME_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);
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

  const head = [['#', `${i18next.t('results.time')} (s)`, 'Miss', 'Pen']];
  const body: any[][] = [];
  for (let i = 1; i <= numStrings; i++) {
    body.push([String(i), '', '', '']);
  }
  // Total row
  body.push([{ content: 'Total:', styles: { fontStyle: 'bold' } }, '', '', '']);

  // Penalties row
  const penaltyLabels = ['Proc', 'FTN'];
  const penaltyText = `${i18next.t('scoring.penalties')}:  ` + penaltyLabels.map(l => `${l} ____`).join('    ');
  body.push([{ content: penaltyText, colSpan: 4, styles: { fontStyle: 'bold', fontSize: 8, minCellHeight: PENALTY_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);

  // Time row
  body.push([{ content: `${i18next.t('results.time').toUpperCase()}: __________ s`, colSpan: 4, styles: { fontStyle: 'bold', fontSize: 9, minCellHeight: TIME_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);

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

  return y;
}

function drawMultiGunTable(doc: any, stage: Stage, y: number, col: Col): number {
  const numTargets = stage.config?.num_targets || stage.steel_targets || 5;
  const hasNoShoot = stage.config?.has_no_shoot || stage.no_shoot_targets > 0;

  const headCols = ['Tgt', 'Neutralized'];
  if (hasNoShoot) headCols.push('NS');
  const head = [headCols];
  const body: any[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    const row: string[] = [String(i), ''];
    if (hasNoShoot) row.push('');
    body.push(row);
  }

  // Penalties row
  const penaltyLabels = ['FTN', 'Miss', 'NS', 'Proc (s)'];
  const penaltyText = `${i18next.t('scoring.penalties')}:  ` + penaltyLabels.map(l => `${l} ____`).join('    ');
  const penaltyColSpan = hasNoShoot ? 3 : 2;
  body.push([{ content: penaltyText, colSpan: penaltyColSpan, styles: { fontStyle: 'bold', fontSize: 8, minCellHeight: PENALTY_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);

  // Time row
  body.push([{ content: `${i18next.t('results.time').toUpperCase()}: __________ s`, colSpan: penaltyColSpan, styles: { fontStyle: 'bold', fontSize: 9, minCellHeight: TIME_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);

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
  const body: any[][] = [];
  for (let i = 1; i <= numTargets; i++) {
    body.push([String(i), '']);
  }

  const isPrs = stage.config?.variant === 'prs' || stage.scoring_type === 'nrl22';
  const hasTime = isPrs && stage.scoring_type !== 'nrl22';

  // Penalties row
  const penaltyLabels = getPenaltyLabels(stage.scoring_type);
  if (penaltyLabels.length > 0) {
    const penaltyText = `${i18next.t('scoring.penalties')}:  ` + penaltyLabels.map(l => `${l} ____`).join('    ');
    body.push([{ content: penaltyText, colSpan: 2, styles: { fontStyle: 'bold', fontSize: 8, minCellHeight: PENALTY_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);
  }

  // Time row
  if (hasTime) {
    body.push([{ content: `${i18next.t('results.time').toUpperCase()}: __________ s`, colSpan: 2, styles: { fontStyle: 'bold', fontSize: 9, minCellHeight: TIME_ROW_H, fillColor: [248, 248, 248], valign: 'bottom' } }]);
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
