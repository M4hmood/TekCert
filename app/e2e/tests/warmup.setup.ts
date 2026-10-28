import { expect, test as setup } from '@playwright/test';

/**
 * Runs once before the browser projects. The first read of each freshly bundled file can be very
 * slow (on Windows the virus scanner checks new files), which made the first wave of tests time
 * out. Fetching every asset of the sign-in page once makes the run deterministic.
 */
setup('warm up the servers', async ({ request }) => {
  setup.setTimeout(180_000);

  const html = await (await request.get('/sign-in')).text();
  const assets = new Set(
    [...html.matchAll(/(?:href|src)="(\/(?:_next|badges)\/[^"]+)"/g)].map((m) =>
      (m[1] ?? '').replaceAll('&amp;', '&'),
    ),
  );
  for (const asset of [...assets]) {
    const res = await request.get(asset);
    expect(res.ok(), asset).toBe(true);
    // Fonts and icons are referenced from the stylesheets, not the HTML.
    if (asset.endsWith('.css')) {
      for (const [, font] of (await res.text()).matchAll(
        /url\((\/_next\/static\/media\/[^)]+)\)/g,
      )) {
        if (font) assets.add(font);
      }
    }
  }
  for (const asset of assets) await request.get(asset);

  // The /api proxy route and the API itself.
  expect((await request.get('/api/health')).ok()).toBe(true);
});
