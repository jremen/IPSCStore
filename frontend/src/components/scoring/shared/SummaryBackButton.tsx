import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../../stores/scoringStore';

export function SummaryBackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const saving = useScoringStore((s) => s.saving);
  return (
    <Button color="gray" onClick={onClick} disabled={saving} className="min-h-11">{t('common.back')}</Button>
  );
}
