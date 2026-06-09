/** Stepper UI for penalty counts — + / − buttons around a value */
export default function PenaltyStepper({
  value,
  onDecrement,
  onIncrement,
  size = 'md',
  color = 'orange',
  disabled = false,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'orange' | 'purple' | 'red';
  disabled?: boolean;
}) {
  const sizeClasses = {
    sm: { wrapper: 'gap-1', button: 'text-sm', value: 'w-8 text-sm', minusBg: '', plusBg: '' },
    md: { wrapper: 'gap-2', button: 'text-lg', value: 'w-10 text-2xl', minusBg: '', plusBg: '' },
    lg: { wrapper: 'gap-2', button: 'text-lg', value: 'w-10 text-2xl', minusBg: '', plusBg: '' },
  };

  const colorClasses = {
    orange: { value: 'text-orange-700 dark:text-orange-300', plusBg: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 active:bg-orange-200' },
    purple: { value: 'text-purple-700 dark:text-purple-300', plusBg: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 active:bg-purple-200' },
    red: { value: 'text-red-700 dark:text-red-300', plusBg: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 active:bg-red-200' },
  };

  const s = sizeClasses[size];
  const c = colorClasses[color];

  return (
    <div className={`flex items-center ${s.wrapper}`}>
      <button
        className={`penalty-stepper rounded ${s.button} font-bold bg-gray-200 dark:bg-gray-600 active:bg-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={disabled ? undefined : onDecrement}
        disabled={disabled}
      >−</button>
      <span className={`${s.value} text-center font-mono font-bold ${c.value}`}>{value}</span>
      <button
        className={`penalty-stepper rounded ${s.button} font-bold ${c.plusBg} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={disabled ? undefined : onIncrement}
        disabled={disabled}
      >+</button>
    </div>
  );
}
