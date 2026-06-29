import { loadPdfFonts, setBoldFont, setRegularFont } from './pdfFont';

export interface QrPdfInput {
  resultsUrl: string;
  scoringUrl: string;
  resultsQr: string;
  scoringQr: string;
  resultsLabel: string;
  scoringLabel: string;
}

const PAGE_W = 210;
const MARGIN = 20;

/**
 * Generate an A4 PDF containing the results and scoring QR codes
 * with labels and URLs printed underneath.
 */
export async function generateQrPdf(input: QrPdfInput): Promise<any> {
  const { default: jsPDF } = await import('jspdf');
  const { resultsUrl, scoringUrl, resultsQr, scoringQr, resultsLabel, scoringLabel } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadPdfFonts(doc);

  // Title
  setBoldFont(doc);
  doc.setFontSize(22);
  doc.text('IPSC Score', PAGE_W / 2, MARGIN, { align: 'center' });

  setRegularFont(doc);
  doc.setFontSize(12);
  doc.text('Scan a QR code to connect', PAGE_W / 2, MARGIN + 10, { align: 'center' });

  // QR code size and positions
  const qrSize = 80;
  const gap = 10;
  const leftX = (PAGE_W - (qrSize * 2 + gap)) / 2;
  const rightX = leftX + qrSize + gap;
  const qrY = MARGIN + 25;

  // QR images
  doc.addImage(resultsQr, 'PNG', leftX, qrY, qrSize, qrSize);
  doc.addImage(scoringQr, 'PNG', rightX, qrY, qrSize, qrSize);

  // Labels
  setBoldFont(doc);
  doc.setFontSize(16);
  doc.text(resultsLabel, leftX + qrSize / 2, qrY + qrSize + 10, { align: 'center' });
  doc.text(scoringLabel, rightX + qrSize / 2, qrY + qrSize + 10, { align: 'center' });

  // URLs
  setRegularFont(doc);
  doc.setFontSize(9);
  doc.text(resultsUrl, leftX + qrSize / 2, qrY + qrSize + 18, { align: 'center' });
  doc.text(scoringUrl, rightX + qrSize / 2, qrY + qrSize + 18, { align: 'center' });

  return doc;
}

export interface SingleQrPdfInput {
  url: string;
  qr: string;
  label: string;
}

/**
 * Generate an A4 PDF containing a single large QR code with its label and URL.
 * The QR code is sized to nearly fill the page width, with the label printed below it.
 */
export async function generateSingleQrPdf(input: SingleQrPdfInput): Promise<any> {
  const { default: jsPDF } = await import('jspdf');
  const { url, qr, label } = input;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await loadPdfFonts(doc);

  // QR code: leave small side margins so it almost fills A4 width
  const qrSize = 180;
  const qrX = (PAGE_W - qrSize) / 2;
  const qrY = MARGIN;

  doc.addImage(qr, 'PNG', qrX, qrY, qrSize, qrSize);

  // Label below the QR code
  setBoldFont(doc);
  doc.setFontSize(32);
  doc.text(label, PAGE_W / 2, qrY + qrSize + 16, { align: 'center' });

  // URL below the label
  setRegularFont(doc);
  doc.setFontSize(10);
  doc.text(url, PAGE_W / 2, qrY + qrSize + 26, { align: 'center' });

  return doc;
}
