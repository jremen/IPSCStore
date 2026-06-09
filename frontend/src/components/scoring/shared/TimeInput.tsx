import { useState, useEffect, useCallback, useRef } from 'react';
import { formatTimeDisplay, parseTimeString, formatTimeOnBlur } from '../../../utils/timeFormat';

interface TimeInputProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Dedicated time input for IPSC scoring with smart decimal handling.
 *
 * Tracks "raw digits" (no dot) separately from display. When raw digits
 * reach 4+, auto-inserts dot in display. This way, if user keeps typing
 * after auto-format (e.g. "1153" → "11.53" then "4"), we re-extract the
 * digits ("11534") and re-format correctly ("115.34").
 *
 * - Typing "2520" → display "25.20" on 4th digit
 * - Typing "11534" → "11.53" on 4th digit, then "115.34" on 5th digit
 * - Typing "25.20" directly works
 * - Always shows 2 decimal places on blur
 */
export default function TimeInput({ value, onChange, disabled, className }: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatTimeDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = useRef(false);
  // Track raw digits separately — never contains a dot
  const rawDigits = useRef('');
  // Track if the dot in the current display was auto-inserted (vs user-typed)
  const dotAutoInserted = useRef(false);

  // Sync external value changes (e.g., from reset) — only when not actively editing
  useEffect(() => {
    if (!isEditing.current) {
      setDisplayValue(formatTimeDisplay(value));
      rawDigits.current = '';
      dotAutoInserted.current = false;
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    // Allow empty input (clearing the field)
    if (raw === '') {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      onChange(null);
      return;
    }

    const cleaned = raw.replace(',', '.');

    // If user manually typed a dot (not auto-inserted)
    if (cleaned.includes('.') && !dotAutoInserted.current) {
      // Validate and let user type freely with their own dot
      if (!/^-?\d*\.\d*$/.test(cleaned)) return;
      setDisplayValue(cleaned);
      rawDigits.current = ''; // clear raw digits tracking
      const val = parseFloat(cleaned);
      onChange(isNaN(val) ? null : val);
      return;
    }

    // Extract all digits from the input (strips auto-inserted dot too)
    const digits = cleaned.replace(/[^0-9]/g, '');
    if (!digits) {
      setDisplayValue('');
      rawDigits.current = '';
      dotAutoInserted.current = false;
      onChange(null);
      return;
    }

    // Update raw digits buffer
    rawDigits.current = digits;

    // Auto-format at 4+ digits: insert dot before last 2 digits
    if (digits.length >= 4) {
      const seconds = digits.slice(0, -2);
      const fractions = digits.slice(-2);
      const formatted = `${seconds}.${fractions}`;
      dotAutoInserted.current = true;
      setDisplayValue(formatted);

      // Cursor adjustment: if dot was just inserted (transition from 3→4 digits)
      // shift cursor right by 1 to account for the inserted dot
      let newCursorPos = cursorPos;
      if (!cleaned.includes('.') || digits.length === 4) {
        // Dot just appeared — shift cursor
        newCursorPos = cursorPos + 1;
      }
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      });

      const parsed = parseFloat(formatted);
      onChange(isNaN(parsed) ? null : parsed);
    } else {
      // 1-3 digits: just show raw digits, no auto-format
      dotAutoInserted.current = false;
      setDisplayValue(digits);
      const val = parseFloat(digits);
      onChange(isNaN(val) ? null : val);
    }
  }, [onChange]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    dotAutoInserted.current = false;
    rawDigits.current = '';
    const formatted = formatTimeOnBlur(displayValue);
    setDisplayValue(formatted);
    const parsed = parseTimeString(formatted);
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
      className={`block w-full text-center text-4xl font-semibold font-mono p-1
        rounded-lg border border-gray-300 bg-gray-50 text-gray-900
        focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600
        dark:bg-gray-700 dark:text-white dark:focus:border-blue-500
        dark:focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50
        ${className ?? ''}`}
    />
  );
}