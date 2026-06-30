import { useScoringStore } from '../../../stores/scoringStore';
import { useScoreDataUpdater } from '../../../hooks/useScoreDataUpdater';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { calculateRingPreview } from '../../../utils/scoring';
import { ringValueLabel } from '../../../utils/constants';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import { useTranslation } from "react-i18next";
import type { Stage } from '../../../types/stage';
import type { ScoreInput } from '../../../types/scoring';

interface Props {
  stage: Stage;
  score: ScoreInput;
}

export default function RingScoringSheet({ stage, score }: Props) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore(s => s.registrations.find(r => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const scoringType = stage.scoring_type;

  let ringValues: number[];
  let shotsCount: number;
  let label: string;

  if (scoringType === 'archery') {
    ringValues = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    shotsCount = (config.arrows_per_end as number) || 6;
    label = t('scoring.archery');
  } else if (scoringType === 'issf') {
    ringValues = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    shotsCount = (config.shots_per_course as number) || 60;
    label = 'Shot';
  } else if (scoringType === 'long_range' && config.variant === 'f_class') {
    ringValues = [11, 10, 9, 8, 7, 6, 5];
    shotsCount = (config.shots_per_string as number) || 20;
    label = 'Shot';
  } else {
    ringValues = [11, 10, 9, 8, 7, 6, 5];
    shotsCount = (config.shots_per_string as number) || 10;
    label = 'Shot';
  }

  const currentRings: number[] = sd.ring_values?.length === shotsCount ? sd.ring_values! : new Array(shotsCount).fill(0);

  const cycleRingValue = (idx: number) => {
    const rings = [...currentRings];
    const current = rings[idx];
    if (current === 0) {
      rings[idx] = ringValues[0];
    } else {
      const currentIdx = ringValues.indexOf(current);
      if (currentIdx >= ringValues.length - 1) {
        rings[idx] = 0;
      } else {
        rings[idx] = ringValues[currentIdx + 1];
      }
    }
    updateScoreData({ ring_values: rings });
  };

  const longPressRing = (idx: number) => {
    const rings = [...currentRings];
    rings[idx] = 0;
    updateScoreData({ ring_values: rings });
  };

  const handleResetAll = () => {
    setScore({
      ...score,
      targets: [],
      time: null,
      procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0,
      stacking_count: 0, overtime_shot_count: 0, is_dnf: false,
      score_data: { ring_values: new Array(shotsCount).fill(0) },
    });
  };

  const preview = calculateRingPreview(currentRings);
  const totalShots = currentRings.filter(v => v > 0).length;

  const typeLabelKey = scoringType === 'archery' ? 'scoring.archery' : scoringType === 'bullseye' ? 'scoring.bullseye' : scoringType === 'issf' ? 'scoring.issf' : 'scoring.fclass';
  const typeLabel = t(typeLabelKey);
  const typeIcon = scoringType === 'archery' ? '🏹' : scoringType === 'bullseye' || scoringType === 'issf' ? '🎯' : '🔭';

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`${typeIcon} ${typeLabel}`}
          subtitle={`${shotsCount} ${label.toLowerCase()}s • ${t('scoring.tapToCycle')}`}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
              {t('scoring.ringShotsEntered', { label, entered: totalShots, total: shotsCount })}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {currentRings.map((val, idx) => (
              <button
                key={idx}
                className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center font-bold transition-colors cursor-pointer
                  ${val === 0 ? 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 ring-1 ring-gray-200 dark:ring-gray-600' :
                    val === 11 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 ring-2 ring-yellow-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    val >= 9 ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    val >= 7 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!' :
                    'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-400 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!'}
                  ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => cycleRingValue(idx)}
                onContextMenu={(e) => { e.preventDefault(); longPressRing(idx); }}
                disabled={isReadOnly}
              >
                <span className="text-lg">{val === 0 ? '—' : ringValueLabel(val)}</span>
                <span className="text-2.5 text-gray-400">#{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={() => setScore({ ...score, is_dnf: !score.is_dnf })} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.scorePreview')}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-2xl font-bold dark:text-white">{preview.raw_points}</div><div className="text-xs text-gray-500">{t('scoring.totalScore')}</div></div>
          {preview.x_count !== undefined && preview.x_count > 0 && (
            <div><div className="text-2xl font-bold text-yellow-600">{preview.x_count}</div><div className="text-xs text-gray-500">{t('scoring.xCount')}</div></div>
          )}
          <div><div className="text-2xl font-bold text-green-600">{totalShots}/{shotsCount}</div><div className="text-xs text-gray-500">{t('scoring.shotsEntered', { label })}</div></div>
        </div>
      </div>
    </div>
  );
}
