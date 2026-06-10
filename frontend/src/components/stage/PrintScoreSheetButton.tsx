import { useState, useCallback } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useUIStore } from '../../stores/uiStore';
import { generateScoreSheetPdf, nativeSaveAs, downloadBlob } from '../../utils/scoreSheetPdf';
import type { Stage } from '../../types/stage';
import ScoreSheetCountModal from './ScoreSheetCountModal';

export default function PrintScoreSheetButton({ stages }: { stages: Stage[] }) {
  const { t } = useTranslation();
  const { matches } = useMatchStore();
  const { activeMatchId, addToast } = useUIStore();
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  const activeMatch = matches?.find((m: any) => m.id === activeMatchId);

  const handleGenerate = useCallback(async (stageIds: string[], sheetCount: number) => {
    if (!activeMatch || !activeMatchId) return;
    setGenerating(true);
    setShowModal(false);

    try {
      const matchName = activeMatch.name || 'Match';
      const matchDate = activeMatch.date
        ? new Date(activeMatch.date).toLocaleDateString(document.documentElement.lang || 'en', {
            year: 'numeric', month: 'long', day: 'numeric',
          })
        : '';
      const organization = activeMatch.organization || '';
      const selectedStages = stages.filter(s => stageIds.includes(s.id));

      // Generate one PDF with all stages per shooter page
      const doc = await generateScoreSheetPdf({
        matchName,
        matchDate,
        organization,
        stages: selectedStages,
        sheetCount,
      });

      const baseName = (matchName).replace(/[^a-zA-Z0-9]/g, '_');
      const pdfBlob = doc.output('blob');
      const defaultName = `${baseName}_score_sheets.pdf`;

      const saved = await nativeSaveAs(pdfBlob, defaultName, [
        { description: 'PDF file', accept: { 'application/pdf': ['.pdf'] } },
      ]);

      if (!saved) {
        downloadBlob(pdfBlob, defaultName);
      }
      addToast(t('stages.pdfGenerated'), 'success');
    } catch (err: any) {
      console.error('Score sheet PDF error:', err);
      addToast(err.message || 'PDF generation failed', 'error');
    } finally {
      setGenerating(false);
    }
  }, [activeMatch, activeMatchId, stages, addToast, t]);

  return (
    <>
      <Button
        size="sm"
        color="light"
        onClick={() => setShowModal(true)}
        disabled={generating || stages.length === 0}
      >
        {generating ? '⏳' : '🖨'} {t('stages.printScoreSheets')}
      </Button>
      <ScoreSheetCountModal
        show={showModal}
        stages={stages}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
      />
    </>
  );
}