import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data", "uploads");

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Normalise whatever the phone camera produced into a small webp.
 * Returns the path relative to UPLOAD_ROOT, which is what we store in Postgres.
 */
export async function saveImage(stallId: string, file: File): Promise<string> {
  if (!file || file.size === 0) throw new Error("No file");
  if (file.size > MAX_BYTES) throw new Error("Image is larger than 10 MB");
  if (!file.type.startsWith("image/")) throw new Error("Not an image");

  const input = Buffer.from(await file.arrayBuffer());
  const output = await sharp(input)
    .rotate() // respect EXIF orientation from phone cameras
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const relative = `${stallId}/${randomUUID()}.webp`;
  const absolute = path.join(UPLOAD_ROOT, relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, output);

  return relative;
}

export async function removeImage(relative: string): Promise<void> {
  // Only ever delete inside the upload root.
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9-]+\.webp$/.test(relative)) return;
  await unlink(path.join(UPLOAD_ROOT, relative)).catch(() => {});
}
