import { Badge } from 'flowbite-react';
import { InputField } from '../../shared/InputField';
import type { TargetScore } from '../../../types/scoring';
import { useTranslation } from "react-i18next";

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
  const {t} = useTranslation();
  const totalHits = steelTargets.length - steelMisses;

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-gray-600 dark:text-white uppercase tracking-wide">{t('scoring.steelTargets')}</span>
        <Badge size="sm" color="gray">{steelTargets.length}</Badge>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-gray-500 dark:text-white uppercase">{t('scoring.misses')}</label>
          <InputField
            type="number"
            step="1"
            min="0"
            max={String(steelTargets.length)}
            className="w-16 text-center font-mono text-sm font-bold border-red-400 focus:ring-red-400"
            value={steelMisses}
            onChange={(v) => {
              const val = v === '' ? 0 : parseInt(v, 10);
              const clamped = Math.max(0, Math.min(isNaN(val) ? 0 : val, steelTargets.length));
              onSteelMissChange(clamped);
            }}
          />
        </div>

        <div className="text-center">
          <span className="text-xs text-gray-400 dark:text-white block">{t('scoring.hits')}</span>
          <span className="text-lg font-mono font-bold text-green-600 dark:text-green-400">{totalHits}</span>
          <span className="text-sm font-mono text-gray-400"> / {steelTargets.length}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Badge color="success" size="sm">{totalHits} {t('scoring.hit')}</Badge>
        {steelMisses > 0 && <Badge color="failure" size="sm">{steelMisses} {t('scoring.miss')}</Badge>}
      </div>
    </div>
  );
}
