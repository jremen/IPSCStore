import { useMemo, useCallback } from 'react';
import { Alert, Badge, Label } from 'flowbite-react';
import TimeInput from '../shared/TimeInput';
import { useScoringStore } from '../../../stores/scoringStore';
import { useScoreDataUpdater } from '../../../hooks/useScoreDataUpdater';
import { useScoringReadOnly } from '../../../hooks/useScoringReadOnly';
import { calculateIDPAPreview } from '../../../utils/scoring';
import { HitCell, ScoringSheetHeader, DnfToggle, DqSection, PenaltyStepper } from '../shared';
import type { Stage } from '../../../types/stage';
import type { ScoreInput, TargetScore } from '../../../types/scoring';
import { useTranslation } from "react-i18next";

interface Props {
  stage: Stage;
  score: ScoreInput;
}

export default function IDPAScoringSheet({ stage, score }: Props) {
  const { t, i18n } = useTranslation();
  const setScore = useScoringStore((s) => s.setScore);
  const alerts = useScoringStore((s) => s.alerts);
  const { sd, updateScoreData } = useScoreDataUpdater(score);
  const shooter = useScoringStore(s => s.registrations.find(r => r.id === s.currentRegistrationId));
  const isReadOnly = useScoringReadOnly();

  const hpp = stage.hits_per_paper;
  const penalty_pe = sd.penalty_pe || 0;
  const penalty_hnt = sd.penalty_hnt || 0;
  const penalty_ftn = sd.penalty_ftn || 0;
  const penalty_fp = sd.penalty_fp || 0;
  const penalty_ftdr = sd.penalty_ftdr || 0;

  const paperTargets = useMemo(
    () => score.targets.filter(t => t.target_type === 'paper').sort((a, b) => a.target_index - b.target_index),
    [score.targets]
  );
  const steelTargets = useMemo(() => score.targets.filter(t => t.target_type === 'steel'), [score.targets]);
  const steelMisses = useMemo(() => steelTargets.filter(t => !t.steel_hit).length, [steelTargets]);

  const isTargetFinished = useCallback((target: TargetScore) => {
    const totalHits = target.alpha + target.charlie + target.delta + target.miss;
    return totalHits >= hpp;
  }, [hpp]);

  const handlePaperHitClick = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta') => {
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      const total = t.alpha + t.charlie + t.delta + t.miss;
      if (total < hpp) return { ...t, [field]: t[field] + 1 };
      const stealOrder: Array<'alpha' | 'charlie' | 'delta' | 'miss'> = ['alpha', 'charlie', 'delta', 'miss'];
      for (const stealFrom of stealOrder) {
        if (stealFrom !== field && t[stealFrom] > 0) {
          return { ...t, [stealFrom]: t[stealFrom] - 1, [field]: t[field] + 1 };
        }
      }
      return t;
    });
    setScore({ ...score, targets: newTargets });
  }, [score, hpp, setScore]);

  const handlePaperMissClick = useCallback((targetIndex: number) => {
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      const total = t.alpha + t.charlie + t.delta + t.miss;
      if (total >= hpp) {
        const stealOrder: Array<'alpha' | 'charlie' | 'delta'> = ['alpha', 'charlie', 'delta'];
        for (const stealFrom of stealOrder) {
          if (t[stealFrom] > 0) return { ...t, [stealFrom]: t[stealFrom] - 1, miss: t.miss + 1 };
        }
        return t;
      }
      return { ...t, miss: t.miss + 1 };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, hpp, setScore]);

  const handlePaperDecrement = useCallback((targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss') => {
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, [field]: Math.max(0, t[field] - 1) };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handlePaperNSClick = useCallback((targetIndex: number, delta: number) => {
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, no_shoot_hits: Math.max(0, t.no_shoot_hits + delta) };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handleResetTarget = useCallback((targetIndex: number) => {
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'paper' || t.target_index !== targetIndex) return t;
      return { ...t, alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0 };
    });
    setScore({ ...score, targets: newTargets });
  }, [score, setScore]);

  const handleSteelMissChange = useCallback((newMisses: number) => {
    const clamped = Math.max(0, Math.min(newMisses, steelTargets.length));
    const hits = steelTargets.length - clamped;
    const newTargets = score.targets.map(t => {
      if (t.target_type !== 'steel') return t;
      const idx = t.target_index - stage.paper_targets - 1;
      return { ...t, steel_hit: idx < hits };
    });
    setScore({ ...score, targets: newTargets });
  }, [steelTargets.length, score, stage.paper_targets, setScore]);

  const handleTimeChange = useCallback((value: number | null) => {
    const currentScore = useScoringStore.getState().currentScore;
    if (currentScore) {
      setScore({ ...currentScore, time: value });
    }
  }, [setScore]);

  const handleResetAll = () => {
    const resetTargets = score.targets.map(t => ({
      ...t, alpha: 0, charlie: 0, delta: 0, miss: 0, no_shoot_hits: 0,
      steel_hit: t.target_type === 'steel' ? true : t.steel_hit,
    }));
    setScore({
      ...score, time: null, targets: resetTargets,
      procedural_count: 0, ftsa_count: 0, extra_shot_count: 0, extra_hit_count: 0,
      stacking_count: 0, overtime_shot_count: 0, is_dnf: false,
      score_data: { penalty_pe: 0, penalty_hnt: 0, penalty_ftn: 0, penalty_fp: 0, penalty_ftdr: 0 },
    });
  };

  const preview = calculateIDPAPreview({
    targets: score.targets.map(t => ({
      ...t, hits_per_paper: stage.hits_per_paper,
    })),
    time: score.time || 0,
    penalty_pe, penalty_hnt, penalty_ftn, penalty_fp, penalty_ftdr,
  });

  const penalties = [
    { key: 'penalty_pe' as const, label: t('scoring.peProcedural'), sec: 3 },
    { key: 'penalty_hnt' as const, label: t('scoring.hntHitNs'), sec: 5 },
    { key: 'penalty_ftn' as const, label: t('scoring.ftnFailNeutralize'), sec: 5 },
    { key: 'penalty_fp' as const, label: t('scoring.fpFlagrant'), sec: 10 },
  ];

  return (
    <div className="p-2 sm:p-4 max-w-2xl mx-auto">
      {/* TIME INPUT */}
      <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-3 mb-3 border-2 border-blue-200 dark:border-blue-800">
        <Label className="text-sm font-bold mb-1 block">{t('scoring.time')}</Label>
        <TimeInput value={score.time} onChange={handleTimeChange} disabled={isReadOnly} className="text-2xl font-mono py-4!" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-3 shadow-sm">
        <ScoringSheetHeader
          title={t('scoring.idpaTitle')}
          subtitle={t('scoring.idpaSubtitle', { paper: stage.paper_targets, hpp, steel: stage.steel_targets })}
          onReset={isReadOnly ? undefined : handleResetAll}
        />
        <p className="text-2.5 text-gray-400 px-3 -mt-1 mb-1">{t('scoring.tapCellInstruction')}</p>

        {/* PAPER TARGETS — IDPA labels: -0, -1, -3 */}
        {paperTargets.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">{t('scoring.paperTargets')}</span>
              <Badge size="sm" color="blue">{paperTargets.length}</Badge>
            </div>
            <div className="overflow-x-auto -mx-1 sm:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-center">
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-gray-500 w-8">#</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-green-600">-0</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-yellow-600">-1</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-orange-600">-3</th>
                    <th className="px-1 sm:px-2 py-1 text-xs font-bold text-red-600">M</th>
                    <th className={`px-1 sm:px-2 py-1 text-xs font-bold text-red-500 ${stage.no_shoot_targets === 0 ? 'opacity-40' : ''}`}>NS</th>
                  </tr>
                </thead>
                <tbody>
                  {paperTargets.map((target, idx) => {
                    const finished = isTargetFinished(target);
                    return (
                      <tr key={target.target_index} className={`text-center border-t border-gray-100 dark:border-gray-700 transition-colors ${finished ? 'bg-green-50 dark:bg-green-900/60' : ''}`}>
                        <td className="py-1.5">
                          <button className={`font-mono text-sm font-bold ${isReadOnly ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-red-500 cursor-pointer'}`} onClick={isReadOnly ? undefined : () => handleResetTarget(target.target_index)} disabled={isReadOnly}>{idx + 1}</button>
                        </td>
                        <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.alpha} color="green" onIncrement={() => handlePaperHitClick(target.target_index, 'alpha')} onDecrement={() => handlePaperDecrement(target.target_index, 'alpha')} disabled={isReadOnly} /></div></td>
                        <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.charlie} color="yellow" onIncrement={() => handlePaperHitClick(target.target_index, 'charlie')} onDecrement={() => handlePaperDecrement(target.target_index, 'charlie')} disabled={isReadOnly} /></div></td>
                        <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.delta} color="orange" onIncrement={() => handlePaperHitClick(target.target_index, 'delta')} onDecrement={() => handlePaperDecrement(target.target_index, 'delta')} disabled={isReadOnly} /></div></td>
                        <td className="py-1.5"><div className="flex justify-center"><HitCell value={target.miss} color="red" onIncrement={() => handlePaperMissClick(target.target_index)} onDecrement={() => handlePaperDecrement(target.target_index, 'miss')} disabled={isReadOnly} /></div></td>
                        <td className="py-1.5"><div className="flex justify-center">
                          {stage.no_shoot_targets > 0 ? (
                            <HitCell value={target.no_shoot_hits} color="red" onIncrement={() => handlePaperNSClick(target.target_index, 1)} onDecrement={() => handlePaperNSClick(target.target_index, -1)} disabled={isReadOnly} />
                          ) : (
                            <button className="w-11 h-11 rounded-lg flex items-center justify-center font-mono text-xl font-bold bg-gray-50 dark:bg-gray-700/50 text-gray-300 dark:text-gray-500 ring-1 ring-gray-200 dark:ring-gray-600 cursor-not-allowed" disabled>0</button>
                          )}
                        </div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              {i18n.t('scoring.finished', { hpp, finished: paperTargets.filter(isTargetFinished).length, total: paperTargets.length })}
            </p>
          </div>
        )}

        {/* STEEL TARGETS */}
        {steelTargets.length > 0 && (
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{t('scoring.steelTargets')}</span>
              <Badge size="sm" color="gray">{steelTargets.length}</Badge>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-xs text-gray-400 block">{t('scoring.misses')}</span>
                <div className="flex items-center gap-0.5 mt-1">
                  <button className={`penalty-stepper rounded text-lg font-bold bg-gray-200 dark:bg-gray-600 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-300'}`} onClick={isReadOnly ? undefined : () => handleSteelMissChange(steelMisses - 1)} disabled={isReadOnly}>−</button>
                  <span className="w-8 text-center text-xl font-mono font-bold text-red-600 dark:text-red-400">{steelMisses}</span>
                  <button className={`penalty-stepper rounded text-lg font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : 'active:bg-red-200'}`} onClick={isReadOnly ? undefined : () => handleSteelMissChange(steelMisses + 1)} disabled={isReadOnly}>+</button>
                </div>
              </div>
              <div className="text-center">
                <span className="text-xs text-gray-400 block">{t('scoring.hits')}</span>
                <span className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">{steelTargets.length - steelMisses}</span>
                <span className="text-lg font-mono text-gray-400"> / {steelTargets.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* IDPA PENALTIES */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">{t('scoring.idpaPenalties')}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {penalties.map(({ key, label, sec }) => (
              <div key={key}>
                <Label className="text-xs">{label} <span className="text-gray-400">{t('scoring.secondsEach', { sec })}</span></Label>
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
            <div className="col-span-2">
              <Label className="text-xs">{t('scoring.ftdrFailToDoRight')} <span className="text-gray-400">{t('scoring.secondsEach', { sec: 20 })}</span></Label>
              <PenaltyStepper
                value={penalty_ftdr}
                onDecrement={() => updateScoreData({ penalty_ftdr: Math.max(0, penalty_ftdr - 1) })}
                onIncrement={() => updateScoreData({ penalty_ftdr: penalty_ftdr + 1 })}
                color="red"
                size="sm"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-3">
          {alerts.map((alert, i) => (
            <Alert key={i} color={alert.type === 'error' ? 'failure' : 'warning'}>{alert.message}</Alert>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <DnfToggle isDnf={score.is_dnf} onToggle={() => setScore({ ...score, is_dnf: !score.is_dnf })} disabled={isReadOnly} />
        <DqSection shooter={shooter} disabled={isReadOnly} />
      </div>

      {/* IDPA Score Preview */}
      <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800 shadow-sm">
        <h3 className="text-sm font-bold text-green-700 dark:text-green-400 mb-2">📊 {t('scoring.scorePreview')}</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-lg font-bold dark:text-white">{preview.raw_points}</div><div className="text-xs text-gray-500">{t('scoring.raw')}</div></div>
          <div><div className="text-lg font-bold text-red-600">−{preview.penalty_points}</div><div className="text-xs text-gray-500">{t('scoring.pen')}</div></div>
          <div><div className="text-lg font-bold text-blue-600">{preview.total_time?.toFixed(2) ?? '0.00'}</div><div className="text-xs text-gray-500">{t('scoring.totalTime')}</div></div>
        </div>
      </div>
    </div>
  );
}
