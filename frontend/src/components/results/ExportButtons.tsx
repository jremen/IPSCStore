import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../services/api';
import { divisionLabel } from '../../utils/constants';
import { loadPdfFonts, setRegularFont, setBoldFont } from '../../utils/pdfFont';

export default function ExportButtons() {
  const { activeMatchId, addToast } = useUIStore();
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  const handleCSV = async () => {
    if (!activeMatchId) return;
    try {
      const csv = await api.exportCSV(activeMatchId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'match_results.csv';
      a.click();
      URL.revokeObjectURL(url);
      addToast(t('results.csvExported'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleHTML = async () => {
    if (!activeMatchId) return;
    try {
      const html = await api.exportHTML(activeMatchId);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'match_results.html';
      a.click();
      URL.revokeObjectURL(url);
      addToast(t('results.htmlExported'), 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handlePDF = async () => {
    if (!activeMatchId) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const [divisionData, matchData] = await Promise.all([
        api.getDivisionResults(activeMatchId),
        api.getMatches(),
      ]);
      const match = (matchData as any[])?.find((m: any) => m.id === activeMatchId);
      const { dq: dqShooters, ...divisionsOnly } = divisionData as any;

      const doc = new jsPDF();
      await loadPdfFonts(doc);
      setBoldFont(doc);

      const matchName = match?.name || 'Match';
      const matchDate = match?.date ? new Date(match.date).toLocaleDateString(document.documentElement.lang || 'en', {
        year: 'numeric', month: 'long', day: 'numeric',
      }) : '';
      const matchOrg = match?.organization || '';

      // Header drawn on every page
      const drawHeader = (data?: any) => {
        const pageWidth = doc.internal.pageSize.getWidth();
        const startY = data ? data.settings?.startY ?? 14 : 14;

        setBoldFont(doc);
        doc.setFontSize(18);
        doc.text(matchName, pageWidth / 2, 12, { align: 'center' });

        setRegularFont(doc);
        doc.setFontSize(10);
        const subtitle = [matchOrg, matchDate].filter(Boolean).join(' • ');
        if (subtitle) {
          doc.text(subtitle, pageWidth / 2, 18, { align: 'center' });
        }

        // Divider line
        doc.setDrawColor(200, 200, 200);
        doc.line(14, 22, pageWidth - 14, 22);

        // Adjust startY for the table
        if (data && data.settings) {
          data.settings.startY = 26;
        }
      };

      // Draw header on first page
      drawHeader();

      const divisions = Object.entries(divisionsOnly).sort(([a], [b]) => a.localeCompare(b));

      for (let i = 0; i < divisions.length; i++) {
        const [division, results] = divisions[i];

        if (i > 0) {
          doc.addPage();
          drawHeader();
        }

        setBoldFont(doc);
        doc.setFontSize(14);
        doc.text(divisionLabel(division), 14, 32);

        setRegularFont(doc);
        autoTable(doc, {
          startY: 36,
          head: [[t('results.position'), t('results.shooter'), t('results.matchPercent'), t('results.points')]],
          body: (results as any[]).map((r: any) => [
            r.position,
            `${r.first_name} ${r.last_name}`,
            `${r.match_percent.toFixed(2)}%`,
            r.match_points.toFixed(2),
          ]),
          styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 9 },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fontSize: 9 },
          didDrawPage: (data: any) => {
            // Redraw header on subsequent pages of long tables
            drawHeader(data);
          },
        });
      }

      // DQ section
      if (dqShooters && dqShooters.length > 0) {
        doc.addPage();
        drawHeader();

        setBoldFont(doc);
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38);
        doc.text(`⛔ ${t('results.disqualified')}`, 14, 32);
        doc.setTextColor(0, 0, 0);

        setRegularFont(doc);
        autoTable(doc, {
          startY: 36,
          head: [[t('results.shooter'), t('results.division'), t('results.dqReason')]],
          body: dqShooters.map((s: any) => [
            `${s.first_name} ${s.last_name}`,
            divisionLabel(s.division || ''),
            s.dq_reason || 'DQ',
          ]),
          styles: { font: 'Roboto', fontStyle: 'normal', fontSize: 9, textColor: [220, 38, 38] },
          headStyles: { font: 'Roboto', fontStyle: 'bold', fontSize: 9, textColor: [220, 38, 38] },
        });
      }

      // Add page numbers
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        setRegularFont(doc);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text(`${p} / ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
      }

      doc.save(`${matchName.replace(/[^a-zA-Z0-9]/g, '_')}_results.pdf`);
      addToast(t('results.pdfExported'), 'success');
    } catch (err: any) {
      console.error('PDF export error:', err);
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="flex gap-2 no-print">
      <Button size="xs" color="light" onClick={handlePrint}>🖨 {t('results.print')}</Button>
      <Button size="xs" color="blue" onClick={handlePDF}>{t('results.pdf')}</Button>
      <Button size="xs" color="blue" onClick={handleCSV}>{t('results.csv')}</Button>
      <Button size="xs" color="light" onClick={handleHTML}>{t('results.html')}</Button>
    </div>
  );
}