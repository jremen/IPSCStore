import { Badge } from 'flowbite-react';
import { InputField } from '../../shared/InputField';
import type { TargetScore } from '../../../types/scoring';
import { useTranslation } from "react-i18next";

interface DesktopSteelTargetsProps {
  steelTargets: TargetScore[];
  steelMisses: number;
  onSteelMissChange: (newMisses: number) => void;
  disabled?: boolean;
  // No-shoot on steel
  steelNSHits?: number;
  onSteelNSChange?: (delta: number) => void;
  // NPM props
  npmCount?: number;
  npmHits?: number;
  onNpmHitChange?: (newHits: number) => void;
}

export default function DesktopSteelTargets({
  steelTargets,
  steelMisses,
  onSteelMissChange,
  disabled = false,
  steelNSHits = 0,
  onSteelNSChange,
  npmCount = 0,
  npmHits = 0,
  onNpmHitChange,
}: DesktopSteelTargetsProps) {
  const {t} = useTranslation();
  const totalHits = steelTargets.length - steelMisses;
  const hasNoShoot = steelNSHits > 0 || onSteelNSChange !== undefined;

  return (
    <>
      {steelTargets.length > 0 && (
      <div className="p-3">
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
                numeric
                onFocus={(e) => e.target.select()}
                className="w-16 text-center font-mono text-sm font-bold border-red-400 focus:ring-red-400"
                value={steelMisses}
                disabled={disabled}
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

        {/* No-shoot hits on steel targets */}
        {hasNoShoot && (
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-red-500 dark:text-red-400 uppercase">NS</label>
              <div className="flex items-center gap-1">
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-lg font-bold bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onSteelNSChange?.(-1)}
                  disabled={disabled || steelNSHits <= 0}
                >
                  −
                </button>
                <span className="w-8 text-center font-mono text-lg font-bold text-red-600 dark:text-red-400">{steelNSHits}</span>
                <button
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-lg font-bold bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onSteelNSChange?.(1)}
                  disabled={disabled}
                >
                  +
                </button>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">(−10 each)</span>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <Badge color="success" size="sm">{totalHits} {t('scoring.hit')}</Badge>
          {steelMisses > 0 && <Badge color="failure" size="sm">{steelMisses} {t('scoring.miss')}</Badge>}
          {steelNSHits > 0 && <Badge color="failure" size="sm">{steelNSHits} NS (−{steelNSHits * 10})</Badge>}
        </div>
      </div>
      )}

      {npmCount > 0 && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">NPM</span>
            <Badge size="sm" color="blue">{npmCount}</Badge>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">(+5 bonus, 0 penalty)</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 dark:text-white uppercase">{t('scoring.hits')}</label>
              <InputField
                type="number"
                step="1"
                min="0"
                max={String(npmCount)}
                numeric
                onFocus={(e) => e.target.select()}
                className="w-16 text-center font-mono text-sm font-bold border-green-400 focus:ring-green-400"
                value={npmHits}
                disabled={disabled}
                onChange={(v) => {
                  if (!onNpmHitChange) return;
                  const val = v === '' ? 0 : parseInt(v, 10);
                  const clamped = Math.max(0, Math.min(isNaN(val) ? 0 : val, npmCount));
                  onNpmHitChange(clamped);
                }}
              />
            </div>

            <div className="text-center">
              <span className="text-xs text-gray-400 dark:text-white block">{t('scoring.misses')}</span>
              <span className="text-lg font-mono font-bold text-gray-400">{npmCount - npmHits}</span>
              <span className="text-sm font-mono text-gray-400"> / {npmCount}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            {npmHits > 0 && <Badge color="success" size="sm">+{npmHits * 5} pts</Badge>}
            <Badge color="gray" size="sm">{npmCount - npmHits} miss (0 pen)</Badge>
          </div>
        </div>
      )}
    </>
  );
}
