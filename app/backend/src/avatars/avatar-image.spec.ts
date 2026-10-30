import sharp from 'sharp';
import { avatarKey, avatarPath, processAvatar, sniffImageType } from './avatar-image';

describe('sniffImageType', () => {
  it('recognises PNG and JPEG from their magic bytes', async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: '#000' } });
    expect(sniffImageType(await base.clone().png().toBuffer())).toBe('image/png');
    expect(sniffImageType(await base.clone().jpeg().toBuffer())).toBe('image/jpeg');
  });

  it.each([
    ['a PDF', Buffer.from('%PDF-1.7')],
    ['a GIF', Buffer.from('GIF89a')],
    ['a WebP', Buffer.from('RIFF\0\0\0\0WEBP')],
    ['an empty file', Buffer.alloc(0)],
  ])('rejects %s', (_, bytes) => {
    expect(sniffImageType(bytes)).toBeNull();
  });
});

describe('processAvatar', () => {
  it('crops a portrait photo to a 512×512 square', async () => {
    const portrait = await sharp({
      create: { width: 300, height: 900, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();
    const { body, hash } = await processAvatar(portrait);
    expect(await sharp(body).metadata()).toMatchObject({ format: 'webp', width: 512, height: 512 });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('fails on bytes that only look like an image', async () => {
    await expect(processAvatar(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).rejects.toThrow();
  });
});

describe('avatar keys and paths', () => {
  it('versions the API path with the content hash', () => {
    const key = avatarKey('user-1', '0123456789abcdef');
    expect(key).toBe('avatars/user-1/0123456789abcdef.webp');
    expect(avatarPath('user-1', key)).toBe('/users/user-1/avatar?v=0123456789abcdef');
    expect(avatarPath('user-1', null)).toBeNull();
  });
});
