import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

/** argon2id with the OWASP baseline: 19 MiB memory, 2 iterations, 1 lane. */
const OPTIONS = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class PasswordService {
  /** Compared against when the email is unknown, so both paths take the same time. */
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string | undefined, password: string): Promise<boolean> {
    if (!passwordHash) {
      this.dummyHash ??= this.hash('not-a-real-password-1!');
      await verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return verify(passwordHash, password).catch(() => false);
  }
}
