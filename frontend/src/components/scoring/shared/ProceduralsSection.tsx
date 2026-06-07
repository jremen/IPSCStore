import { Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import PenaltyStepper from './PenaltyStepper';

interface ProceduralsSectionProps {
  proceduralCount: number;
  onProceduralChange: (delta: number) => void;
  showExtraPenalties: boolean;
  isVirginia: boolean;
  isFixedTime: boolean;
  extraShotCount: number;
  extraHitCount: number;
  stackingCount: number;
  overtimeShotCount: number;
  onPenaltyFieldChange: (key: 'extra_shot_count' | 'extra_hit_count' | 'stacking_count' | 'overtime_shot_count', delta: number) => void;
}

export default function ProceduralsSection({
  proceduralCount,
  onProceduralChange,
  showExtraPenalties,
  isVirginia,
  isFixedTime,
  extraShotCount,
  extraHitCount,
  stackingCount,
  overtimeShotCount,
  onPenaltyFieldChange,
}: ProceduralsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold dark:text-white uppercase tracking-wide">{t('scoring.procedurals')}</span>
        <span className="text-xs dark:text-white">{t('scoring.proceduralsDesc')}</span>
      </div>
      <PenaltyStepper value={proceduralCount} onDecrement={() => onProceduralChange(-1)} onIncrement={() => onProceduralChange(1)} color="orange" size="lg" />

      {showExtraPenalties && (
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">
              {isVirginia ? t('scoring.virginiaCount') : t('scoring.fixedTime')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('scoring.extraShots'), key: 'extra_shot_count' as const, desc: '−10', value: extraShotCount },
              { label: t('scoring.extraHits'), key: 'extra_hit_count' as const, desc: '−10', value: extraHitCount },
              { label: t('scoring.stacking'), key: 'stacking_count' as const, desc: '−10', value: stackingCount },
              ...(isFixedTime ? [{ label: t('scoring.overtime'), key: 'overtime_shot_count' as const, desc: t('scoring.overtimeDesc'), value: overtimeShotCount }] : []),
            ].map(({ label, key, desc, value }) => (
              <div key={key}>
                <Label className="text-xs dark:text-white">{label} {desc}</Label>
                <PenaltyStepper
                  value={value}
                  onDecrement={() => onPenaltyFieldChange(key, -1)}
                  onIncrement={() => onPenaltyFieldChange(key, 1)}
                  color="purple"
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
