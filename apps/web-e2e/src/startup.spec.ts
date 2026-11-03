import {
  expect,
  test,
  type APIRequestContext,
  type Locator,
  type Page,
  type Route,
} from '@playwright/test';

/**
 * Function activeSnapshotChunk
 *
 * @description
 * Discovers the locale's content chunk from the built composition bundle rather than freezing a hash.
 *
 * @param {APIRequestContext} request - Same-origin test client.
 * @returns {Promise<string>} Relative French snapshot chunk filename.
 */
async function activeSnapshotChunk(request: APIRequestContext): Promise<string> {
  const html: string = await (await request.get('/')).text();
  const main: string | undefined = /src="([^"]*main-[^"]+\.js)"/.exec(html)?.[1];
  if (!main) throw new Error('Missing built main bundle.');
  const bundle: string = await (await request.get('/' + main.replace(/^\//, ''))).text();
  const loader: string | undefined = /contentSnapshot:.{0,350}/.exec(bundle)?.[0];
  const chunks: RegExpExecArray[] = [
    ...(loader ?? '').matchAll(/import\([`'"]\.\/(chunk-[^`'"]+\.js)[`'"]\)/g),
  ];
  const french: string | undefined = chunks[1]?.[1];
  if (!french) throw new Error('Missing locale snapshot import.');
  return french;
}

/**
 * Function readable
 *
 * @description
 * Checks actual rendered opacity through ancestors; Playwright visibility alone accepts opacity zero.
 *
 * @param {Locator} heading - Prerendered page heading.
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

test('admin startup is independent of the public content chunk', async ({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}): Promise<void> => {
  const snapshot: string = await activeSnapshotChunk(request);
  let requests: number = 0;
  await page.route('**/' + snapshot, (route: Route): Promise<void> => {
    requests++;
    return route.abort('failed');
  });
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  expect(requests).toBe(0);
});

test('public hydration uses its prerendered snapshot without a duplicate chunk dependency', async ({
  page,
  request,
}: {
  page: Page;
  request: APIRequestContext;
}): Promise<void> => {
  const snapshot: string = await activeSnapshotChunk(request);
  let requests: number = 0;
  await page.route('**/' + snapshot, (route: Route): Promise<void> => {
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

test('public prerendered content remains readable when the application bundle fails', async ({
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
