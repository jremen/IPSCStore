/**
 * PDF font loading utility for jsPDF.
 * The default Helvetica font doesn't support diacritic characters (č, š, ž, ť, etc.).
 * This module loads Roboto (a Unicode-capable font) and registers it with jsPDF.
 *
 * Font data is fetched once and cached; fonts are registered per jsPDF instance
 * (addFileToVFS/addFont are per-document operations).
 */

let fontDataCache: { regular: string | null; bold: string | null } = { regular: null, bold: null };

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Process in chunks to avoid call stack limits
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Fetch font files if not cached, then register them with the jsPDF instance.
 * Must be called for every new jsPDF document — fonts are per-document.
 */
export async function loadPdfFonts(doc: any): Promise<void> {
  // Fetch font data if not already cached
  if (!fontDataCache.regular || !fontDataCache.bold) {
    const [regularRes, boldRes] = await Promise.all([
      fetch('/fonts/Roboto-Regular.ttf'),
      fetch('/fonts/Roboto-Bold.ttf'),
    ]);

    if (!regularRes.ok || !boldRes.ok) {
      throw new Error(`Failed to load PDF fonts: Regular=${regularRes.status}, Bold=${boldRes.status}`);
    }

    const [regularBuf, boldBuf] = await Promise.all([
      regularRes.arrayBuffer(),
      boldRes.arrayBuffer(),
    ]);

    fontDataCache.regular = arrayBufferToBase64(regularBuf);
    fontDataCache.bold = arrayBufferToBase64(boldBuf);
  }

  // Register fonts on this doc instance (required for every new jsPDF instance)
  doc.addFileToVFS('Roboto-Regular.ttf', fontDataCache.regular);
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFileToVFS('Roboto-Bold.ttf', fontDataCache.bold);
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}

/** Set the PDF font to Roboto Regular */
export function setRegularFont(doc: any) {
  doc.setFont('Roboto', 'normal');
}

/** Set the PDF font to Roboto Bold */
export function setBoldFont(doc: any) {
  doc.setFont('Roboto', 'bold');
}