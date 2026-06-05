import postgres from 'postgres';
import { env } from '../env.js';

export const sql = postgres(env.DATABASE_URL);

export async function closeDb() {
  await sql.end();
}