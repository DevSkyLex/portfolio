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
  readonly subtleBorders: boolean;
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
      'position:fixed;left:-10000px;visibility:hidden;color:var(--surface-raised);border-color:var(--border)';
    probe.append(svg);
    document.body.append(probe);
    try {
      const node: Element | null = svg.querySelector('.node rect.label-container');
      const edge: Element | null = svg.querySelector('.flowchart-link');
      const tip: Element | null = svg.querySelector('marker[id$="-pointEnd"] .arrowMarkerPath');
      const figure: HTMLElement | null = image.closest('figure');
      if (!node || !edge || !tip || !figure) throw new Error('Missing flowchart shape');
      const nodeStyle: CSSStyleDeclaration = getComputedStyle(node);
      const radius: string = getComputedStyle(document.documentElement)
        .getPropertyValue('--radius-xl')
        .trim();
      return {
        raisedNodes: nodeStyle.fill === getComputedStyle(probe).color,
        roundedNodes: nodeStyle.getPropertyValue('rx') === radius,
        subtleBorders: nodeStyle.stroke === getComputedStyle(probe).borderTopColor,
        shadowless:
          nodeStyle.filter === 'none' &&
          getComputedStyle(node.parentElement ?? node).filter === 'none' &&
          getComputedStyle(figure).boxShadow === 'none',
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
  subtleBorders: true,
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
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((): void => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (source: string): Promise<void> => {
            sessionStorage.setItem('test-mermaid-source', source);
            return Promise.resolve();
          },
        },
      });
    });
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
    const smallFigure: Locator = page.getByRole('figure').filter({ has: diagram });
    expect(
      await smallFigure.evaluate((figure: HTMLElement): number =>
        Math.abs(
          figure.getBoundingClientRect().width - (figure.closest('article')?.clientWidth ?? 0),
        ),
      ),
    ).toBeLessThan(1);
    const smallControls: Locator = smallFigure.getByRole('group', { name: 'Commandes du schéma' });
    await expect(smallControls.getByRole('button')).toHaveCount(7);
    await expect(smallControls.getByRole('button', { name: 'Vers la droite' })).toBeDisabled();
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
    const largeViewport: Locator = page.getByRole('region', {
      name: 'A wide and tall validation pipeline.',
    });
    const largeFigure: Locator = page.getByRole('figure').filter({ has: largeViewport });
    const controls: Locator = largeFigure.getByRole('group', { name: 'Commandes du schéma' });
    const left: Locator = controls.getByRole('button', { name: 'Vers la gauche' });
    const right: Locator = controls.getByRole('button', { name: 'Vers la droite' });
    const up: Locator = controls.getByRole('button', { name: 'Vers le haut' });
    const down: Locator = controls.getByRole('button', { name: 'Vers le bas' });
    await expect(left).toBeDisabled();
    await expect(up).toBeDisabled();
    await expect(right).toBeEnabled();
    await expect(down).toBeEnabled();
    await expect(largeViewport).toHaveAttribute('tabindex', '0');
    await right.press('Enter');
    await expect(left).toBeEnabled();
    await down.click();
    await expect(up).toBeEnabled();
    expect(
      await largeViewport.evaluate(
        (viewport: HTMLElement): boolean => viewport.scrollLeft > 0 && viewport.scrollTop > 0,
      ),
    ).toBe(true);
    expect(
      await largeFigure.evaluate((figure: HTMLElement): boolean => {
        const article: HTMLElement | null = figure.closest('article');
        return !!article && figure.offsetWidth === article.clientWidth;
      }),
    ).toBe(true);

    expect(
      await controls.evaluate((panel: HTMLElement): boolean => {
        const figure: HTMLElement | null = panel.closest('figure');
        if (!figure) return false;
        const frame: DOMRect = figure.getBoundingClientRect();
        const overlay: DOMRect = panel.getBoundingClientRect();
        return frame.bottom - overlay.bottom < 12 && frame.right - overlay.right < 12;
      }),
    ).toBe(true);

    const largeImage: Locator = largeViewport.getByRole('img');
    const originalWidth: number = await largeImage.evaluate(
      (image: HTMLImageElement): number => image.clientWidth,
    );
    await controls.getByRole('button', { name: 'Zoom avant' }).click();
    await expect
      .poll(() => largeImage.evaluate((image: HTMLImageElement): number => image.clientWidth))
      .toBeGreaterThan(originalWidth);
    await controls.getByRole('button', { name: 'Zoom arrière' }).click();
    await expect
      .poll(() => largeImage.evaluate((image: HTMLImageElement): number => image.clientWidth))
      .toBe(originalWidth);
    await controls.getByRole('button', { name: 'Réinitialiser la vue' }).click();
    await expect
      .poll(() =>
        largeViewport.evaluate(
          (viewport: HTMLElement): number => viewport.scrollLeft + viewport.scrollTop,
        ),
      )
      .toBe(0);

    await largeFigure.getByRole('button', { name: 'Copier le code Mermaid' }).click();
    await expect(largeFigure.getByRole('status')).toHaveText('Code copié');
    expect(await page.evaluate(() => sessionStorage.getItem('test-mermaid-source'))).toContain(
      'Start --> Queue --> Check',
    );
    const expand: Locator = largeFigure.getByRole('button', { name: 'Agrandir le schéma' });
    await expand.press('Enter');
    const dialog: Locator = page.getByRole('dialog', {
      name: 'A wide and tall validation pipeline.',
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole('group', { name: 'Commandes du schéma' }).getByRole('button'),
    ).toHaveCount(7);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(expand).toBeFocused();

    await chooseFooterOption(page, 'Thème', 'Sombre');
    await expect(diagram).toHaveAttribute('src', /%23131316/);
  } finally {
    await request.post('/__e2e/snapshot');
  }
});
