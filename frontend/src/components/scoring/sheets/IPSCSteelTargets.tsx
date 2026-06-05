import { Badge } from 'flowbite-react';
import type { TargetScore } from '../../../types/scoring';

interface SteelTargetsSectionProps {
  steelTargets: TargetScore[];
  steelMisses: number;
  onSteelMissChange: (newMisses: number) => void;
}

export default function SteelTargetsSection({ steelTargets, steelMisses, onSteelMissChange }: SteelTargetsSectionProps) {
  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">🔔 Steel</span>
        <Badge size="sm" color="gray">{steelTargets.length}</Badge>
      </div>
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <span className="text-xs text-gray-400 block">Misses</span>
          <div className="flex items-center gap-0.5 mt-1">
            <button
              className="penalty-stepper rounded text-lg font-bold bg-gray-200 dark:bg-gray-600 active:bg-gray-300"
              onClick={() => onSteelMissChange(steelMisses - 1)}
            >−</button>
            <span className="w-8 text-center text-xl font-mono font-bold text-red-600 dark:text-red-400">{steelMisses}</span>
            <button
              className="penalty-stepper rounded text-lg font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 active:bg-red-200"
              onClick={() => onSteelMissChange(steelMisses + 1)}
            >+</button>
          </div>
        </div>
        <div className="text-center">
          <span className="text-xs text-gray-400 block">Hits</span>
          <span className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">{steelTargets.length - steelMisses}</span>
          <span className="text-lg font-mono text-gray-400"> / {steelTargets.length}</span>
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-2">
        <Badge color="success" size="sm">{steelTargets.length - steelMisses} hit</Badge>
        <Badge color="failure" size="sm">{steelMisses} miss</Badge>
      </div>
    </div>
  );
}