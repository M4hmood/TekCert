import { HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { type Avatar, ONBOARDING_PROBLEM } from '@tekcert/types';
import { ProblemException } from '../common/exceptions/problem.exception';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
  type StoredObject,
} from '../storage/interfaces/object-storage';
import { avatarPath } from '../users/utils/avatar-path';
import { UsersService } from '../users/users.service';
import { avatarKey, processAvatar, sniffImageType } from './utils/avatar-image';

const invalidImage = (detail: string) =>
  new ProblemException({
    type: ONBOARDING_PROBLEM.invalidImage,
    title: 'Unsupported image',
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    detail,
  });

@Injectable()
export class AvatarsService {
  private readonly logger = new Logger(AvatarsService.name);

  constructor(
    private readonly users: UsersService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async replace(userId: string, bytes: Buffer): Promise<Avatar> {
    if (!sniffImageType(bytes)) throw invalidImage('Use a JPG or PNG image.');
    let processed;
    try {
      processed = await processAvatar(bytes);
    } catch {
      throw invalidImage('This image could not be read. Try another file.');
    }

    const key = avatarKey(userId, processed.hash);
    const previous = await this.users.avatarKeyOf(userId);
    await this.storage.put(key, processed.body, 'image/webp');
    await this.users.setAvatarKey(userId, key);
    if (previous && previous !== key) await this.deleteQuietly(previous);
    return { avatarPath: avatarPath(userId, key) };
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.users.avatarKeyOf(userId);
    if (!previous) return;
    await this.users.setAvatarKey(userId, null);
    await this.deleteQuietly(previous);
  }

  /**
   * Every profile is visible to signed-in students (decision 2026-10-29), so any signed-in caller
   * may load any photo. The route itself is not public.
   */
  async read(userId: string): Promise<StoredObject> {
    const key = await this.users.avatarKeyOf(userId);
    const object = key ? await this.storage.get(key) : null;
    if (!object) throw new NotFoundException('No profile photo');
    return object;
  }

  /** An orphaned object only wastes space; it must not fail the student's request. */
  private async deleteQuietly(key: string): Promise<void> {
    await this.storage.delete(key).catch((error: unknown) => {
      this.logger.warn({ err: error, key }, 'Could not delete an old profile photo');
    });
  }
}
