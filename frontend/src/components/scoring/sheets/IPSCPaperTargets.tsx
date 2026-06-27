import { Badge } from 'flowbite-react';
import HitCell from '../shared/HitCell';
import type { TargetScore } from '../../../types/scoring';
import { useTranslation } from "react-i18next";

interface PaperTargetsTableProps {
  paperTargets: TargetScore[];
  hpp: number;
  hasNoShootTargets: boolean;
  isTargetFinished: (target: TargetScore) => boolean;
  onHitClick: (targetIndex: number, field: 'alpha' | 'charlie' | 'delta') => void;
  onMissClick: (targetIndex: number) => void;
  onDecrement: (targetIndex: number, field: 'alpha' | 'charlie' | 'delta' | 'miss') => void;
  onNSClick: (targetIndex: number, delta: number) => void;
  onResetTarget: (targetIndex: number) => void;
  disabled?: boolean;
  // Steel row props
  steelCount: number;
  steelHits: number;
  steelMisses: number;
  onSteelHitIncrement: () => void;
  onSteelHitDecrement: () => void;
  onSteelMissIncrement: () => void;
  onSteelMissDecrement: () => void;
  onSteelNSClick: (delta: number) => void;
  steelNSHits: number;
  onResetSteel: () => void;
  // NPM props
  npmCount: number;
  npmHits: number;
  onNpmHitIncrement: () => void;
  onNpmHitDecrement: () => void;
  onResetNpm: () => void;
}

export default function PaperTargetsTable({
  paperTargets,
  hpp,
  hasNoShootTargets,
  isTargetFinished,
  onHitClick,
  onMissClick,
  onDecrement,
  onNSClick,
  onResetTarget,
  disabled = false,
  steelCount,
  steelHits,
  steelMisses,
  onSteelHitIncrement,
  onSteelHitDecrement,
  onSteelMissIncrement,
  onSteelMissDecrement,
  onSteelNSClick,
  steelNSHits,
  onResetSteel,
  npmCount,
  npmHits,
  onNpmHitIncrement,
  onNpmHitDecrement,
  onResetNpm,
}: PaperTargetsTableProps) {
  const {t, i18n} = useTranslation();
  const hasSteelRow = steelCount > 0;
  const hasNpm = npmCount > 0;

  const gridCols = hasNpm
    ? 'grid-cols-[4rem_repeat(6,1fr)]'
    : 'grid-cols-[4rem_repeat(5,1fr)]';

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700 dark:text-white">
      {/* Sticky column header — sticks to top of .scoring-scroll-area on mobile */}
      <div className={`sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 -mx-1 sm:mx-0 px-1 sm:px-0`}>
        <div className={`grid ${gridCols} items-center`}>
          <div className="text-lg font-bold text-gray-500 py-1 text-center">#</div>
          <div className="text-lg font-bold dark:text-white py-1 text-center">A</div>
          <div className="text-lg font-bold dark:text-white py-1 text-center">C</div>
          <div className="text-lg font-bold dark:text-white py-1 text-center">D</div>
          <div className="text-lg font-bold text-red-600 dark:text-white py-1 text-center">M</div>
          <div className={`text-lg font-bold text-red-500 dark:text-white py-1 text-center ${hasNoShootTargets || hasSteelRow ? '' : 'opacity-40'}`}>NS</div>
          {hasNpm && <div className="text-lg font-bold text-blue-600 dark:text-blue-400 py-1 text-center">NPM</div>}
        </div>
      </div>

      {/* Body rows — horizontally scrollable on narrow screens */}
      <div className="overflow-x-auto -mx-1 sm:mx-0 min-w-0">
        {/* Steel row — first row when steel targets exist */}
        {hasSteelRow && (
          <div className={`grid ${gridCols} items-center text-center border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50`}>
            <div className="py-1.5">
              <button
                className={`flex items-center justify-center gap-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={disabled ? undefined : onResetSteel}
                disabled={disabled}
                title="Click to reset row"
              >
                <span className={`text-xs font-bold uppercase ${disabled ? 'text-gray-400' : 'hover:text-red-500 dark:text-white dark:hover:text-red-400'}`}>{t('stages.steel')}</span>
                <Badge size="sm" color="gray">{steelCount}</Badge>
              </button>
            </div>
            <div className="py-1.5 flex justify-center">
              <HitCell value={steelHits} color="green" onIncrement={onSteelHitIncrement} onDecrement={onSteelHitDecrement} disabled={disabled} />
            </div>
            <div className="py-1.5" />
            <div className="py-1.5" />
            <div className="py-1.5 flex justify-center">
              <HitCell value={steelMisses} color="red" onIncrement={onSteelMissIncrement} onDecrement={onSteelMissDecrement} disabled={disabled} />
            </div>
            <div className="py-1.5 flex justify-center">
              <HitCell value={steelNSHits} color="red" onIncrement={() => onSteelNSClick(1)} onDecrement={() => onSteelNSClick(-1)} disabled={disabled} />
            </div>
            {hasNpm && (
              <div className="py-1.5 flex justify-center">
                <HitCell value={npmHits} color="green" onIncrement={onNpmHitIncrement} onDecrement={onNpmHitDecrement} disabled={disabled} />
              </div>
            )}
          </div>
        )}

        {/* NPM standalone row — when no steel but NPM targets exist */}
        {hasNpm && !hasSteelRow && (
          <div className={`grid ${gridCols} items-center text-center border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30`}>
            <div className="py-1.5">
              <button
                className={`flex items-center justify-center gap-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={disabled ? undefined : onResetNpm}
                disabled={disabled}
                title="Click to reset row"
              >
                <span className={`text-xs font-bold uppercase ${disabled ? 'text-gray-400' : 'text-blue-600 hover:text-red-500 dark:text-blue-400 dark:hover:text-red-400'}`}>NPM</span>
                <Badge size="sm" color="blue">{npmCount}</Badge>
              </button>
            </div>
            <div className="py-1.5" />
            <div className="py-1.5" />
            <div className="py-1.5" />
            <div className="py-1.5" />
            <div className="py-1.5" />
            <div className="py-1.5 flex justify-center">
              <HitCell value={npmHits} color="green" onIncrement={onNpmHitIncrement} onDecrement={onNpmHitDecrement} disabled={disabled} />
            </div>
          </div>
        )}

        {/* Paper target rows */}
        {paperTargets.map((target, idx) => {
          const finished = isTargetFinished(target);
          return (
            <div
              key={target.target_index}
              className={`grid ${gridCols} items-center text-center border-t border-gray-100 dark:border-gray-700 transition-colors ${
                finished ? 'bg-green-200 dark:bg-green-500/60 text-white' : ''
              }`}
            >
              <div className="py-1.5">
                <button
                  className={`font-mono text-sm font-bold transition-colors ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-red-500 dark:text-white dark:hover:text-red-400 cursor-pointer'}`}
                  onClick={disabled ? undefined : () => onResetTarget(target.target_index)}
                  disabled={disabled}
                  title="Click to reset row"
                >
                  {idx + 1}
                </button>
              </div>
              <div className="py-1.5 flex justify-center">
                <HitCell value={target.alpha} color="green" onIncrement={() => onHitClick(target.target_index, 'alpha')} onDecrement={() => onDecrement(target.target_index, 'alpha')} disabled={disabled} />
              </div>
              <div className="py-1.5 flex justify-center">
                <HitCell value={target.charlie} color="yellow" onIncrement={() => onHitClick(target.target_index, 'charlie')} onDecrement={() => onDecrement(target.target_index, 'charlie')} disabled={disabled} />
              </div>
              <div className="py-1.5 flex justify-center">
                <HitCell value={target.delta} color="orange" onIncrement={() => onHitClick(target.target_index, 'delta')} onDecrement={() => onDecrement(target.target_index, 'delta')} disabled={disabled} />
              </div>
              <div className="py-1.5 flex justify-center">
                <HitCell value={target.miss} color="red" onIncrement={() => onMissClick(target.target_index)} onDecrement={() => onDecrement(target.target_index, 'miss')} disabled={disabled} />
              </div>
              <div className="py-1.5 flex justify-center">
                {hasNoShootTargets ? (
                  <HitCell value={target.no_shoot_hits} color="red" onIncrement={() => onNSClick(target.target_index, 1)} onDecrement={() => onNSClick(target.target_index, -1)} disabled={disabled} />
                ) : (
                  <button
                    className="w-11 h-11 rounded-lg flex items-center justify-center font-mono text-xl font-bold
                      bg-gray-50 dark:bg-gray-700/50 text-gray-300 dark:text-gray-500 ring-1 ring-gray-200 dark:ring-gray-600 cursor-not-allowed"
                    disabled
                  >
                    0
                  </button>
                )}
              </div>
              {hasNpm && <div className="py-1.5" />}
            </div>
          );
        })}
      </div>

      {paperTargets.length > 0 && (
        <p className="text-sm text-gray-400 mt-1.5 text-center md:text-left">
          {i18n.t('scoring.finished', {hpp, finished:paperTargets.filter(isTargetFinished).length, total: paperTargets.length})}
        </p>
      )}
    </div>
  );
}
