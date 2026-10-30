import { HttpStatus, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type Avatar, ONBOARDING_PROBLEM } from '@tekcert/types';
import type { Repository } from 'typeorm';
import { ProblemException } from '../common/problem.exception';
import { User } from '../database/entities';
import { OBJECT_STORAGE, type ObjectStorage, type StoredObject } from '../storage/object-storage';
import { avatarKey, avatarPath, processAvatar, sniffImageType } from './avatar-image';

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
    @InjectRepository(User) private readonly users: Repository<User>,
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
    const previous = await this.currentKey(userId);
    await this.storage.put(key, processed.body, 'image/webp');
    await this.users.update({ id: userId }, { avatarKey: key });
    if (previous && previous !== key) await this.deleteQuietly(previous);
    return { avatarPath: avatarPath(userId, key) };
  }

  async remove(userId: string): Promise<void> {
    const previous = await this.currentKey(userId);
    if (!previous) return;
    await this.users.update({ id: userId }, { avatarKey: null });
    await this.deleteQuietly(previous);
  }

  /**
   * Every profile is visible to signed-in students (decision 2026-10-29), so any signed-in caller
   * may load any photo. The route itself is not public.
   */
  async read(userId: string): Promise<StoredObject> {
    const key = await this.currentKey(userId);
    const object = key ? await this.storage.get(key) : null;
    if (!object) throw new NotFoundException('No profile photo');
    return object;
  }

  private async currentKey(userId: string): Promise<string | null> {
    const user = await this.users.findOne({
      where: { id: userId },
      select: { id: true, avatarKey: true },
    });
    return user?.avatarKey ?? null;
  }

  /** An orphaned object only wastes space; it must not fail the student's request. */
  private async deleteQuietly(key: string): Promise<void> {
    await this.storage.delete(key).catch((error: unknown) => {
      this.logger.warn({ err: error, key }, 'Could not delete an old profile photo');
    });
  }
}
