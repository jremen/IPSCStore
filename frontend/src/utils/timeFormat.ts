/**
 * Smart time format detection and formatting for IPSC scoring.
 *
 * Rules (user specification):
 * - "2520" → 25.20 (last 2 digits are always fractions)
 * - "11534" → 115.34
 * - "25.20" → 25.20 (already has the dot)
 * - "252" → does nothing (3 digits, waiting for fraction)
 * - Auto-detect during typing when 4+ digits with no dot
 * - Always show 2 decimal places on blur
 */

/**
 * Format user input during typing.
 * - 4+ digits with no dot → insert dot before last 2 digits
 * - Has a dot → leave alone
 * - <4 digits → leave alone
 */
export function formatTimeInput(raw: string): string {
  if (!raw || raw.trim() === '') return '';

  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return '';

  // If already has a decimal point, leave as-is
  if (cleaned.includes('.')) {
    return cleaned;
  }

  // 4+ digits without a dot: insert dot before last 2 digits
  if (cleaned.length >= 4) {
    const seconds = cleaned.slice(0, -2);
    const fractions = cleaned.slice(-2);
    return `${seconds}.${fractions}`;
  }

  return cleaned;
}

/**
 * Parse a time string (display format) into a number.
 * Handles both "25.20" and "2520" (auto-detected) formats.
 */
export function parseTimeString(raw: string): number | null {
  if (!raw || raw.trim() === '') return null;

  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;

  // If already has a decimal point, parse directly
  if (cleaned.includes('.')) {
    const val = parseFloat(cleaned);
    return isNaN(val) ? null : val;
  }

  // Pure digits: auto-detect if 4+ digits
  if (cleaned.length >= 4) {
    const seconds = cleaned.slice(0, -2);
    const fractions = cleaned.slice(-2);
    const val = parseFloat(`${seconds}.${fractions}`);
    return isNaN(val) ? null : val;
  }

  // 1-3 digits: treat as whole seconds
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

/**
 * Format a numeric time value for display.
 * Always shows exactly 2 decimal places.
 */
export function formatTimeDisplay(time: number | null): string {
  if (time === null || time === undefined) return '';
  // API can return time as a string (e.g., "25.20"), coerce to number
  const num = typeof time === 'string' ? parseFloat(time) : time;
  return isNaN(num) ? '' : num.toFixed(2);
}

/**
 * Final formatting on blur: ensure 2 decimal places.
 */
export function formatTimeOnBlur(raw: string): string {
  if (!raw || raw.trim() === '') return '';
  const val = parseTimeString(raw);
  if (val === null) return '';
  return val.toFixed(2);
}