import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, POWER_FACTORS } from '../utils/constants';

export interface ConstLabelMaps {
  /** Translated display label for a category value, falling back to a derived English label. */
  categoryLabel: (value: string | null | undefined) => string;
  /** Translated display label for a power factor value, falling back to a derived English label. */
  powerFactorLabel: (value: string | null | undefined) => string;
}

function deriveFallback(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Hook that returns translated display-label functions for the i18n-backed constants
 *  (CATEGORIES, POWER_FACTORS). Used in React components to show badges/selects in the
 *  active language. The non-translated `categoryLabel`/`powerFactorLabel` helpers in
 *  constants.ts are kept for non-React contexts (e.g. PDF export) where i18n is not available. */
export function useConstLabels(): ConstLabelMaps {
  const { t } = useTranslation();

  const categoryMap = useMemo(
    () => new Map<string, string>(CATEGORIES.map(c => [c.value, t(c.i18nKey) as string])),
    [t]
  );
  const powerFactorMap = useMemo(
    () => new Map<string, string>(POWER_FACTORS.map(p => [p.value, t(p.i18nKey) as string])),
    [t]
  );

  return {
    categoryLabel: (value) => {
      if (value === null || value === undefined) return '';
      return categoryMap.get(value) ?? deriveFallback(value);
    },
    powerFactorLabel: (value) => {
      if (value === null || value === undefined) return '';
      return powerFactorMap.get(value) ?? deriveFallback(value);
    },
  };
}
