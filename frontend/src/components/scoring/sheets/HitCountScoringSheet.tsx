import { Badge } from 'flowbite-react';
import { useTranslation } from "react-i18next";
import { useScoringStore } from '../../../stores/scoringStore';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { calculateHitCountPreview } from '../../../utils/scoring';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import type { Stage } from '../../../types/stage';
import type { ScoreInput } from '../../../types/scoring';

interface Props {
  stage: Stage;
  score: ScoreInput;
}

export default function HitCountScoringSheet({ stage, score }: Props) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const shooter = useScoringStore(s => s.registrations.find(r => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const pointValue = config.point_value || 10;

  const toggleTargetHit = (targetIdx: number) => {
    const newTargets = score.targets.map((t, i) => {
      if (i !== targetIdx) return t;
      const currentHit = t.target_data?.hit ?? false;
      return { ...t, target_data: { ...t.target_data, hit: !currentHit } };
    });
    setScore({ ...score, targets: newTargets });
  };

  const handleResetAll = () => {
    const resetTargets = score.targets.map(t => ({
      ...t,
      target_data: { ...t.target_data, hit: false },
    }));
    setScore({
      ...score, targets: resetTargets,
      time: null, procedural_count: 0, ftsa_count: 0, extra_shot_count: 0,
      extra_hit_count: 0, stacking_count: 0, overtime_shot_count: 0, is_dnf: false,
    });
  };

  const hits = score.targets.filter(t => t.target_data?.hit === true).length;
  const totalTargets = score.targets.length;
  const preview = calculateHitCountPreview(hits, pointValue);
  const typeLabelKey = stage.scoring_type === 'nrl22' ? 'scoring.nrl22Scoring' : 'scoring.longRangeScoring';
  const typeLabel = t(typeLabelKey);

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`🎯 ${typeLabel}`}
          subtitle={`${totalTargets} ${t('scoring.targets')} • ${t('scoring.ptsPerHit', { value: pointValue })} • ${t('scoring.tapToToggleHitMiss')}`}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{t('scoring.targets')}</span>
            <Badge size="sm" color="blue">{t('scoring.hitsOutOf', { hits, total: totalTargets })}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {score.targets.map((target, idx) => {
              const isHit = target.target_data?.hit === true;
              return (
                <button
                  key={target.target_index}
                  className={`w-16 h-16 rounded-lg font-bold text-sm flex flex-col items-center justify-center transition-colors cursor-pointer
                    ${isHit ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 ring-2 ring-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300'}
                    ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => toggleTargetHit(idx)}
                  disabled={isReadOnly}
                >
                  <span className="text-lg">{isHit ? '✓' : '✗'}</span>
                  <span className="text-[10px]">T{idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={() => setScore({ ...score, is_dnf: !score.is_dnf })} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {typeLabel}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-2xl font-bold dark:text-white">{hits}</div><div className="text-xs text-gray-500">{t('scoring.hits')}</div></div>
          <div><div className="text-2xl font-bold dark:text-white">×{pointValue}</div><div className="text-xs text-gray-500">{t('scoring.pointsEach')}</div></div>
          <div><div className="text-2xl font-bold text-green-600">{preview.raw_points}</div><div className="text-xs text-gray-500">{t('scoring.totalScore')}</div></div>
        </div>
      </div>
    </div>
  );
}
