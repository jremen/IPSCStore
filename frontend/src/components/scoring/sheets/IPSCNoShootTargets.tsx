import { useTranslation } from "react-i18next";

interface NoShootSectionProps {
  noShootHits: number;
  onNoShootChange: (newHits: number) => void;
  disabled?: boolean;
}

export default function NoShootSection({ noShootHits, onNoShootChange, disabled = false }: NoShootSectionProps) {
  const {t} = useTranslation();
  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">{t('scoring.noShootTargets')}</span>
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          className={`penalty-stepper rounded text-lg font-bold bg-gray-200 dark:bg-gray-600 ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-gray-300'}`}
          onClick={disabled ? undefined : () => onNoShootChange(noShootHits - 1)}
          disabled={disabled}
        >−</button>
        <div className="text-center min-w-15">
          <span className="text-2xl font-mono font-bold text-red-600 dark:text-red-400">{noShootHits}</span>
          <p className="text-xs text-gray-400">{t('scoring.nsHits')}</p>
        </div>
        <button
          className={`penalty-stepper rounded text-lg font-bold bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'active:bg-red-200'}`}
          onClick={disabled ? undefined : () => onNoShootChange(noShootHits + 1)}
          disabled={disabled}
        >+</button>
      </div>
    </div>
  );
}
