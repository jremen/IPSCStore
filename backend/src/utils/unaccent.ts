import { sql } from '../db/client.js';

/** Check if the unaccent extension is available for diacritic-insensitive search */
let unaccentAvailable: boolean | null = null;

export async function isUnaccentAvailable(): Promise<boolean> {
  if (unaccentAvailable !== null) return unaccentAvailable;
  try {
    await sql`SELECT unaccent('test')`;
    unaccentAvailable = true;
  } catch {
    unaccentAvailable = false;
    console.log('[DB] unaccent extension not available, diacritic-insensitive search disabled');
  }
  return unaccentAvailable;
}