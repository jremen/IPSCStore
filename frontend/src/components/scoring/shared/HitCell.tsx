import { useRef } from 'react';

interface HitCellProps {
  value: number;
  color: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

const colorMap: Record<string, { bg: string; ring: string; text: string; activeBg: string }> = {
  green:  { bg: 'bg-green-50 dark:bg-green-900/30',   ring: 'ring-green-400',    text: 'text-green-700 dark:text-green-300', activeBg: 'active:bg-green-200 dark:active:bg-green-800' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30',  ring: 'ring-yellow-400',   text: 'text-yellow-700 dark:text-yellow-300', activeBg: 'active:bg-yellow-200 dark:active:bg-yellow-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/30',  ring: 'ring-orange-400',   text: 'text-orange-700 dark:text-orange-300', activeBg: 'active:bg-orange-200 dark:active:bg-orange-800' },
  red:    { bg: 'bg-red-50 dark:bg-red-900/30',        ring: 'ring-red-400',      text: 'text-red-700 dark:text-red-300',       activeBg: 'active:bg-red-200 dark:active:bg-red-800' },
  gray:   { bg: 'bg-gray-50 dark:bg-gray-700/50',      ring: 'ring-gray-400',    text: 'text-gray-700 dark:text-gray-300',     activeBg: 'active:bg-gray-200 dark:active:bg-gray-600' },
};

/** Clickable hit cell — tap to +1, long-press/right-click to -1 */
export default function HitCell({ value, color, onIncrement, onDecrement }: HitCellProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  const c = colorMap[color] || colorMap.gray;
  const hasValue = value > 0;

  const handlePointerDown = () => {
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onDecrement();
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressTriggered.current) {
      onIncrement();
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onDecrement();
  };

  return (
    <button
      className={`
        w-11 h-11 rounded-lg flex items-center justify-center font-mono text-xl font-bold
        transition-all select-none touch-manipulation cursor-pointer
        ${c.bg} ${c.text} ${c.activeBg}
        ${hasValue ? `ring-2 ${c.ring}` : 'ring-1 ring-gray-200 dark:ring-gray-600'}
      `}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onContextMenu={handleContextMenu}
    >
      {value}
    </button>
  );
}