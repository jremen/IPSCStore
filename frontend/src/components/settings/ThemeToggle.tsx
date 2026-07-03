import { MoonIcon, SunIcon, useThemeMode } from "flowbite-react";
import { memo } from "react";
import { useTranslation } from "react-i18next";

export const ThemeToggle = memo(function ThemeToggle() {
  const { t } = useTranslation();
  const { computedMode, toggleMode } = useThemeMode();
  const isDark = computedMode === "dark";
  return (
    <button
      type="button"
      aria-label={t('settings.themeToggleAria')}
      onClick={toggleMode}
      className="cursor-pointer text-sm text-gray-400 hover:text-white transition-colors"
    >
      {isDark ? (
        <SunIcon className="size-5" />
      ) : (
        <MoonIcon className="size-5" />
      )}
    </button>
  );
});
