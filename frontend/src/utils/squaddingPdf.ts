/**
 * Squadding PDF generator.
 * Generates a compact A4 PDF with squad boxes in a 2-column grid layout.
 * Each squad is an independent table showing numbered shooter names only.
 *
 * Reuses: loadPdfFonts, setBoldFont, setRegularFont from pdfFont.ts
 */

import { loadPdfFonts, setBoldFont, setRegularFont } from './pdfFont';
import type { RegistrationWithShooter } from '../types/scoring';

export interface SquaddingPdfInput {
  matchName: string;
  matchDate: string;
  columns: Record<number, RegistrationWithShooter[]>;
  orderedSquadNumbers: number[];
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 8;
const USABLE_W = PAGE_W - 2 * MARGIN;
const HEADER_H = 12;
const SQUAD_GAP_X = 4;
const SQUAD_GAP_Y = 4;
const COL_W = (USABLE_W - SQUAD_GAP_X) / 2;
const SQUAD_HEADER_H = 7;
const ROW_H = 5;

const TABLE_STYLE = {
  theme: 'plain' as const,
  styles: { font: 'OpenSans', fontStyle: 'normal', fontSize: 10, textColor: 0, lineColor: 0, lineWidth: 0.3 },
  headStyles: { font: 'OpenSans', fontStyle: 'bold', fontSize: 12, fillColor: [0, 0, 0], textColor: [255, 255, 255], lineColor: 0, lineWidth: 0.3 },
  alternateRowStyles: { fillColor: [245, 245, 245] },
};

export async function generateSquaddingPdf(input: SquaddingPdfInput): Promise<any> {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadPdfFonts(doc);

  drawSquadding(doc, input);

  return doc;
}

function drawSquadding(doc: any, input: SquaddingPdfInput): void {
  const { matchName, matchDate, columns, orderedSquadNumbers } = input;

  let currentY = MARGIN;

  const drawHeader = () => {
    setBoldFont(doc);
    doc.setFontSize(16);
    doc.text(matchName, PAGE_W / 2, currentY + 5, { align: 'center' });
    setRegularFont(doc);
    doc.setFontSize(14);
    const subtitle = [matchDate].filter(Boolean).join(' • ');
    if (subtitle) doc.text(subtitle, PAGE_W / 2, currentY + 10, { align: 'center' });
    doc.setDrawColor(0);
    doc.line(MARGIN, currentY + 12, PAGE_W - MARGIN, currentY + 12);
    currentY += HEADER_H;
  };

  drawHeader();

  const contentTop = currentY;
  const contentBottom = PAGE_H - MARGIN;
  let leftY = contentTop;
  let rightY = contentTop;
  let side: 'left' | 'right' = 'left';

  for (const squadNum of orderedSquadNumbers) {
    const shooters = columns[squadNum] || [];
    if (shooters.length === 0) continue;

    const rows = shooters.map((r, i) => [
      `${i + 1}.`,
      `${r.first_name} ${r.last_name}`,
    ]);

    const headerHeight = SQUAD_HEADER_H;
    const bodyHeight = rows.length * ROW_H;
    const blockHeight = headerHeight + bodyHeight + 2;

    const colX = side === 'left' ? MARGIN : MARGIN + COL_W + SQUAD_GAP_X;
    const startY = side === 'left' ? leftY : rightY;

    if (startY + blockHeight > contentBottom) {
      doc.addPage();
      currentY = MARGIN;
      drawHeader();
      leftY = contentTop;
      rightY = contentTop;
      side = 'left';
    }

    const finalY = side === 'left' ? leftY : rightY;

    setBoldFont(doc);
    const tableStartY = finalY + SQUAD_HEADER_H;

    setRegularFont(doc);
    (doc as any).autoTable({
      ...TABLE_STYLE,
      startY: tableStartY,
      margin: { left: colX, right: PAGE_W - colX - COL_W },
      head: [['', `Squad ${squadNum}`]],
      body: rows,
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: COL_W - 12 },
      },
    });

    const tableEndY = (doc as any).lastAutoTable.finalY + SQUAD_GAP_Y;

    if (side === 'left') {
      leftY = tableEndY;
      side = 'right';
    } else {
      rightY = tableEndY;
      side = 'left';
    }
  }
}
