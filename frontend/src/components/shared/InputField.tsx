import { Label } from 'flowbite-react';
import { forwardRef, memo, useCallback } from 'react';
import { TbChevronDown, TbChevronUp } from 'react-icons/tb';

interface InputFieldProps {
  id?: string;
  label?: string;
  value: string | number;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  type?: 'text' | 'number';
  step?: string;
  min?: string;
  max?: string;
  unit?: string;
  required?: boolean;
  placeholder?: string;
  sizing?: 'xs' | 'sm' | 'md' | 'lg';
  color?: 'failure' | 'warning' | 'success';
  disabled?: boolean;
  /** Extra CSS classes applied to the <input> element */
  className?: string;
  /** Use text input with decimal keyboard. Fixes locale-dependent decimal separator issues in type="number". */
  decimal?: boolean;
}

export const InputField = memo(
  forwardRef<HTMLInputElement, InputFieldProps>(
    (
      {
        id,
        label,
        value,
        onChange,
        onBlur,
        onKeyDown,
        type = 'number',
        step = '0.01',
        min,
        max,
        unit,
        required,
        placeholder,
        sizing = 'sm',
        color,
        disabled,
        className,
        decimal = false,
      },
      ref,
    ) => {
      const stepNum = parseFloat(step) || 0.01;

      const increment = useCallback(() => {
        const n = parseFloat(String(value)) || 0;
        const next = parseFloat((n + stepNum).toFixed(10));
        const maxNum = max !== undefined ? parseFloat(max) : Infinity;
        onChange(String(Math.min(next, maxNum)));
      }, [value, stepNum, max, onChange]);

      const decrement = useCallback(() => {
        const n = parseFloat(String(value)) || 0;
        const next = parseFloat((n - stepNum).toFixed(10));
        const minNum = min !== undefined ? parseFloat(min) : -Infinity;
        onChange(String(Math.max(next, minNum)));
      }, [value, stepNum, min, onChange]);

      const sizeClass =
        sizing === 'lg'
          ? 'p-4 pr-7'
          : sizing === 'md'
            ? 'p-2.5 pr-7'
            : sizing === 'sm'
              ? 'p-2 pr-7'
              : /* xs */ 'py-0.5 px-1.5 pr-6 text-xs';

      let colorClass: string;
      if (color === 'failure') {
        colorClass =
          'border-red-500 bg-red-50 text-red-900 placeholder-red-400 focus:border-red-500 focus:ring-red-500 dark:bg-red-100 dark:border-red-400 dark:text-red-900';
      } else if (color === 'warning') {
        colorClass =
          'border-yellow-400 bg-yellow-50 text-yellow-900 placeholder-yellow-400 focus:border-yellow-400 focus:ring-yellow-400';
      } else {
        colorClass =
          'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500';
      }

      const spinnerBorderClass =
        color === 'failure'
          ? 'border-red-400 dark:border-red-400'
          : color === 'warning'
            ? 'border-yellow-400'
            : 'border-gray-300 dark:border-gray-600';

      return (
        <div>
          {(label || unit) && (
            <div className="mb-1 flex items-center justify-between">
              {label && (
                <Label htmlFor={id} className="text-sm">
                  {label}
                </Label>
              )}
              {unit && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {unit}
                </span>
              )}
            </div>
          )}
          <div className="relative">
            <input
              ref={ref}
              id={id}
              type={decimal ? 'text' : type}
              inputMode={decimal ? 'decimal' : undefined}
              step={type === 'number' && !decimal ? step : undefined}
              min={type === 'number' && !decimal ? min : undefined}
              max={type === 'number' && !decimal ? max : undefined}
              value={value}
              onChange={(e) => {
                const v = e.target.value;
                if (
                  decimal &&
                  v !== '' &&
                  v !== '-' &&
                  !/^-?\d*([.,]\d*)?$/.test(v)
                )
                  return;
                onChange(decimal ? v.replace(/,/g, '.') : v);
              }}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
              required={required}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              className={`block w-full [appearance:textfield] rounded-lg border text-sm focus:ring-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${sizeClass} ${colorClass} ${className ?? ''}`}
            />
            {type === 'number' && !decimal && (
              <div
                className={`absolute top-0 right-0 flex h-full flex-col border-l ${spinnerBorderClass}`}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={increment}
                  disabled={disabled}
                  className="flex flex-1 items-center justify-center px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                >
                  <TbChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={decrement}
                  disabled={disabled}
                  className={`flex flex-1 items-center justify-center border-t px-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200 ${spinnerBorderClass}`}
                >
                  <TbChevronDown className="size-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    },
  ),
);

InputField.displayName = 'InputField';
