import { Badge } from 'flowbite-react';

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
}

const ZONE_CONFIG: { field: TotalField; label: string; color: string; bgColor: string }[] = [
  { field: 'alpha', label: 'A', color: 'border-green-500 focus:ring-green-400 text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  { field: 'charlie', label: 'C', color: 'border-yellow-500 focus:ring-yellow-400 text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-900/20' },
  { field: 'delta', label: 'D', color: 'border-orange-500 focus:ring-orange-400 text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
  { field: 'miss', label: 'M', color: 'border-red-500 focus:ring-red-400 text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
];

export default function DesktopPaperTargets({
  paperTargets,
  hpp,
  hasNoShootTargets,
  paperTotals,
  onPaperTotalsChange,
}: DesktopPaperTargetsProps) {
  const numTargets = paperTargets.length;
  const maxHits = numTargets * hpp;
  const totalScoring = paperTotals.alpha + paperTotals.charlie + paperTotals.delta;
  const totalAll = totalScoring + paperTotals.miss;

  const fields: { field: TotalField; label: string; color: string; bgColor: string }[] = hasNoShootTargets
    ? [...ZONE_CONFIG, { field: 'no_shoot_hits', label: 'NS', color: 'border-red-500 focus:ring-red-400 text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' }]
    : ZONE_CONFIG;

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">🎯 Paper Targets</span>
        <Badge size="sm" color="blue">{numTargets}</Badge>
        <span className="text-[10px] text-gray-400 ml-1">× {hpp} hits each</span>
      </div>

      {/* Aggregated zone inputs */}
      <div className="space-y-2">
        {fields.map(({ field, label, color, bgColor }) => (
          <div key={field} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${bgColor}`}>
            <label className={`text-sm font-bold uppercase w-6 text-center ${color.split(' ').find(c => c.startsWith('text-')) || ''}`}>
              {label}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className={`w-20 h-9 text-center font-mono text-lg font-bold rounded-lg border-2 ${color} focus:outline-none focus:ring-2 bg-white dark:bg-gray-700`}
              value={paperTotals[field]}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                onPaperTotalsChange(field, isNaN(val) ? 0 : val);
              }}
            />
            <span className="text-[10px] text-gray-400">total</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {totalScoring} scoring / {totalAll} total hits
        </span>
        <span className="text-gray-300 dark:text-gray-600">•</span>
        <span>
          max {maxHits} ({numTargets} × {hpp})
        </span>
      </div>
    </div>
  );
}