import { Badge } from 'flowbite-react';
import HitCell from '../shared/HitCell';
import type { TargetScore } from '../../../types/scoring';

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
}: PaperTargetsTableProps) {
  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">🎯 Paper Targets</span>
        <Badge size="sm" color="blue">{paperTargets.length}</Badge>
      </div>
      <div className="overflow-x-auto -mx-1 sm:mx-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-center">
              <th className="px-1 sm:px-2 py-1 text-xs font-bold text-gray-500 w-8">#</th>
              <th className="px-1 sm:px-2 py-1 text-xs font-bold text-green-600">A</th>
              <th className="px-1 sm:px-2 py-1 text-xs font-bold text-yellow-600">C</th>
              <th className="px-1 sm:px-2 py-1 text-xs font-bold text-orange-600">D</th>
              <th className="px-1 sm:px-2 py-1 text-xs font-bold text-red-600">M</th>
              <th className={`px-1 sm:px-2 py-1 text-xs font-bold text-red-500 ${hasNoShootTargets ? '' : 'opacity-40'}`}>NS</th>
            </tr>
          </thead>
          <tbody>
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
                      className="font-mono text-sm font-bold text-gray-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer transition-colors"
                      onClick={() => onResetTarget(target.target_index)}
                      title="Click to reset row"
                    >
                      {idx + 1}
                    </button>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.alpha} color="green" onIncrement={() => onHitClick(target.target_index, 'alpha')} onDecrement={() => onDecrement(target.target_index, 'alpha')} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.charlie} color="yellow" onIncrement={() => onHitClick(target.target_index, 'charlie')} onDecrement={() => onDecrement(target.target_index, 'charlie')} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.delta} color="orange" onIncrement={() => onHitClick(target.target_index, 'delta')} onDecrement={() => onDecrement(target.target_index, 'delta')} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      <HitCell value={target.miss} color="red" onIncrement={() => onMissClick(target.target_index)} onDecrement={() => onDecrement(target.target_index, 'miss')} />
                    </div>
                  </td>
                  <td className="py-1.5">
                    <div className="flex justify-center">
                      {hasNoShootTargets ? (
                        <HitCell value={target.no_shoot_hits} color="red" onIncrement={() => onNSClick(target.target_index, 1)} onDecrement={() => onNSClick(target.target_index, -1)} />
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center md:text-left">
        {paperTargets.filter(isTargetFinished).length}/{paperTargets.length} finished (≥{hpp} hits each)
      </p>
    </div>
  );
}