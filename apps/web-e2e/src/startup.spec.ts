import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type Request,
  type Response,
  type Route,
} from '@playwright/test';

/**
 * Function readable
 *
 * @description
 * Checks actual rendered opacity through ancestors; Playwright visibility alone accepts opacity zero.
 *
 * @param {Locator} heading - Server-rendered page heading.
 * @returns {Promise<boolean>} Whether meaningful heading text remains readable.
 */
async function readable(heading: Locator): Promise<boolean> {
  return heading.evaluate((element: SVGElement | HTMLElement): boolean => {
    let visibleText: string = '';
    const walker: TreeWalker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    while (node) {
      let visible: boolean = true;
      let current: Element | null = node.parentElement;
      while (current) {
        const style: CSSStyleDeclaration = getComputedStyle(current);
        const bounds: DOMRect = current.getBoundingClientRect();
        if (
          style.opacity === '0' ||
          style.visibility === 'hidden' ||
          style.display === 'none' ||
          (style.overflow === 'hidden' && bounds.width <= 1 && bounds.height <= 1)
        )
          visible = false;
        current = current.parentElement;
      }
      if (visible) visibleText += node.textContent ?? '';
      node = walker.nextNode();
    }
    return visibleText.trim().length >= 10 && element.getBoundingClientRect().height > 0;
  });
}

test('admin startup does not fetch public content', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let requests: number = 0;
  await page.route('**/api/content/snapshot**', (route: Route): Promise<void> => {
    requests++;
    return route.abort('failed');
  });
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  expect(requests).toBe(0);
});

test('public hydration uses its server snapshot without a duplicate API request', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let requests: number = 0;
  await page.route('**/api/content/snapshot**', (route: Route): Promise<void> => {
    requests++;
    return route.abort('failed');
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-app', '');
  expect(requests).toBe(0);
  await expect
    .poll((): Promise<boolean> => readable(page.getByRole('heading', { level: 1 }).first()))
    .toBe(true);
});

test('public server-rendered content remains readable when the application bundle fails', async ({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}): Promise<void> => {
  const html: string = await (await request.get('/')).text();
  const main: string | undefined = /src="([^"]*main-[^"]+\.js)"/.exec(html)?.[1];
  if (!main) throw new Error('Missing built main bundle.');
  let requests: number = 0;
  await page.route('**/' + main.replace(/^\//, ''), (route: Route): Promise<void> => {
    requests++;
    return route.abort('failed');
  });
  await page.goto('/');

  // Firefox can retry an aborted module request; every attempt remains blocked by the route.
  expect(requests).toBeGreaterThan(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-app', '');
  await expect(page.locator('html')).not.toHaveAttribute('data-js', '', { timeout: 8000 });
  await expect
    .poll((): Promise<boolean> => readable(page.getByRole('heading', { level: 1 }).first()))
    .toBe(true);
});

/**
 * Function publicStylesheet
 *
 * @description
 * Reads the stylesheet a server-rendered page links, discovered from its HTML rather than a frozen hash.
 *
 * @param {APIRequestContext} request - Same-origin test client.
 * @param {string} html - Server-rendered page.
 * @returns {Promise<string>} Public stylesheet text.
 */
async function publicStylesheet(request: APIRequestContext, html: string): Promise<string> {
  const href: string | undefined = /<link rel="stylesheet" href="([^"]*styles-[^"]+\.css)"/.exec(
    html,
  )?.[1];
  if (!href) throw new Error('Missing public stylesheet.');
  return (await request.get(new URL(href, 'https://example.test/fr/').pathname)).text();
}

/**
 * Function projectPath
 *
 * @description
 * First project page linked by the server-rendered home page, read from the build instead of a fixture.
 *
 * @param {string} home - Server-rendered home page.
 * @returns {string} Root-relative project page path.
 */
function projectPath(home: string): string {
  const path: string | undefined = /href="(\/fr\/projects\/[a-z0-9-]+)"/.exec(home)?.[1];
  if (!path) throw new Error('Missing project link on the home page.');
  return path;
}

test('public pages never load the administration stylesheet (D31)', async ({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}): Promise<void> => {
  const home: string = await (await request.get('/')).text();
  const project: string = projectPath(home);
  const requested: string[] = [];
  page.on('request', (sent: Request): void => {
    if (new URL(sent.url()).pathname.endsWith('/admin.css')) requested.push(sent.url());
  });
  for (const path of ['/', '/en/', project, '/legal-notice', '/en/privacy']) {
    const html: string = await (await request.get(path)).text();
    expect(html, path).not.toContain('admin.css');
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('data-app', '');
  }
  expect(requested).toEqual([]);
  // Admin-only catalogue families (resizable panels, sidebar) stay out of the public stylesheet.
  const styles: string = await publicStylesheet(request, home);
  const admin: string = await (await request.get('/fr/admin.css')).text();
  for (const family of ['cursor-col-resize', '/sidebar']) {
    expect(admin).toContain(family);
    expect(styles).not.toContain(family);
  }
});

test('the administration renders only once its stylesheet has loaded', async ({
  page,
}: {
  page: Page;
}): Promise<void> => {
  let release: (() => void) | undefined;
  const gate: Promise<void> = new Promise<void>((resolve: () => void): void => {
    release = resolve;
  });
  let requests: number = 0;
  await page.route('**/admin.css', async (route: Route): Promise<void> => {
    requests++;
    await gate;
    await route.continue();
  });
  const heading: Locator = page.getByRole('heading', { name: 'Administration', exact: true });
  const response: Promise<Response> = page.waitForResponse('**/admin.css');
  await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
  await expect.poll((): number => requests).toBe(1);
  await expect(heading).toHaveCount(0);
  release?.();
  expect((await response).headers()['cache-control']).toBe('no-cache');
  await expect(heading).toBeVisible();
  // `text-[22px]/7` exists in admin.css only: the login title proves the stylesheet applies.
  await expect(heading).toHaveCSS('font-size', '22px');
  await expect(heading).toHaveCSS('line-height', '28px');
  await expect(page.locator('link[data-admin-stylesheet]')).toHaveAttribute('href', 'admin.css');
  expect(requests).toBe(1);
});
