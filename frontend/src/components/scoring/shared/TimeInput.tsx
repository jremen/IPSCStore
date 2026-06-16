import { useState, useEffect, useCallback, useLayoutEffect, useRef } from 'react';
import { formatTimeDisplay, parseTimeString, formatTimeOnBlur } from '../../../utils/timeFormat';
import { useTranslation } from "react-i18next";

interface TimeInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
  /** Debounce delay in ms for the onChange callback. Default: 600ms */
  debounceMs?: number;
}

/**
 * Dedicated time input for IPSC scoring with smart decimal handling.
 *
 * Uses a single visible <input> with controlled value and explicit cursor
 * management via useLayoutEffect. When 4+ digits are entered, auto-inserts
 * a decimal point before the last 2 digits (e.g., "2520" → "25.20").
 * The cursor position is calculated based on how many digits precede it,
 * so it stays in the correct position after formatting transformations.
 *
 * The onChange callback is debounced so rapid typing doesn't trigger
 * full store updates on every keystroke. The local display updates
 * immediately for responsive typing feel.
 *
 * - Typing "2520" → display "25.20" on 4th digit
 * - Typing "11534" → "115.34" on 5th digit
 * - Typing "25.20" directly works
 * - Always shows 2 decimal places on blur
 */
export default function TimeInput({ value, onChange, disabled, className, debounceMs = 600 }: TimeInputProps) {
  const {t} = useTranslation();
  const [displayValue, setDisplayValue] = useState(() => formatTimeDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = useRef(false);
  // Track raw digits separately — never contains a dot
  const rawDigits = useRef('');
  // Track if the dot in the current display was auto-inserted (vs user-typed)
  const dotAutoInserted = useRef(false);
  // Debounce timer for onChange
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest parsed value to send on debounce flush
  const pendingValueRef = useRef<number | null>(value);
  // Desired cursor position to restore after render, or null to skip
  const pendingCursorRef = useRef<number | null>(null);

  // Sync external value changes (e.g., from reset) — only when not actively editing
  useEffect(() => {
    if (!isEditing.current) {
      setDisplayValue(formatTimeDisplay(value));
      rawDigits.current = '';
      dotAutoInserted.current = false;
      pendingValueRef.current = value;
    }
  }, [value]);

  // Restore cursor position after React re-renders the input with a new value.
  // useLayoutEffect runs synchronously after DOM mutations but before paint,
  // preventing visible cursor flicker when the formatted value differs from
  // what the user typed (e.g., auto-inserted decimal point).
  useLayoutEffect(() => {
    if (pendingCursorRef.current !== null && inputRef.current) {
      const pos = pendingCursorRef.current;
      pendingCursorRef.current = null;
      inputRef.current.setSelectionRange(pos, pos);
    }
  });

  // Flush any pending debounced onChange on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        onChange(pendingValueRef.current);
      }
    };
  }, [onChange]);

  const flushDebouncedOnChange = useCallback((parsed: number | null) => {
    pendingValueRef.current = parsed;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      onChange(pendingValueRef.current);
    }, debounceMs);
  }, [onChange, debounceMs]);

  /**
   * Calculate where the cursor should be in the formatted display string,
   * based on how many digits are before the cursor in the raw input.
   *
   * For formatted strings with a dot (4+ digits like "25.20"):
   *   - Digits in the seconds part → cursor at that count (before the dot)
   *   - Digits in the fractions part → cursor at count + 1 (after the dot)
   *
   * For raw digits (1-3 digits, no dot):
   *   - Cursor at the digit count position
   */
  const computeCursorPosition = (rawInput: string, cursorPosInRaw: number, digits: string): number => {
    // Count how many digit characters are before the cursor in the raw input
    const digitsBeforeCursor = rawInput.slice(0, cursorPosInRaw).replace(/[^0-9]/g, '').length;

    if (digits.length >= 4) {
      // Formatted as "SS.FF" — the dot sits between seconds and fractions
      const secondsCount = digits.length - 2;
      if (digitsBeforeCursor <= secondsCount) {
        // Cursor in seconds part — positioned before the dot
        return digitsBeforeCursor;
      } else {
        // Cursor in fractions part — add 1 for the dot character
        return digitsBeforeCursor + 1;
      }
    } else {
      // No dot in display, cursor position equals digit count before cursor
      return digitsBeforeCursor;
    }
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    // Allow empty input (clearing the field)
    if (raw === '') {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      onChange(null);
      return;
    }

    const cleaned = raw.replace(',', '.');

    // If user manually typed a dot (not auto-inserted)
    if (cleaned.includes('.') && !dotAutoInserted.current) {
      if (!/^-?\d*\.\d*$/.test(cleaned)) return;
      setDisplayValue(cleaned);
      rawDigits.current = '';
      const val = parseFloat(cleaned);
      flushDebouncedOnChange(isNaN(val) ? null : val);
      // Keep cursor where user placed it — no formatting transformation
      pendingCursorRef.current = cursorPos;
      return;
    }

    // Extract all digits from the input (strips auto-inserted dot too)
    const digits = cleaned.replace(/[^0-9]/g, '');
    if (!digits) {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      onChange(null);
      return;
    }

    rawDigits.current = digits;

    // Auto-format at 4+ digits: insert dot before last 2 digits
    if (digits.length >= 4) {
      const seconds = digits.slice(0, -2);
      const fractions = digits.slice(-2);
      const formatted = `${seconds}.${fractions}`;
      dotAutoInserted.current = true;

      const newCursorPos = computeCursorPosition(cleaned, cursorPos, digits);
      pendingCursorRef.current = newCursorPos;

      setDisplayValue(formatted);
      const parsed = parseFloat(formatted);
      flushDebouncedOnChange(isNaN(parsed) ? null : parsed);
    } else {
      // 1-3 digits: just show raw digits, no auto-format
      dotAutoInserted.current = false;
      pendingCursorRef.current = computeCursorPosition(cleaned, cursorPos, digits);
      setDisplayValue(digits);
      const val = parseFloat(digits);
      flushDebouncedOnChange(isNaN(val) ? null : val);
    }
  }, [flushDebouncedOnChange, onChange]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    pendingCursorRef.current = null;

    // Flush any pending debounced onChange immediately
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    dotAutoInserted.current = false;
    rawDigits.current = '';
    const formatted = formatTimeOnBlur(displayValue);
    setDisplayValue(formatted);
    const parsed = parseTimeString(formatted);
    pendingValueRef.current = parsed;
    onChange(parsed);
  }, [displayValue, onChange]);

  const handleFocus = useCallback(() => {
    isEditing.current = true;
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      disabled={disabled}
      autoComplete="off"
      placeholder={t('scoring.time')}
      className={`text-center text-4xl font-semibold font-mono w-full p-2
        rounded-lg border border-gray-300 bg-gray-50 text-gray-900
        focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-2
        dark:border-gray-600 dark:bg-gray-700 dark:text-white
        dark:focus:border-blue-500 dark:focus:ring-blue-500
        disabled:cursor-not-allowed disabled:opacity-50
        ${className ?? ''}`}
    />
  );
}
