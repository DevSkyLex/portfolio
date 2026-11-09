import {
  expect,
  test,
  type APIRequestContext,
  type APIResponse,
  type Locator,
  type Page,
} from '@playwright/test';
import { chooseFooterOption } from '@internal/web-e2e/support/site';

interface FlowchartAppearance {
  readonly raisedNodes: boolean;
  readonly roundedNodes: boolean;
  readonly shadowless: boolean;
  readonly roundedConnectors: boolean;
  readonly compactArrowheads: boolean;
}

/** Measures the generated SVG's styles in the browser without changing the displayed image. */
function flowchartAppearance(diagram: Locator): Promise<FlowchartAppearance> {
  return diagram.evaluate((image: HTMLImageElement): FlowchartAppearance => {
    const markup: string = decodeURIComponent(image.src.slice(image.src.indexOf(',') + 1));
    const parsed: Document = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const svg: Element = document.importNode(parsed.documentElement, true);
    const probe: HTMLDivElement = document.createElement('div');
    // SVG transforms need layout in Chromium and WebKit even when the probe is off-screen.
    probe.style.cssText =
      'position:fixed;left:-10000px;visibility:hidden;color:var(--surface-raised)';
    probe.append(svg);
    document.body.append(probe);
    try {
      const node: Element | null = svg.querySelector('.node rect.label-container');
      const edge: Element | null = svg.querySelector('.flowchart-link');
      const tip: Element | null = svg.querySelector('marker[id$="-pointEnd"] .arrowMarkerPath');
      if (!node || !edge || !tip || !image.parentElement)
        throw new Error('Missing flowchart shape');
      const nodeStyle: CSSStyleDeclaration = getComputedStyle(node);
      const radius: string = getComputedStyle(document.documentElement)
        .getPropertyValue('--radius-xl')
        .trim();
      return {
        raisedNodes: nodeStyle.fill === getComputedStyle(probe).color,
        roundedNodes: nodeStyle.getPropertyValue('rx') === radius,
        shadowless:
          nodeStyle.filter === 'none' &&
          getComputedStyle(node.parentElement ?? node).filter === 'none' &&
          getComputedStyle(image.parentElement).boxShadow === 'none',
        roundedConnectors: getComputedStyle(edge).strokeLinecap === 'round',
        compactArrowheads: getComputedStyle(tip).transform !== 'none',
      };
    } finally {
      probe.remove();
    }
  });
}

const ORBITE_FLOWCHART: FlowchartAppearance = {
  raisedNodes: true,
  roundedNodes: true,
  shadowless: true,
  roundedConnectors: true,
  compactArrowheads: true,
};

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
    await expect(diagram).toHaveAttribute('src', /%23131316/);
    expect(await flowchartAppearance(diagram)).toEqual(ORBITE_FLOWCHART);
    await expect(page.getByText('Invalid diagram source', { exact: true })).toBeVisible();
    await chooseFooterOption(page, 'Thème', 'Clair');
    await expect(diagram).toHaveAttribute('src', /%23f6f6f7/);
    expect(await flowchartAppearance(diagram)).toEqual(ORBITE_FLOWCHART);

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
    await expect(diagram).toHaveAttribute('src', /%23131316/);
  } finally {
    await request.post('/__e2e/snapshot');
  }
});
