import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SummaryBackButton } from './SummaryBackButton';
import { SummaryApproveButton } from './SummaryApproveButton';

interface SummarySheetLayoutProps {
  shooterName: string;
  badges?: ReactNode;
  children: ReactNode;
  onBack: () => void;
  onApprove: () => void;
}

export function SummarySheetLayout({ shooterName, badges, children, onBack, onApprove }: SummarySheetLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="scoring-nav-root dark:text-white">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 scoring-nav-pinned">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline mb-2 min-h-11"
        >
          ← {t('scoring.backToScoring')}
        </button>
        <div className="text-xl font-bold">{shooterName}</div>
        {badges && <div className="flex gap-1 flex-wrap mt-1">{badges}</div>}
      </div>

      <div className="scoring-scroll-area p-4 dark:text-white">
        {children}
      </div>

      <div className="bg-white max-md:pb-8 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center scoring-nav-pinned">
        <SummaryBackButton onClick={onBack} />
        <SummaryApproveButton onClick={onApprove} />
      </div>
    </div>
  );
}
