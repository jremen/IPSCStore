import { useMemo, Fragment } from 'react';
import { Button, Badge, Spinner } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../stores/scoringStore';
import type { Stage } from '../../types/stage';
import type { ScoreInput } from '../../types/scoring';
import { divisionLabel } from '../../utils/constants';
import { useConstLabels } from '../../hooks/useConstLabels';
import {
  calculatePreview,
  calculateIDPAPreview,
  calculateActionSteelPreview,
  calculateMultiGunPreview,
  calculateRingPreview,
  calculateHitCountPreview,
} from '../../utils/scoring';
import { formatTimeDisplay } from '../../utils/timeFormat';

interface ScoreSummarySheetProps {
  stage: Stage;
  score: ScoreInput;
  shooterName: string;
  shooterDetails: {
    division: string;
    category: string;
    powerFactor: string;
  };
  onBack: () => void;
  onApprove: () => void;
}

function SavingApproveButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const saving = useScoringStore((s) => s.saving);
  return (
    <Button color="blue" onClick={onClick} disabled={saving} className="min-h-11 eink:bg-black! eink:text-white! eink:ring-2! eink:ring-black!">
      {saving && <Spinner size="sm" className="mr-2" />}
      {saving ? t('common.saving') : t('scoring.approve')}
    </Button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  const saving = useScoringStore((s) => s.saving);
  return (
    <Button color="gray" onClick={onClick} disabled={saving} className="min-h-11">{t('common.back')}</Button>
  );
}

/** IPSC/Comstock/Virginia/FixedTime/Hit Factor summary */
function IPSCSummary({ stage, score, shooterName, shooterDetails, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel, powerFactorLabel } = useConstLabels();

  const paperTargets = score.targets.filter(t => t.target_type === 'paper');
  const steelTargets = score.targets.filter(t => t.target_type === 'steel');
  const npmTargets = score.targets.filter(t => t.target_type === 'npm');

  const totalAlpha = paperTargets.reduce((s, t) => s + t.alpha, 0) + steelTargets.filter(t => t.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((s, t) => s + t.charlie, 0);
  const totalDelta = paperTargets.reduce((s, t) => s + t.delta, 0);
  const totalMiss = paperTargets.reduce((s, t) => s + t.miss, 0) + steelTargets.filter(t => t.steel_hit === false).length;
  const totalNS = score.targets.reduce((s, t) => s + t.no_shoot_hits, 0);
  const totalNPM = npmTargets.filter(t => t.steel_hit === true).length;


  const preview = useMemo(
    () => calculatePreview(
      score.targets.map(t => ({ ...t, hits_per_paper: stage.hits_per_paper })),
      score.time,
      stage.scoring_type as any,
      shooterDetails.powerFactor as any,
      score.procedural_count,
      score.ftsa_count,
      score.extra_shot_count,
      score.extra_hit_count,
      score.stacking_count,
      score.overtime_shot_count,
    ),
    [score, stage, shooterDetails.powerFactor],
  );

  const totalPenalties = score.procedural_count + score.ftsa_count
    + score.extra_shot_count + score.extra_hit_count
    + score.stacking_count + score.overtime_shot_count;

  return (
    <div className="scoring-nav-root dark:text-white">
      {/* Header — pinned */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11"
        >
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
        <div className="flex gap-1 flex-wrap mt-1">
          <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
          <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
          <Badge color={shooterDetails.powerFactor === 'major' ? 'warning' : 'success'}>
            {powerFactorLabel(shooterDetails.powerFactor)}
          </Badge>
        </div>
      </div>

      {/* Summary data — scrollable */}
      <div className="scoring-scroll-area p-4 dark:text-white">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>

        <div className="space-y-2">
          {/* Hit totals */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl">
            <span className="">A</span>
            <span className="font-mono text-right">{totalAlpha}</span>

            <span className="">C</span>
            <span className="font-mono text-right">{totalCharlie}</span>

            <span className="">D</span>
            <span className="font-mono text-right">{totalDelta}</span>

            <span className="">{t('scoring.misses')}</span>
            <span className="font-mono text-right">{totalMiss}</span>

            <span className="">{t('scoring.noShootHits')}</span>
            <span className="font-mono text-right">{totalNS}</span>

            {npmTargets.length > 0 && (
              <>
                <span className="">{t('scoring.npmTargets')}</span>
                <span className="font-mono text-right">{totalNPM}</span>
              </>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Penalties — breakdown by type */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white">
            {score.procedural_count > 0 && (
              <>
                <span className="">{t('scoring.procedurals')}</span>
                <span className="font-mono text-right text-red-600">−{score.procedural_count * 10}</span>
              </>
            )}
            {score.ftsa_count > 0 && (
              <>
                <span className="">{t('scoring.ftsa')}</span>
                <span className="font-mono text-right text-red-600">−{score.ftsa_count * 10}</span>
              </>
            )}
            {score.extra_shot_count > 0 && (
              <>
                <span className="">{t('scoring.extraShots')}</span>
                <span className="font-mono text-right text-red-600">−{score.extra_shot_count * 10}</span>
              </>
            )}
            {score.extra_hit_count > 0 && (
              <>
                <span className="">{t('scoring.extraHits')}</span>
                <span className="font-mono text-right text-red-600">−{score.extra_hit_count * 10}</span>
              </>
            )}
            {score.stacking_count > 0 && (
              <>
                <span className="">{t('scoring.stacking')}</span>
                <span className="font-mono text-right text-red-600">−{score.stacking_count * 10}</span>
              </>
            )}
            {score.overtime_shot_count > 0 && (
              <>
                <span className="">{t('scoring.overtime')}</span>
                <span className="font-mono text-right text-red-600">−{score.overtime_shot_count * 5}</span>
              </>
            )}
            {totalPenalties === 0 && (
              <>
                <span className="">{t('scoring.penalties')}</span>
                <span className="font-mono text-right">0</span>
              </>
            )}
            {totalPenalties > 0 && (
              <>
                <span className="font-semibold">{t('scoring.totalPenalties')}</span>
                <span className="font-mono text-right text-red-600 font-semibold">−{preview.penalty_points}</span>
              </>
            )}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          {/* Computed results */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xl dark:text-white font-medium">
            {score.time !== null && (
              <>
                <span>{t('scoring.time')}</span>
                <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>
              </>
            )}

            <span>{t('scoring.raw')}</span>
            <span className="font-mono text-right">{preview.raw_points}</span>

            <span>{t('scoring.net')}</span>
            <span className="font-mono text-right">{preview.net_points}</span>

            {stage.scoring_type !== 'fixed_time' && (
              <>
                <span>{t('scoring.hf')}</span>
                <span className="font-mono text-right">{preview.hit_factor.toFixed(4)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar — pinned */}
      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}

/** IDPA summary */
function IDPASummary({ stage, score, shooterName, shooterDetails, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();
  const { categoryLabel } = useConstLabels();

  const paperTargets = score.targets.filter(t => t.target_type === 'paper');
  const steelTargets = score.targets.filter(t => t.target_type === 'steel');

  const totalAlpha = paperTargets.reduce((s, t) => s + t.alpha, 0) + steelTargets.filter(t => t.steel_hit === true).length;
  const totalCharlie = paperTargets.reduce((s, t) => s + t.charlie, 0);
  const totalDelta = paperTargets.reduce((s, t) => s + t.delta, 0);
  const totalMiss = paperTargets.reduce((s, t) => s + t.miss, 0) + steelTargets.filter(t => t.steel_hit === false).length;
  const totalNS = score.targets.reduce((s, t) => s + t.no_shoot_hits, 0);

  const sd = score.score_data || {};
  const preview = useMemo(
    () => calculateIDPAPreview({
      targets: score.targets.map(t => ({ ...t, hits_per_paper: stage.hits_per_paper })),
      time: score.time || 0,
      penalty_pe: Number(sd.penalty_pe) || 0,
      penalty_hnt: Number(sd.penalty_hnt) || 0,
      penalty_ftn: Number(sd.penalty_ftn) || 0,
      penalty_fp: Number(sd.penalty_fp) || 0,
      penalty_ftdr: Number(sd.penalty_ftdr) || 0,
    }),
    [score, stage],
  );

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11">
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
        <div className="flex gap-1 flex-wrap mt-1">
          <Badge color="blue">{divisionLabel(shooterDetails.division)}</Badge>
          <Badge color="gray">{categoryLabel(shooterDetails.category)}</Badge>
        </div>
      </div>

      <div className="scoring-scroll-area p-4">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
            <span className="">-0 (A)</span>
            <span className="font-mono text-right">{totalAlpha}</span>

            <span className="">-1 (C)</span>
            <span className="font-mono text-right">{totalCharlie}</span>

            <span className="">-3 (D)</span>
            <span className="font-mono text-right">{totalDelta}</span>

            <span className="">{t('scoring.misses')}</span>
            <span className="font-mono text-right">{totalMiss}</span>

            <span className="">{t('scoring.noShootHits')}</span>
            <span className="font-mono text-right">{totalNS}</span>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
            <span>{t('scoring.ptsDown')}</span>
            <span className="font-mono text-right">{preview.raw_points}</span>

            <span>{t('scoring.penalties')}</span>
            <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>

            <span>{t('scoring.time')}</span>
            <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>

            <span>{t('scoring.totalTime')}</span>
            <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}

/** Action Steel summary */
function ActionSteelSummary({ stage, score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const stringTimes: number[] = sd.string_times || [];
  const stringHits: boolean[][] = sd.string_plate_hits || [];
  const config = stage.config || {};

  const preview = useMemo(
    () => calculateActionSteelPreview({
      string_times: stringTimes,
      string_plate_hits: stringHits,
      drop_worst: config.drop_worst ?? 0,
      miss_penalty: 3,
      stop_plate_miss_cap: 30,
    }),
    [stringTimes, stringHits, config],
  );

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11">
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
      </div>

      <div className="scoring-scroll-area p-4">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
            {stringTimes.map((time, i) => (
              <Fragment key={i}>
                <span className="">{t('scoring.stringN', { number: i + 1 })}</span>
                <span className="font-mono text-right">{time > 0 ? time.toFixed(2) : '—'}</span>
              </Fragment>
            ))}
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
            <span>{t('scoring.totalTime')}</span>
            <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      <div className="bg-white max-md:pb-8  dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}

/** Multi-Gun summary */
function MultiGunSummary({ score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const sd = score.score_data || {};
  const neutralized = score.targets.filter(t => t.target_data?.neutralized === true).length;
  const totalTargets = score.targets.length;

  const preview = useMemo(
    () => calculateMultiGunPreview({
      time: score.time || 0,
      penalty_ftn_sec: Number(sd.penalty_ftn_sec) || 0,
      penalty_miss_sec: Number(sd.penalty_miss_sec) || 0,
      penalty_no_shoot_sec: Number(sd.penalty_no_shoot_sec) || 0,
      penalty_procedural_sec: Number(sd.penalty_procedural_sec) || 0,
    }),
    [score, sd],
  );

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11">
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
      </div>

      <div className="scoring-scroll-area p-4">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
            <span className="">{t('scoring.targets')}</span>
            <span className="font-mono text-right">{neutralized}/{totalTargets}</span>

            <span className="">{t('scoring.rawTime')}</span>
            <span className="font-mono text-right">{formatTimeDisplay(score.time)}</span>

            <span className="">{t('scoring.penalties')}</span>
            <span className="font-mono text-right text-red-600">+{preview.penalty_points}s</span>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
            <span>{t('scoring.totalTime')}</span>
            <span className="font-mono text-right font-bold">{preview.total_time?.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}

/** Ring-based summary (Bullseye, Archery, F-Class) */
function RingSummary({ score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const ringValues: number[] = score.score_data?.ring_values || [];
  const preview = useMemo(() => calculateRingPreview(ringValues), [ringValues]);

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11">
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
      </div>

      <div className="scoring-scroll-area p-4">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
            <span>{t('scoring.totalScore')}</span>
            <span className="font-mono text-right font-bold">{preview.raw_points}</span>

            {preview.x_count !== undefined && preview.x_count > 0 && (
              <>
                <span>{t('scoring.xCount')}</span>
                <span className="font-mono text-right">{preview.x_count}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}

/** Hit-count summary (NRL22, PRS) */
function HitCountSummary({ stage, score, shooterName, onBack, onApprove }: ScoreSummarySheetProps) {
  const { t } = useTranslation();

  const config = stage.config || {};
  const pointValue = config.point_value ?? 10;
  const hits = score.targets.filter(t => t.target_data?.hit === true).length;
  const totalTargets = score.targets.length;
  const preview = useMemo(() => calculateHitCountPreview(hits, pointValue), [hits, pointValue]);

  return (
    <div className="scoring-nav-root">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button onClick={onBack} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11">
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
      </div>

      <div className="scoring-scroll-area p-4">
        <h2 className="text-xl font-semibold mb-3">{t('scoring.summary')}</h2>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl">
            <span className="">{t('scoring.hits')}</span>
            <span className="font-mono text-right">{hits}/{totalTargets}</span>
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 dark:text-white text-xl font-medium">
            <span>{t('scoring.totalScore')}</span>
            <span className="font-mono text-right font-bold">{preview.raw_points}</span>
          </div>
        </div>
      </div>

      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <BackButton onClick={onBack} />
        <SavingApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}


/**
 * Summary confirmation sheet shown to remote scorers before saving.
 * Displays a read-only breakdown of the score with Back/Approve buttons.
 */
export default function ScoreSummarySheet(props: ScoreSummarySheetProps) {
  const { stage } = props;
  const scoringType = stage.scoring_type;

  switch (scoringType) {
    case 'idpa':
      return <IDPASummary {...props} />;

    case 'action_steel':
      return <ActionSteelSummary {...props} />;

    case 'multi_gun':
      return <MultiGunSummary {...props} />;

    case 'bullseye':
    case 'archery':
    case 'issf':
      return <RingSummary {...props} />;

    case 'long_range':
      if ((stage.config || {}).variant === 'f_class') {
        return <RingSummary {...props} />;
      }
      return <HitCountSummary {...props} />;

    case 'nrl22':
      return <HitCountSummary {...props} />;

    // comstock, virginia, fixed_time, hit_factor, chrono, default
    default:
      return <IPSCSummary {...props} />;
  }
}
