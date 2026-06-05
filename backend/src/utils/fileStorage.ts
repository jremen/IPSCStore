import { writeFile, unlink, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { env } from '../env.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `File type ${file.type} not allowed. Use JPEG, PNG, WebP, or GIF.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File exceeds 10MB limit.';
  }
  return null;
}

export async function saveUploadedFile(filename: string, data: ArrayBuffer): Promise<string> {
  const uploadDir = env.UPLOAD_DIR;
  await mkdir(uploadDir, { recursive: true });
  const filePath = join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(data));
  return filePath;
}

export async function deleteUploadedFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // File may already be deleted — ignore
  }
}