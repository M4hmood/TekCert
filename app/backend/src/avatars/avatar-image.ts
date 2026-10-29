import { createHash } from 'node:crypto';
import { AVATAR_SIZE } from '@tekcert/types';
import sharp from 'sharp';

export type AcceptedImageType = 'image/jpeg' | 'image/png';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/** Reads the file's magic bytes: the name and the browser's MIME type can't be trusted. */
export function sniffImageType(bytes: Buffer): AcceptedImageType | null {
  if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return 'image/png';
  if (bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return 'image/jpeg';
  return null;
}

/** Rejects decompression bombs: a 5 MB file can declare billions of pixels. */
const MAX_INPUT_PIXELS = 50_000_000;

export interface ProcessedAvatar {
  body: Buffer;
  /** Short content hash, used in the object key and as the cache-busting version. */
  hash: string;
}

/**
 * The browser already crops to a square; this re-crops from the centre as a safety net, applies
 * the EXIF orientation, resizes to 512×512 and re-encodes as WebP. Re-encoding drops every
 * metadata block (EXIF, GPS) and anything hidden after the image data.
 * Throws when the bytes aren't a decodable image.
 */
export async function processAvatar(bytes: Buffer): Promise<ProcessedAvatar> {
  const body = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toBuffer();
  return { body, hash: createHash('sha256').update(body).digest('hex').slice(0, 16) };
}

export function avatarKey(userId: string, hash: string): string {
  return `avatars/${userId}/${hash}.webp`;
}

/** The API path a browser loads the photo from; `v` changes whenever the photo does. */
export function avatarPath(userId: string, key: string | null): string | null {
  if (!key) return null;
  const version = key.slice(key.lastIndexOf('/') + 1).replace(/\.webp$/, '');
  return `/users/${userId}/avatar?v=${version}`;
}
