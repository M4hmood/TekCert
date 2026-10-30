import type { Readable } from 'node:stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface StoredObject {
  body: Readable;
  contentType: string | undefined;
}

/** A private bucket. Objects only reach browsers through the API, which checks access first. */
export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /** Null when the object doesn't exist. */
  get(key: string): Promise<StoredObject | null>;
  /** Deleting a missing object is not an error. */
  delete(key: string): Promise<void>;
}
