import { MoonIcon, SunIcon, useThemeMode } from "flowbite-react";
import { memo } from "react";

export const ThemeToggle = memo(function ThemeToggle() {
  const { computedMode, toggleMode } = useThemeMode();
  const isDark = computedMode === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
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
