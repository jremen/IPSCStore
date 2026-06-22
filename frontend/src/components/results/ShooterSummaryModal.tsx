import { useMemo } from 'react';
import { Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import type { ShooterStageSummariesResponse, ShooterSummaryTarget } from '../../types/results';
import type { Stage } from '../../types/stage';
import type { ScoreInput } from '../../types/scoring';
import type { PowerFactor } from '../../types/shooter';
import { calculatePreview, calculateIDPAPreview } from '../../utils/scoring';
import { formatTimeDisplay } from '../../utils/timeFormat';

interface ShooterSummaryViewProps {
  summary: ShooterStageSummariesResponse | null;
  loading: boolean;
  onBack: () => void;
}

function mapStage(s: ShooterStageSummariesResponse['stages'][0]['stage']): Stage {
  return {
    id: s.id,
    match_id: '',
    stage_number: s.stage_number,
    name: s.name,
    scoring_type: s.scoring_type as Stage['scoring_type'],
    paper_targets: s.paper_targets,
    steel_targets: s.steel_targets,
    no_shoot_targets: s.no_shoot_targets,
    npm_targets: s.npm_targets,
    hits_per_paper: s.hits_per_paper,
    min_rounds: s.min_rounds,
    max_points: s.max_points,
    par_time: s.par_time,
    image_path: null,
    briefing: s.briefing,
    config: s.config,
    created_at: '',
    updated_at: '',
  };
}

function mapScore(sc: ShooterStageSummariesResponse['stages'][0]['score']): ScoreInput {
  return {
    time: sc.time,
    targets: sc.targets.map((t: ShooterSummaryTarget) => ({
      target_index: t.target_index,
      target_type: (t.target_type as any) || 'paper',
      alpha: t.alpha,
      charlie: t.charlie,
      delta: t.delta,
      miss: t.miss,
      no_shoot_hits: t.no_shoot_hits,
      steel_hit: t.steel_hit,
      target_data: t.target_data,
    })),
    procedural_count: 0,
    ftsa_count: 0,
    extra_shot_count: 0,
    extra_hit_count: 0,
    stacking_count: 0,
    overtime_shot_count: 0,
    is_dnf: sc.is_dnf,
    score_data: sc.score_data,
  };
}

function StageSummaryCard({
  stageData,
  powerFactor,
}: {
  stageData: ShooterStageSummariesResponse['stages'][0];
  powerFactor: PowerFactor;
}) {
  const { t } = useTranslation();

  const stage = mapStage(stageData.stage);
  const score = mapScore(stageData.score);

  const isIPSC = ['comstock', 'virginia', 'fixed_time', 'chrono', 'hit_factor'].includes(stage.scoring_type);
  const isIDPA = stage.scoring_type === 'idpa';

  const preview = useMemo(() => {
    if (isIPSC) {
      return calculatePreview(
        score.targets.map((t) => ({ ...t, hits_per_paper: stage.hits_per_paper })),
        score.time,
        stage.scoring_type as any,
        powerFactor,
        stageData.score.procedural_count,
        stageData.score.ftsa_count,
        stageData.score.extra_shot_count,
        stageData.score.extra_hit_count,
        stageData.score.stacking_count,
        stageData.score.overtime_shot_count,
      );
    }
    if (isIDPA && score.time != null) {
      const sd = stageData.score.score_data || {};
      return calculateIDPAPreview({
        targets: score.targets.map((t) => ({ ...t, hits_per_paper: stage.hits_per_paper })),
        time: score.time,
        penalty_pe: sd.penalty_pe ?? 0,
        penalty_hnt: sd.penalty_hnt ?? 0,
        penalty_ftn: sd.penalty_ftn ?? 0,
        penalty_fp: sd.penalty_fp ?? 0,
        penalty_ftdr: sd.penalty_ftdr ?? 0,
      });
    }
    return null;
  }, [score, stage, isIPSC, isIDPA, stageData, powerFactor]);

  const steelTargets = score.targets.filter((t: ShooterSummaryTarget) => t.target_type === 'steel');
  const totalAlpha = score.targets.reduce((s: number, t: ShooterSummaryTarget) => s + t.alpha, 0) + steelTargets.filter(t => t.steel_hit === true).length;
  const totalCharlie = score.targets.reduce((s: number, t: ShooterSummaryTarget) => s + t.charlie, 0);
  const totalDelta = score.targets.reduce((s: number, t: ShooterSummaryTarget) => s + t.delta, 0);
  const totalMiss = score.targets.reduce((s: number, t: ShooterSummaryTarget) => s + t.miss, 0) + steelTargets.filter(t => t.steel_hit === false).length;
  const totalNS = score.targets.reduce((s: number, t: ShooterSummaryTarget) => s + t.no_shoot_hits, 0);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
      <h4 className="font-semibold text-sm dark:text-white mb-2">
        {t('scoring.stage', { number: stage.stage_number })}: {stage.name}
      </h4>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
        <span className="dark:text-gray-300">A</span>
        <span className="font-mono text-right dark:text-white">{totalAlpha}</span>
        <span className="dark:text-gray-300">C</span>
        <span className="font-mono text-right dark:text-white">{totalCharlie}</span>
        <span className="dark:text-gray-300">D</span>
        <span className="font-mono text-right dark:text-white">{totalDelta}</span>
        <span className="dark:text-gray-300">{t('scoring.misses')}</span>
        <span className="font-mono text-right dark:text-white">{totalMiss}</span>
        <span className="dark:text-gray-300">{t('scoring.noShootHits')}</span>
        <span className="font-mono text-right dark:text-white">{totalNS}</span>
      </div>

      <hr className="border-gray-200 dark:border-gray-700 mb-2" />

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {score.time !== null && (
          <>
            <span className="dark:text-gray-300">{t('scoring.time')}</span>
            <span className="font-mono text-right dark:text-white">{formatTimeDisplay(score.time)}</span>
          </>
        )}
        <span className="dark:text-gray-300">{t('scoring.rawPoints')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.raw_points}</span>
        {stageData.score.penalty_points > 0 && (
          <>
            <span className="dark:text-gray-300">{t('scoring.penaltyPoints')}</span>
            <span className="font-mono text-right text-red-600">−{stageData.score.penalty_points}</span>
          </>
        )}
        <span className="dark:text-gray-300 font-semibold">{t('scoring.netPoints')}</span>
        <span className="font-mono text-right font-semibold dark:text-white">{stageData.score.net_points}</span>
        {preview && 'hit_factor' in preview && (
          <>
            <span className="dark:text-gray-300">{t('scoring.hitFactor')}</span>
            <span className="font-mono text-right dark:text-white">{(preview as any).hit_factor?.toFixed(4)}</span>
          </>
        )}
        <span className="dark:text-gray-300">{t('scoring.stagePoints')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.stage_points?.toFixed(2) ?? '—'}</span>
        <span className="dark:text-gray-300">{t('scoring.stagePercent')}</span>
        <span className="font-mono text-right dark:text-white">{stageData.score.stage_percent?.toFixed(2) ?? '—'}%</span>
      </div>
    </div>
  );
}

export default function ShooterSummaryView({ summary, loading, onBack }: ShooterSummaryViewProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  const shooterName = summary ? `${summary.registration.first_name} ${summary.registration.last_name}` : '';

  const visibleStages = summary?.stages.filter(s => {
    const st = s.stage.scoring_type;
    return ['comstock', 'virginia', 'fixed_time', 'chrono', 'hit_factor', 'idpa'].includes(st);
  }) ?? [];

  return (
    <div className="scoring-nav-root">
      {/* Pinned header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button
          onClick={onBack}
          className="flex cursor-pointer items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11"
        >
          ← {t('results.backToResults')}
        </button>
        <span className="text-xl font-bold dark:text-white">{shooterName}</span>
        {summary && (
          <div className="flex gap-1 flex-wrap mt-1">
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded">{divisionLabel(summary.registration.division)}</span>
            <span className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{categoryLabel(summary.registration.category)}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${summary.registration.power_factor === 'major' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'}`}>
              {powerFactorLabel(summary.registration.power_factor)}
            </span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="scoring-scroll-area p-4">
        {loading && (
          <div className="text-center py-8 text-gray-500">{t('results.loading')}</div>
        )}
        {!loading && !summary && (
          <div className="text-center py-8 text-gray-500">{t('results.summaryNotAvailable')}</div>
        )}
        {!loading && summary && visibleStages.length === 0 && (
          <div className="text-center py-8 text-gray-500">{t('results.summaryNotAvailable')}</div>
        )}
        {!loading && summary && visibleStages.map(stageData => (
          <StageSummaryCard
            key={stageData.stage.id}
            stageData={stageData}
            powerFactor={summary.registration.power_factor as PowerFactor}
          />
        ))}
      </div>

      {/* Pinned footer */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-center scoring-nav-pinned">
        <Button color="gray" onClick={onBack} className="min-h-11 w-full sm:w-auto">{t('results.backToResults')}</Button>
      </div>
    </div>
  );
}
