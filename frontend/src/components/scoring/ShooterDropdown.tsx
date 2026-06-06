import { useEffect, useState, useRef } from 'react';
import { Badge, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useScoringStore } from '../../stores/scoringStore';
import { divisionLabel } from '../../utils/constants';
import { useScoringProgress } from '../../hooks/useScoringProgress';

/** Searchable shooter dropdown — reads registrations, currentRegistrationId, and squadFilter from store directly */
export default function ShooterDropdown({ onSelect }: { onSelect: (regId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { registrations, currentRegistrationId, squadFilter } = useScoringStore();
  const { scoredIds } = useScoringProgress();
  const { t } = useTranslation();

  const currentShooter = registrations.find(r => r.id === currentRegistrationId);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Apply squad filter first, then search filter
  const squadFiltered = squadFilter !== null
    ? registrations.filter(r => r.squad === squadFilter)
    : registrations;

  const filtered = search
    ? squadFiltered.filter(r =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        r.effective_division.toLowerCase().includes(search.toLowerCase()) ||
        r.effective_category.toLowerCase().includes(search.toLowerCase()) ||
        (r.squad && String(r.squad).includes(search))
      )
    : squadFiltered;

  const handleSelect = (regId: string) => {
    onSelect(regId);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={ref} className="relative flex-1 mx-1 sm:mx-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-h-[44px]"
      >
        {currentShooter ? (
          <span className="truncate">
            {currentShooter.first_name} {currentShooter.last_name}
            <span className="text-gray-400 ml-1 hidden sm:inline">({divisionLabel(currentShooter.effective_division)})</span>
          </span>
        ) : (
          <span className="text-gray-400">{t('scoring.selectShooter')}</span>
        )}
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-40 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <TextInput
              ref={inputRef as any}
              placeholder={t('scoring.searchShooter')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sizing="sm"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-3">{t('scoring.noShootersFound')}</p>
            ) : (
              filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] ${
                    r.id === currentRegistrationId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <span className="dark:text-white flex items-center gap-1.5">
                    {scoredIds.has(r.id) && (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-[10px] leading-none shrink-0">✓</span>
                    )}
                    {r.first_name} {r.last_name}
                  </span>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Badge size="sm" color="blue">{divisionLabel(r.effective_division)}</Badge>
                    {r.squad && <Badge size="sm" color="purple">S{r.squad}</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}