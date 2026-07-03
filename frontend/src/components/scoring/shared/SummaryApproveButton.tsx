import { Button, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../../stores/scoringStore';

export function SummaryApproveButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const saving = useScoringStore((s) => s.saving);
  return (
    <Button color="blue" onClick={onClick} disabled={saving} className="min-h-11 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!">
      {saving && <Spinner size="sm" className="mr-2" />}
      {saving ? t('common.saving') : t('scoring.approve')}
    </Button>
  );
}
