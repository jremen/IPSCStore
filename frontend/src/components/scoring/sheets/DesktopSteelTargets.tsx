import { Badge } from 'flowbite-react';
import type { TargetScore } from '../../../types/scoring';

interface DesktopSteelTargetsProps {
  steelTargets: TargetScore[];
  steelMisses: number;
  onSteelMissChange: (newMisses: number) => void;
}

export default function DesktopSteelTargets({
  steelTargets,
  steelMisses,
  onSteelMissChange,
}: DesktopSteelTargetsProps) {
  const totalHits = steelTargets.length - steelMisses;

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">🔔 Steel</span>
        <Badge size="sm" color="gray">{steelTargets.length}</Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 uppercase">Misses</label>
          <input
            type="number"
            min="0"
            step="1"
            max={steelTargets.length}
            className="w-16 h-8 text-center font-mono text-sm font-bold rounded border-2 border-red-400 focus:ring-red-400 focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 dark:text-white"
            value={steelMisses}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
              const clamped = Math.max(0, Math.min(isNaN(val) ? 0 : val, steelTargets.length));
              onSteelMissChange(clamped);
            }}
          />
        </div>

        <div className="text-center">
          <span className="text-xs text-gray-400 block">Hits</span>
          <span className="text-lg font-mono font-bold text-green-600 dark:text-green-400">{totalHits}</span>
          <span className="text-sm font-mono text-gray-400"> / {steelTargets.length}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Badge color="success" size="sm">{totalHits} hit</Badge>
        {steelMisses > 0 && <Badge color="failure" size="sm">{steelMisses} miss</Badge>}
      </div>
    </div>
  );
}