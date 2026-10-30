import { AVATAR_MAX_BYTES, AvatarSchema, ONBOARDING_PROBLEM } from '@tekcert/types';
import request from 'supertest';
import sharp from 'sharp';
import { createTestApp, signUpAndVerify, type TestApp } from './test-app';

/** A landscape photo; the JPEG carries EXIF and GPS data, as a phone would send it. */
function photo(format: 'png' | 'jpeg', width = 800, height = 600, red = 51): Promise<Buffer> {
  const image = sharp({
    create: { width, height, channels: 3, background: { r: red, g: 102, b: 153 } },
  });
  return format === 'png'
    ? image.png().toBuffer()
    : image
        .jpeg()
        .withExif({ IFD0: { Make: 'TestPhone' }, IFD3: { GPSLatitudeRef: 'N' } })
        .toBuffer();
}

/** Supertest only buffers known content types; read images as raw bytes. */
function binary(res: request.Response, done: (err: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
}

describe('Profile photos (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.app.close();
  });

  const upload = (agent: ReturnType<typeof request.agent>, bytes: Buffer, filename = 'me.png') =>
    agent.put('/me/avatar').attach('photo', bytes, filename);

  it('stores a 512×512 WebP without metadata and serves it to signed-in students', async () => {
    const owner = await signUpAndVerify(t);
    const res = await upload(owner.agent, await photo('jpeg'), 'me.jpg').expect(200);
    const { avatarPath } = AvatarSchema.parse(res.body);
    expect(avatarPath).toMatch(/^\/users\/[0-9a-f-]{36}\/avatar\?v=[0-9a-f]{16}$/);

    const me = await owner.agent.get('/auth/me').expect(200);
    expect(me.body.avatarPath).toBe(avatarPath);

    // Every profile is visible: another signed-in student can load it.
    const other = await signUpAndVerify(t);
    const served = await other.agent
      .get(avatarPath as string)
      .buffer(true)
      .parse(binary)
      .expect(200);
    expect(served.headers['content-type']).toBe('image/webp');
    expect(served.headers['cache-control']).toBe('private, max-age=86400');
    const meta = await sharp(served.body as Buffer).metadata();
    expect(meta).toMatchObject({ format: 'webp', width: 512, height: 512 });
    expect(meta.exif).toBeUndefined();
  });

  it('is not served to visitors', async () => {
    const owner = await signUpAndVerify(t);
    const { body } = await upload(owner.agent, await photo('png')).expect(200);
    await request(t.app.getHttpServer()).get(body.avatarPath).expect(401);
  });

  it('replaces the photo with a new version and removes it', async () => {
    const { agent } = await signUpAndVerify(t);
    const first = (await upload(agent, await photo('png', 400, 400)).expect(200)).body.avatarPath;
    const second = (await upload(agent, await photo('png', 300, 900, 200)).expect(200)).body
      .avatarPath;
    expect(second).not.toBe(first);

    await agent.delete('/me/avatar').expect(204);
    expect((await agent.get('/auth/me').expect(200)).body.avatarPath).toBeNull();
    await agent.get(second).expect(404);
  });

  it('refuses files over 5 MB', async () => {
    const { agent } = await signUpAndVerify(t);
    const tooBig = Buffer.concat([await photo('png'), Buffer.alloc(AVATAR_MAX_BYTES)]);
    await upload(agent, tooBig).expect(413);
  });

  it('checks the real file type, not the name', async () => {
    const { agent } = await signUpAndVerify(t);
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n');
    const res = await upload(agent, pdf, 'photo.png').expect(415);
    expect(res.body).toMatchObject({
      type: ONBOARDING_PROBLEM.invalidImage,
      detail: 'Use a JPG or PNG image.',
    });
  });

  it('refuses an image that cannot be decoded', async () => {
    const { agent } = await signUpAndVerify(t);
    const png = await photo('png');
    const res = await upload(agent, png.subarray(0, 64), 'broken.png').expect(415);
    expect(res.body.detail).toBe('This image could not be read. Try another file.');
  });

  it('needs the "photo" field', async () => {
    const { agent } = await signUpAndVerify(t);
    await agent.put('/me/avatar').expect(400);
  });

  it('answers 404 for a student without a photo', async () => {
    const { agent } = await signUpAndVerify(t);
    const me = await agent.get('/auth/me').expect(200);
    await agent.get(`/users/${me.body.id}/avatar`).expect(404);
  });
});
