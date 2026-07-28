import { useTranslation } from 'react-i18next';
import type { Stage } from '../../types/stage';
import { useEscClose } from '../../hooks/useEscClose';

interface StageDetailsViewProps {
  show: boolean;
  onClose: () => void;
  stage: Stage | null;
}

/**
 * Fullscreen read-only stage details view used by the /scoring scoring view.
 * Shows paper/steel/no-shoot/NPM target counts, min rounds, max points,
 * the written stage briefing, and the stage image (if uploaded).
 *
 * Renders as a fixed fullscreen overlay (not a modal box) styled like
 * the scoring summary sheet — back arrow pinned at the top, back button
 * pinned at the bottom, plain text content in the scrollable middle.
 */
export default function StageDetailsView({ show, onClose, stage }: StageDetailsViewProps) {
  const { t } = useTranslation();
  useEscClose(show ? onClose : undefined);

  if (!show) return null;

  // Coerce numeric fields — API returns them as strings (see api-number-coercion)
  const paperTargets = stage ? Number(stage.paper_targets) : 0;
  const steelTargets = stage ? Number(stage.steel_targets) : 0;
  const noShootTargets = stage ? Number(stage.no_shoot_targets) : 0;
  const npmTargets = stage ? Number(stage.npm_targets ?? 0) : 0;
  const minRounds = stage ? Number(stage.min_rounds) : 0;
  const maxPoints = stage ? Number(stage.max_points) : 0;

  const title = stage
    ? `${t('scoring.stage', { number: stage.stage_number })}: ${stage.name}`
    : t('stages.stageDetails');

  return (
    <div className="fixed inset-0 z-999 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header — pinned */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline min-h-11"
        >
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold mt-1 dark:text-white">{title}</div>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 dark:text-white">
        {stage ? (
          <div className="space-y-4">
            <p className="text-lg">
              {t('stages.paper')}: {paperTargets}
              {', '}
              {t('stages.steel')}: {steelTargets}
              {', '}
              {t('stages.noShoot')}: {noShootTargets > 0 ? t('common.yes') : '—'}
              {npmTargets > 0 && (
                <>, NPM: {npmTargets}</>
              )}
              {', '}
              {t('stages.rounds')}: {minRounds}
              {', '}
              {t('stages.points')}: {maxPoints}
            </p>

            <div>
              <h3 className="text-base font-semibold mb-1 dark:text-white">{t('stages.briefing')}</h3>
              {stage.briefing ? (
                <p className="whitespace-pre-wrap text-base text-gray-800 dark:text-gray-200">
                  {stage.briefing}
                </p>
              ) : (
                <p className="text-base text-gray-500 dark:text-gray-400 italic">{t('stages.noBriefing')}</p>
              )}
            </div>

            {stage.image_path && (
              <div>
                <h3 className="text-base font-semibold mb-1 dark:text-white">{t('stages.image')}</h3>
                <img
                  src={`/api/uploads/${stage.image_path.split('/').pop()}`}
                  alt={`Stage ${stage.stage_number} plan`}
                  className="max-h-96 rounded"
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center">{t('common.loading')}</p>
        )}
      </div>

      {/* Bottom bar — pinned */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
        <button
          onClick={onClose}
          className="w-full bg-gray-200 dark:bg-gray-700 dark:text-white rounded-lg min-h-11 font-medium"
        >
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
