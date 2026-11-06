import AxeBuilder from '@axe-core/playwright';
import {
  type BrowserContext,
  type Locator,
  type Page,
  type Route,
  expect,
  test,
} from '@playwright/test';

/**
 * Constant GOOGLE
 *
 * @description
 * Every Google tag and collection host (D48). The tests answer them locally: nothing leaves the
 * machine, and the list of requests proves when the site contacts Google.
 */
const GOOGLE: RegExp =
  /^https:\/\/(?:[a-z0-9-]+\.)*(?:googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)\//;

/**
 * Constant MEASUREMENT_ID
 *
 * @description
 * Placeholder measurement id of the browser-test build (`apps/web/src/environments/audience-measurement.e2e.ts`).
 */
const MEASUREMENT_ID: string = 'G-E2ETEST000';

/**
 * Function watchGoogle
 *
 * @description
 * Answers the Google hosts with an empty script and records their requests.
 *
 * @param {Page} page - Browser page.
 * @returns {Promise<string[]>} Requested URLs, filled as the page runs.
 */
async function watchGoogle(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(GOOGLE, async (route: Route): Promise<void> => {
    requested.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  });
  return requested;
}

/**
 * Function commands
 *
 * @description
 * Reads the Google tag queue as plain arrays (`['consent', 'default', {…}]`).
 *
 * @param {Page} page - Browser page.
 * @returns {Promise<unknown[][]>} Queued commands.
 */
function commands(page: Page): Promise<unknown[][]> {
  return page.evaluate((): unknown[][] =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map(
      (entry: ArrayLike<unknown>): unknown[] => Array.from(entry),
    ),
  );
}

/**
 * Function banner
 *
 * @description
 * Locates the consent banner: the « Cookies » region holding the choice buttons (the privacy
 * policy has a « Cookies » section too).
 *
 * @param {Page} page - Browser page.
 * @returns {Locator} Banner.
 */
function banner(page: Page): Locator {
  return page
    .getByRole('region', { name: 'Cookies' })
    .filter({ has: page.getByRole('button', { name: 'Tout refuser' }) });
}

/**
 * Function seriousViolations
 *
 * @description
 * Runs axe (WCAG 2 A and AA) and lists the serious and critical violations.
 *
 * @param {Page} page - Browser page.
 * @returns {Promise<string[]>} Violations.
 */
async function seriousViolations(page: Page): Promise<string[]> {
  const results: Awaited<ReturnType<AxeBuilder['analyze']>> = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  return results.violations
    .filter(
      (v: (typeof results.violations)[number]): boolean =>
        v.impact === 'serious' || v.impact === 'critical',
    )
    .map(
      (v: (typeof results.violations)[number]): string => `${v.id} (${v.nodes.length}): ${v.help}`,
    );
}

/**
 * Function storeChoice
 *
 * @description
 * Stores a cookie choice before the page scripts run.
 *
 * @param {Page} page - Browser page.
 * @param {boolean} analytics - Accepted measurement.
 * @param {string} decidedAt - ISO time of the choice.
 * @returns {Promise<void>} Completion.
 */
async function storeChoice(page: Page, analytics: boolean, decidedAt: string): Promise<void> {
  await page.addInitScript(
    (record: string): void => {
      if (localStorage.getItem('cookie-consent') === null)
        localStorage.setItem('cookie-consent', record);
    },
    JSON.stringify({ version: 1, analytics, decidedAt }),
  );
}

test.describe('cookie consent', (): void => {
  // Every other spec starts with a stored refusal (playwright.config.mts); these start without one.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('the banner appears after hydration only, and passes axe', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const prerendered: string = await (await page.request.get('/')).text();
    expect(prerendered).not.toContain('Tout refuser');
    const google: string[] = await watchGoogle(page);
    await page.goto('/');
    const region: Locator = banner(page);
    await expect(region).toBeVisible();
    await expect(region.getByRole('button', { name: 'Tout refuser' })).toBeVisible();
    await expect(region.getByRole('button', { name: 'Tout accepter' })).toBeVisible();
    await expect(region.getByRole('button', { name: 'Personnaliser' })).toBeVisible();
    await expect(
      region.getByRole('link', { name: 'Politique de confidentialité' }),
    ).toHaveAttribute('href', '/fr/privacy');
    expect(await seriousViolations(page)).toEqual([]);
    expect(google).toEqual([]);
  });

  test('refusing contacts no Google host, now or later, and is remembered', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const google: string[] = await watchGoogle(page);
    await page.goto('/');
    const region: Locator = banner(page);
    // Keyboard activation (WebKit does not focus a clicked button).
    await region.getByRole('button', { name: 'Tout refuser' }).focus();
    await page.keyboard.press('Enter');
    await expect(region).toBeHidden();
    // The control that had focus is gone: focus moves to the main content.
    await expect(page.locator('main#content')).toBeFocused();
    const stored: string | null = await page.evaluate((): string | null =>
      localStorage.getItem('cookie-consent'),
    );
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ version: 1, analytics: false });
    await page.goto('/projects/library-trails');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parcours de lecture');
    await expect(banner(page)).toHaveCount(0);
    expect(google).toEqual([]);
    expect(await commands(page)).toEqual([]);
  });

  test('accepting loads the Google tag with Consent Mode v2 and reports page views', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const google: string[] = await watchGoogle(page);
    await page.goto('/');
    expect(google).toEqual([]);
    const tag: Promise<unknown> = page.waitForRequest(
      `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
    );
    await page
      .getByRole('region', { name: 'Cookies' })
      .getByRole('button', { name: 'Tout accepter' })
      .click();
    await tag;
    await expect
      .poll(async (): Promise<unknown[][]> => commands(page))
      .toContainEqual([
        'event',
        'page_view',
        expect.objectContaining({ page_location: expect.stringMatching(/\/$/) }),
      ]);
    const queued: unknown[][] = await commands(page);
    expect(queued.slice(0, 2)).toEqual([
      [
        'consent',
        'default',
        {
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          analytics_storage: 'denied',
        },
      ],
      ['consent', 'update', { analytics_storage: 'granted' }],
    ]);
    expect(queued).toContainEqual([
      'config',
      MEASUREMENT_ID,
      expect.objectContaining({
        send_page_view: false,
        cookie_update: false,
        allow_google_signals: false,
      }),
    ]);
    // A client-side navigation is one more page view.
    await page
      .getByRole('link', { name: /Parcours de lecture/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/projects\/library-trails$/);
    await expect
      .poll(async (): Promise<unknown[][]> => commands(page))
      .toContainEqual([
        'event',
        'page_view',
        expect.objectContaining({
          page_location: expect.stringMatching(/\/projects\/library-trails$/),
        }),
      ]);
  });

  test('« Personnaliser » leaves the purpose off and works with the keyboard', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const google: string[] = await watchGoogle(page);
    await page.goto('/');
    const customize: Locator = page
      .getByRole('region', { name: 'Cookies' })
      .getByRole('button', { name: 'Personnaliser' });
    await customize.focus();
    await page.keyboard.press('Enter');
    const dialog: Locator = page.getByRole('dialog', { name: 'Préférences de cookies' });
    await expect(dialog).toBeVisible();
    const purpose: Locator = dialog.getByRole('switch', {
      name: 'Mesure d’audience (Google Analytics)',
    });
    await expect(purpose).toHaveAttribute('aria-checked', 'false');
    // The entrance fades the panel and its contents; audit their settled contrast.
    await dialog.evaluate(async (element: HTMLElement): Promise<void> => {
      await Promise.all(element.getAnimations({ subtree: true }).map((motion) => motion.finished));
    });
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(customize).toBeFocused();

    await customize.press('Enter');
    await expect(dialog).toBeVisible();
    await purpose.focus();
    await page.keyboard.press('Space');
    await expect(purpose).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('button', { name: 'Enregistrer mes choix' }).press('Enter');
    await expect(dialog).toBeHidden();
    await expect(banner(page)).toHaveCount(0);
    await expect.poll((): number => google.length).toBeGreaterThan(0);
    await expect(page.locator('main#content')).toBeFocused();
  });

  test('« Gérer les cookies » withdraws the consent and deletes the _ga cookies', async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }): Promise<void> => {
    await storeChoice(page, true, new Date().toISOString());
    await watchGoogle(page);
    await page.goto('/');
    // Host-only cookies, as the Google tag writes them on localhost.
    const url: string = new URL(page.url()).origin;
    await context.addCookies([
      { name: '_ga', value: 'GA1.1.1.1', url },
      { name: '_ga_E2ETEST000', value: 'GS1.1.1', url },
    ]);
    await expect(banner(page)).toHaveCount(0);
    await expect
      .poll(async (): Promise<unknown[][]> => commands(page))
      .toContainEqual(['consent', 'update', { analytics_storage: 'granted' }]);
    const manage: Locator = page
      .getByRole('contentinfo')
      .getByRole('button', { name: 'Gérer les cookies' });
    await manage.focus();
    await page.keyboard.press('Enter');
    const dialog: Locator = page.getByRole('dialog', { name: 'Préférences de cookies' });
    await expect(dialog.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('button', { name: 'Tout refuser' }).click();
    await expect(dialog).toBeHidden();
    await expect(manage).toBeFocused();
    expect(
      (await context.cookies()).filter((cookie: { name: string }): boolean =>
        cookie.name.startsWith('_ga'),
      ),
    ).toEqual([]);
    expect(await commands(page)).toContainEqual([
      'consent',
      'update',
      { analytics_storage: 'denied' },
    ]);
  });

  test('the privacy page manages the cookies too, and a six-month-old choice is asked again', async ({
    page,
  }: {
    page: Page;
  }): Promise<void> => {
    const old: Date = new Date();
    old.setMonth(old.getMonth() - 7);
    await storeChoice(page, false, old.toISOString());
    await page.goto('/privacy');
    await expect(banner(page)).toBeVisible();
    await page.getByRole('main').getByRole('button', { name: 'Gérer les cookies' }).click();
    await expect(page.getByRole('dialog', { name: 'Préférences de cookies' })).toBeVisible();
  });
});
