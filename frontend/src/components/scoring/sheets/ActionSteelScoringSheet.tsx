import { Label } from 'flowbite-react';
import { useTranslation } from "react-i18next";
import { useScoringStore } from '../../../stores/scoringStore';
import { useScoreDataUpdater } from '../../../hooks/useScoreDataUpdater';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { calculateActionSteelPreview } from '../../../utils/scoring';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import type { Stage } from '../../../types/stage';
import type { ScoreInput } from '../../../types/scoring';
import TimeInput from "../shared/TimeInput";

interface Props {
  stage: Stage;
  score: ScoreInput;
}

export default function ActionSteelScoringSheet({ stage, score }: Props) {
  const { t } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore(s => s.registrations.find(r => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const config = stage.config || {};
  const numStrings = config.number_of_strings || 5;
  const targetsPerString = config.targets_per_string || 5;
  const dropWorst = config.drop_worst ?? 1;

  const stringTimes: number[] = sd.string_times?.length === numStrings ? sd.string_times! : new Array(numStrings).fill(0);
  const stringPlateHits: boolean[][] = sd.string_plate_hits?.length === numStrings
    ? sd.string_plate_hits!
    : new Array(numStrings).fill(null).map(() => new Array(targetsPerString).fill(false));

  const handleStringTime = (stringIdx: number, value: number | null) => {
    const times = [...stringTimes];
    times[stringIdx] = value ?? 0;
    updateScoreData({ string_times: times });
  };

  const togglePlate = (stringIdx: number, plateIdx: number) => {
    const hits = stringPlateHits.map(row => [...row]);
    hits[stringIdx][plateIdx] = !hits[stringIdx][plateIdx];
    updateScoreData({ string_plate_hits: hits });
  };

  const handleResetAll = () => {
    setScore({
      ...score,
      time: null,
      targets: [],
      procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0,
      stacking_count: 0, overtime_shot_count: 0, is_dnf: false,
      score_data: {
        string_times: new Array(numStrings).fill(0),
        string_plate_hits: new Array(numStrings).fill(null).map(() => new Array(targetsPerString).fill(false)),
      },
    });
  };

  const preview = calculateActionSteelPreview({
    string_times: stringTimes,
    string_plate_hits: stringPlateHits,
    drop_worst: dropWorst,
    miss_penalty: 3,
    stop_plate_miss_cap: 30,
  });

  return (
    <div className="p-2 sm:p-4 max-w-xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={`🎯 ${t('scoring.actionSteelTitle')}`}
          subtitle={t('scoring.actionSteelSubtitle', { strings: numStrings, plates: targetsPerString, worst: dropWorst })}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        {stringTimes.map((time, idx) => {
          const hits = stringPlateHits[idx] || [];
          const missCount = hits.filter(h => !h).length;
          const adjustedTime = time + missCount * 3;
          return (
            <div key={idx} className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{t('scoring.stringN', { number: idx + 1 })}</span>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{t('scoring.timeSeconds')}</Label>
                  <TimeInput
                    regular
                    value={time}
                    onChange={(v) => handleStringTime(idx, v)}
                    disabled={isReadOnly || stage.scoring_type === 'fixed_time'}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {hits.map((hit, pIdx) => (
                  <button
                    key={pIdx}
                    className={`w-12 h-12 rounded-lg font-bold text-sm flex items-center justify-center transition-colors cursor-pointer
                      ${hit ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 ring-2 ring-green-400 eink:bg-white! eink:text-black! eink:ring-2! eink:ring-black!' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300'}
                      ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => togglePlate(idx, pIdx)}
                    disabled={isReadOnly}
                  >
                    P{pIdx + 1}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{t('scoring.hitMissSummary', { hits: hits.filter(h => h).length, misses: missCount })}</span>
                <span>{t('scoring.adjustedTime', { time: adjustedTime.toFixed(2), penalty: missCount > 0 ? ` (+${missCount * 3}s)` : '' })}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={() => setScore({ ...score, is_dnf: !score.is_dnf })} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.actionSteelPreview')}</h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{preview.total_time?.toFixed(2) ?? '0.00'}s</div>
          <div className="text-xs text-gray-500">{t('scoring.totalTimeDropWorst', { count: dropWorst })}</div>
        </div>
      </div>
    </div>
  );
}
