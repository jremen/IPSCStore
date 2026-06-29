import { Label } from 'flowbite-react';
import { InputField } from '../../shared/InputField';
import { useScoringStore } from '../../../stores/scoringStore';
import { useScoreDataUpdater } from '../../../hooks/useScoreDataUpdater';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { calculateMultiGunPreview } from '../../../utils/scoring';
import { ScoringSheetHeader, DnfToggle, DqSection } from '../shared';
import PenaltyStepper from '../shared/PenaltyStepper';
import type { ScoreInput } from '../../../types/scoring';

interface Props {
  score: ScoreInput;
}

export default function MultiGunScoringSheet({ score }: Props) {
  const { setScore } = useScoringStore();
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore(s => s.registrations.find(r => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const penalty_ftn_sec = sd.penalty_ftn_sec || 0;
  const penalty_miss_sec = sd.penalty_miss_sec || 0;
  const penalty_no_shoot_sec = sd.penalty_no_shoot_sec || 0;
  const penalty_procedural_sec = sd.penalty_procedural_sec || 0;

  const toggleNeutralized = (targetIdx: number) => {
    const newTargets = score.targets.map((t, i) => {
      if (t.target_type !== 'paper' || i !== targetIdx) return t;
      const currentNeutralized = t.target_data?.neutralized ?? false;
      return { ...t, steel_hit: null, target_data: { ...t.target_data, neutralized: !currentNeutralized } };
    });
    setScore({ ...score, targets: newTargets });
  };

  const handleTimeChange = (value: string) => {
    setScore({ ...score, time: value ? parseFloat(value) : null });
  };

  const handleResetAll = () => {
    const resetTargets = score.targets.map(t => ({
      ...t,
      target_data: { ...t.target_data, neutralized: false },
    }));
    setScore({
      ...score, time: null, targets: resetTargets,
      procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0,
      stacking_count: 0, overtime_shot_count: 0, is_dnf: false,
      score_data: { penalty_ftn_sec: 0, penalty_miss_sec: 0, penalty_no_shoot_sec: 0, penalty_procedural_sec: 0 },
    });
  };

  const preview = calculateMultiGunPreview({
    time: score.time || 0,
    penalty_ftn_sec,
    penalty_miss_sec,
    penalty_no_shoot_sec,
    penalty_procedural_sec,
  });

  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto">
      {/* TIME INPUT */}
      <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-3 mb-3 border-2 border-blue-200 dark:border-blue-800">
        <Label className="text-sm font-bold mb-1 block">⏱ TIME (seconds)</Label>
        <InputField type="number" step="0.01" min="0" sizing="lg" decimal value={score.time ?? ''} onChange={handleTimeChange} className="text-center text-2xl font-mono" disabled={isReadOnly} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title="🎯 Multi-Gun Scoring"
          subtitle={`${score.targets.length} targets`}
          onReset={isReadOnly ? undefined : handleResetAll}
        />

        {score.targets.filter(t => t.target_type === 'paper').length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">🎯 Targets</span>
              <span className="text-xs text-gray-400">Tap to toggle Neutralized / Miss</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {score.targets.filter(t => t.target_type === 'paper').map((target, idx) => {
                const neutralized = target.target_data?.neutralized ?? false;
                return (
                  <button
                    key={target.target_index}
                    className={`w-16 h-16 rounded-lg font-bold text-sm flex flex-col items-center justify-center transition-colors cursor-pointer
                      ${neutralized ? 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 ring-2 ring-green-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 ring-1 ring-red-300'}
                      ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => toggleNeutralized(idx)}
                    disabled={isReadOnly}
                  >
                    <span className="text-lg">{neutralized ? '✓' : '✗'}</span>
                    <span className="text-[10px]">T{idx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Penalty seconds */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">⚠️ Penalties (seconds added)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'penalty_ftn_sec' as const, label: 'FTN', sec: 5 },
              { key: 'penalty_miss_sec' as const, label: 'Miss', sec: 10 },
              { key: 'penalty_no_shoot_sec' as const, label: 'No-Shoot', sec: 5 },
              { key: 'penalty_procedural_sec' as const, label: 'Procedural', sec: 5 },
            ].map(({ key, label, sec }) => (
              <div key={key}>
                <Label className="text-xs">{label} <span className="text-gray-400">+{sec}s each</span></Label>
                <PenaltyStepper
                  value={(sd[key] as number) || 0}
                  onDecrement={() => updateScoreData({ [key]: Math.max(0, ((sd[key] as number) || 0) - 1) })}
                  onIncrement={() => updateScoreData({ [key]: ((sd[key] as number) || 0) + 1 })}
                  color="orange"
                  size="sm"
                  disabled={isReadOnly}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={() => setScore({ ...score, is_dnf: !score.is_dnf })} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      {/* Preview */}
      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 Multi-Gun Preview</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-lg font-bold dark:text-white">{(score.time || 0).toFixed(2)}s</div><div className="text-xs text-gray-500">Raw Time</div></div>
          <div><div className="text-lg font-bold text-red-600">+{preview.penalty_points.toFixed(1)}s</div><div className="text-xs text-gray-500">Penalties</div></div>
          <div><div className="text-lg font-bold text-blue-600">{preview.total_time?.toFixed(2) ?? '0.00'}s</div><div className="text-xs text-gray-500">Total Time</div></div>
        </div>
      </div>
    </div>
  );
}