/** Scoring sheet card header with title, subtitle, and reset button */
export default function ScoringSheetHeader({
  title,
  subtitle,
  onReset,
}: {
  title: string;
  subtitle: string;
  onReset: () => void;
}) {
  return (
    <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-start justify-between">
      <div>
        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <button
        className="scoring-btn px-3 text-xs font-bold rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 transition-colors shrink-0"
        onClick={onReset}
      >↺ Reset All</button>
    </div>
  );
}