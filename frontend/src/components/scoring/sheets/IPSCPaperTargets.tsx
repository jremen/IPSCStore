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
  const {t} = useTranslation();
  const hasSteelRow = steelCount > 0;
  const hasNpm = npmCount > 0;

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700 dark:text-white">
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-center">
              <th className="px-1 sm:px-2 py-1 text-lg font-bold text-gray-500 w-8">#</th>
              <th className="px-1 sm:px-2 py-1 text-lg font-bold dark:text-white">A</th>
              <th className="px-1 sm:px-2 py-1 text-lg font-bold dark:text-white">C</th>
              <th className="px-1 sm:px-2 py-1 text-lg font-bold dark:text-white">D</th>
              <th className="px-1 sm:px-2 py-1 text-lg font-bold text-red-600 dark:text-white">M</th>
              <th className={`px-1 sm:px-2 py-1 text-lg font-bold text-red-500 dark:text-white ${hasNoShootTargets || hasSteelRow ? '' : 'opacity-40'}`}>NS</th>
              {hasNpm && (
                <th className="px-1 sm:px-2 py-1 text-lg font-bold text-blue-600 dark:text-blue-400">NPM</th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Steel row — first row in the table */}
            {hasSteelRow && (
              <tr className="text-center border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <td className="py-1.5">
                  <button
                    className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={disabled ? undefined : onResetSteel}
                    disabled={disabled}
                    title="Click to reset row"
                  >
                    <span className={`text-xs font-bold uppercase ${disabled ? 'text-gray-400' : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'}`}>Steel</span>
                    <Badge size="sm" color="gray">{steelCount}</Badge>
                  </button>
                </td>
                <td className="py-1.5">
                  <div className="flex justify-center">
                    <HitCell value={steelHits} color="green" onIncrement={onSteelHitIncrement} onDecrement={onSteelHitDecrement} disabled={disabled} />
                  </div>
                </td>
                <td className="py-1.5">
                  {/* C not applicable for steel */}
                </td>
                <td className="py-1.5">
                  {/* D not applicable for steel */}
                </td>
                <td className="py-1.5">
                  <div className="flex justify-center">
                    <HitCell value={steelMisses} color="red" onIncrement={onSteelMissIncrement} onDecrement={onSteelMissDecrement} disabled={disabled} />
                  </div>
                </td>
                <td className="py-1.5">
                  <div className="flex justify-center">
                    <HitCell value={steelNSHits} color="red" onIncrement={() => onSteelNSClick(1)} onDecrement={() => onSteelNSClick(-1)} disabled={disabled} />
                  </div>
                </td>
                {hasNpm && (
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={npmHits} color="green" onIncrement={onNpmHitIncrement} onDecrement={onNpmHitDecrement} disabled={disabled} />
                    </div>
                  </td>
                )}
              </tr>
            )}

            {/* NPM row — shown when no steel row exists */}
            {hasNpm && !hasSteelRow && (
              <tr className="text-center border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
                <td className="py-1.5">
                  <button
                    className={`flex items-center gap-1 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={disabled ? undefined : onResetNpm}
                    disabled={disabled}
                    title="Click to reset row"
                  >
                    <span className={`text-xs font-bold uppercase ${disabled ? 'text-gray-400' : 'text-blue-600 hover:text-red-500 dark:text-blue-400 dark:hover:text-red-400'}`}>NPM</span>
                    <Badge size="sm" color="blue">{npmCount}</Badge>
                  </button>
                </td>
                <td className="py-1.5" colSpan={3}>{/* A, C, D — not applicable for NPM */}</td>
                <td className="py-1.5">{/* M — miss is no penalty, not shown */}</td>
                <td className="py-1.5">{/* NS — not applicable for NPM */}</td>
                <td className="py-1.5">
                  <div className="flex justify-center">
                    <HitCell value={npmHits} color="green" onIncrement={onNpmHitIncrement} onDecrement={onNpmHitDecrement} disabled={disabled} />
                  </div>
                </td>
              </tr>
            )}

            {/* Paper target rows */}
            {paperTargets.map((target, idx) => {
              const finished = isTargetFinished(target);
              return (
                <tr
                  key={target.target_index}
                  className={`text-center border-t border-gray-100 dark:border-gray-700 transition-colors ${
                    finished ? 'bg-green-50 dark:bg-green-900/60' : ''
                  }`}
                >
                  <td className="py-1.5">
                    <button
                      className={`font-mono text-sm font-bold transition-colors ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-500 hover:text-red-500 dark:text-white dark:hover:text-red-400 cursor-pointer'}`}
                      onClick={disabled ? undefined : () => onResetTarget(target.target_index)}
                      disabled={disabled}
                      title="Click to reset row"
                    >
                      {idx + 1}
                    </button>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.alpha} color="green" onIncrement={() => onHitClick(target.target_index, 'alpha')} onDecrement={() => onDecrement(target.target_index, 'alpha')} disabled={disabled} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.charlie} color="yellow" onIncrement={() => onHitClick(target.target_index, 'charlie')} onDecrement={() => onDecrement(target.target_index, 'charlie')} disabled={disabled} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.delta} color="orange" onIncrement={() => onHitClick(target.target_index, 'delta')} onDecrement={() => onDecrement(target.target_index, 'delta')} disabled={disabled} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.miss} color="red" onIncrement={() => onMissClick(target.target_index)} onDecrement={() => onDecrement(target.target_index, 'miss')} disabled={disabled} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
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
                  </td>
                  {hasNpm && <td className="py-1.5">{/* NPM not on paper rows */}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {paperTargets.length > 0 && (
        <p className="text-xs text-gray-400 mt-1.5 text-center md:text-left">
          {paperTargets.filter(isTargetFinished).length}/{paperTargets.length} finished (≥{hpp} hits each)
        </p>
      )}
    </div>
  );
}