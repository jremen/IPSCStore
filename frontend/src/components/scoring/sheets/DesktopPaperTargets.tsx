import { Badge } from 'flowbite-react';
import { InputField } from '../../shared/InputField';
import { useTranslation } from "react-i18next";

type TotalField = 'alpha' | 'charlie' | 'delta' | 'miss' | 'no_shoot_hits';

interface PaperTotals {
  alpha: number;
  charlie: number;
  delta: number;
  miss: number;
  no_shoot_hits: number;
}

interface DesktopPaperTargetsProps {
  paperTargets: { target_index: number; alpha: number; charlie: number; delta: number; miss: number; no_shoot_hits: number }[];
  hpp: number;
  hasNoShootTargets: boolean;
  paperTotals: PaperTotals;
  onPaperTotalsChange: (field: TotalField, value: number) => void;
  disabled?: boolean;
}

const ZONE_CONFIG: { field: TotalField; label: string; color: string;}[] = [
  { field: 'alpha', label: 'A', color: 'border-green-500 focus:ring-green-400'},
  { field: 'charlie', label: 'C', color: 'border-yellow-500 focus:ring-yellow-400'},
  { field: 'delta', label: 'D', color: 'border-orange-500 focus:ring-orange-400'},
  { field: 'miss', label: 'M', color: 'border-red-500 focus:ring-red-400'},
];

export default function DesktopPaperTargets({
  paperTargets,
  hpp,
  hasNoShootTargets,
  paperTotals,
  onPaperTotalsChange,
  disabled = false,
}: DesktopPaperTargetsProps) {
  const {t, i18n} = useTranslation();
  const numTargets = paperTargets.length;
  const maxHits = numTargets * hpp;
  const totalScoring = paperTotals.alpha + paperTotals.charlie + paperTotals.delta;
  const totalAll = totalScoring + paperTotals.miss;

  const fields: { field: TotalField; label: string; color: string; }[] = hasNoShootTargets
    ? [...ZONE_CONFIG, { field: 'no_shoot_hits', label: 'NS', color: 'border-red-500 focus:ring-red-400' }]
    : ZONE_CONFIG;

  return (
    <div className="p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-blue-600 dark:text-white uppercase tracking-wide">{t('scoring.paperTargets')}</span>
        <Badge size="sm" color="blue">{numTargets}</Badge>
        <span className="text-[10px] text-gray-400 ml-1">× {hpp} hits each</span>
      </div>

      {/* Aggregated zone inputs */}
      <div className="space-y-2 grid grid-cols-2">
        {fields.map(({ field, label, color }) => (
          <div key={field} className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <label className="font-bold uppercase w-6 text-center dark:text-white">
              {label}
            </label>
            <InputField
              type="number"
              step="1"
              min="0"
              sizing="sm"
              className={`w-20 h-9 text-center font-mono text-lg font-bold rounded-lg border-2 ${color}`}
              value={paperTotals[field]}
              disabled={disabled}
              onChange={(v) => {
                const val = v === '' ? 0 : parseInt(v, 10);
                onPaperTotalsChange(field, isNaN(val) ? 0 : val);
              }}
            />
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {i18n.t('scoring.scoringSummary', {scoring: totalAll, total: maxHits })}
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span>
          {i18n.t('scoring.maxHits', {max: maxHits, numTargets: numTargets, hpp})}
        </span>
      </div>
    </div>
  );
}
