import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Locator,
  type Page,
} from '@playwright/test';
import { chooseFooterOption } from '@internal/web-e2e/support/site';

test('serves and hydrates a fresh article without rebuilding the SSR application', async ({
  request,
  page,
}: {
  request: APIRequestContext;
  page: Page;
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
      expect(html).toContain('flowchart LR');
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

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/fr/projects/runtime-publication');
    const diagram: Locator = page.getByRole('img', {
      name: 'The browser sends a request to the API.',
    });
    await expect
      .poll((): Promise<boolean> =>
        diagram.evaluate(
          (image: HTMLImageElement): boolean => image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(diagram).toHaveAttribute('src', /%239b6dff/);
    await expect(page.getByText('Invalid diagram source', { exact: true })).toBeVisible();
    await chooseFooterOption(page, 'Thème', 'Clair');
    await expect(diagram).toHaveAttribute('src', /%236a3fe6/);

    const heading: string = 'Architecture and responsibilities of the published application';
    const toc: Locator = page.getByRole('navigation', { name: 'Sommaire' });
    const link: Locator = toc.getByRole('link', { name: heading });
    const label: Locator = link.getByText(heading);
    await expect(label).toHaveCSS('white-space', 'nowrap');
    await expect(label).toHaveCSS('text-overflow', 'ellipsis');
    expect(
      await label.evaluate(
        (element: HTMLElement): boolean => element.scrollWidth > element.clientWidth,
      ),
    ).toBe(true);
    await link.click();
    await expect(page).toHaveURL(
      /#architecture-and-responsibilities-of-the-published-application$/,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(toc).toBeHidden();
    await expect(diagram).toBeVisible();
    expect(
      await diagram.evaluate((image: HTMLImageElement): number => image.clientWidth),
    ).toBeLessThan(390);
    await chooseFooterOption(page, 'Thème', 'Sombre');
    await expect(diagram).toHaveAttribute('src', /%239b6dff/);
  } finally {
    await request.post('/__e2e/snapshot');
  }
});
