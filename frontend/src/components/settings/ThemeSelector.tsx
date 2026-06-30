import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { TbSun, TbMoon } from 'react-icons/tb';
import { BsCircleHalf } from 'react-icons/bs';
import { useUIStore, type ThemeMode } from '../../stores/uiStore';

const themeOptions: { value: ThemeMode; icon: React.ReactNode; labelKey: string }[] = [
  { value: 'light', icon: <TbSun className="size-4" />, labelKey: 'settings.themeLight' },
  { value: 'dark', icon: <TbMoon className="size-4" />, labelKey: 'settings.themeDark' },
  { value: 'eink', icon: <BsCircleHalf className="size-4" />, labelKey: 'settings.themeEink' },
];

export function ThemeSelector() {
  const { t } = useTranslation();
  const themeMode = useUIStore((s) => s.themeMode);
  const setThemeMode = useUIStore((s) => s.setThemeMode);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = themeOptions.find((o) => o.value === themeMode);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={t('settings.themeAriaLabel')}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white transition-colors cursor-pointer"
      >
        {current?.icon}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setThemeMode(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer
                ${themeMode === opt.value ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white'}
              `}
            >
              {opt.icon}
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
