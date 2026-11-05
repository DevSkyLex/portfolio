import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

test('serves fresh published HTML and sitemap without rebuilding the SSR application', async ({
  request,
}: {
  request: APIRequestContext;
}): Promise<void> => {
  test.skip(
    Boolean(process.env['BASE_URL']),
    'Mutable fixtures belong to the isolated SSR harness.',
  );
  await request.post('/__e2e/snapshot');
  try {
    const missing: APIResponse = await request.get('/fr/projects/runtime-publication');
    expect(missing.status()).toBe(404);
    expect(await (await request.get('/sitemap.xml')).text()).not.toContain(
      '/projects/runtime-publication',
    );
    await request.post('/__e2e/snapshot?changed=1');
    for (const locale of ['fr', 'en']) {
      const response: APIResponse = await request.get(`/${locale}/projects/runtime-publication`);
      expect(response.status()).toBe(200);
      const html: string = await response.text();
      expect(html).toContain('Runtime publication');
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain(`https://valentin-fortin.pro/${locale}/projects/runtime-publication`);
      expect(html).toMatch(/rel="canonical"/);
      expect(html).toMatch(/hreflang="fr"/);
      expect(html).toMatch(/hreflang="en"/);
    }
    expect(await (await request.get('/sitemap.xml')).text()).toContain(
      '/fr/projects/runtime-publication',
    );
    const admin: string = await (await request.get('/fr/admin/login')).text();
    expect(admin).not.toContain('Runtime publication');
  } finally {
    await request.post('/__e2e/snapshot');
  }
});
