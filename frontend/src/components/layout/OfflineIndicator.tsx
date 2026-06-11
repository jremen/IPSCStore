import { Badge } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../stores/scoringStore';
import { TbWifiOff, TbClock } from 'react-icons/tb';

/**
 * Shows offline status and pending save count in the header.
 * Returns null when online with no pending saves.
 */
export default function OfflineIndicator() {
  const isOfflineMode = useScoringStore((s) => s.isOfflineMode);
  const pendingSaveCount = useScoringStore((s) => s.pendingSaveCount);
  const { t } = useTranslation();

  if (!isOfflineMode && pendingSaveCount === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {!isOfflineMode && (
        <Badge color="failure" icon={() => <TbWifiOff className="size-4"/>} className="flex items-center gap-1 text-xs">
          {t('offline.mode')}
        </Badge>
      )}
      {pendingSaveCount > 0 && (
        <Badge color="warning" icon={() => <TbClock className="size-4" />} className="flex items-center gap-1 text-xs">
          {t('offline.pending', { count: pendingSaveCount })}
        </Badge>
      )}
    </div>
  );
}
