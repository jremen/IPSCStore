interface NoShootSectionProps {
  noShootHits: number;
  onNoShootChange: (newHits: number) => void;
}

export default function NoShootSection({ noShootHits, onNoShootChange }: NoShootSectionProps) {
  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">🚫 No-Shoot</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          className="penalty-stepper rounded text-lg font-bold bg-gray-200 dark:bg-gray-600 active:bg-gray-300"
          onClick={() => onNoShootChange(noShootHits - 1)}
        >−</button>
        <div className="text-center min-w-[60px]">
          <span className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">{noShootHits}</span>
          <p className="text-xs text-gray-400">N/S hits (−10 each)</p>
        </div>
        <button
          className="penalty-stepper rounded text-lg font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 active:bg-red-200"
          onClick={() => onNoShootChange(noShootHits + 1)}
        >+</button>
      </div>
    </div>
  );
}