import type { MockInstance } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminStylesheetService } from '@internal/web-shell/lib/admin-stylesheet/admin-stylesheet.service';
import { ADMIN_STYLESHEET_ATTRIBUTE } from '@internal/web-shell/lib/admin-stylesheet/constants/admin-stylesheet.constants';

/**
 * Function links
 *
 * @description
 * Lists the administration stylesheet links currently in the document head.
 *
 * @returns {HTMLLinkElement[]} Appended links, in document order.
 */
const links = (): HTMLLinkElement[] => [
  ...document.head.querySelectorAll<HTMLLinkElement>(`link[${ADMIN_STYLESHEET_ATTRIBUTE}]`),
];

/**
 * Function loaded
 *
 * @description
 * Fires `load` on a link as the browser does once the response is parsed; jsdom fetches no
 * stylesheet, so the parsed sheet is given with its rule count.
 *
 * @param {HTMLLinkElement | undefined} link - Appended link.
 * @param {number} rules - Rules of the parsed sheet.
 */
const loaded = (link: HTMLLinkElement | undefined, rules: number): void => {
  if (!link) throw new Error('Missing stylesheet link');
  Object.defineProperty(link, 'sheet', {
    configurable: true,
    value: { cssRules: { length: rules } },
  });
  link.dispatchEvent(new Event('load'));
};

describe('AdminStylesheetService', () => {
  let error: MockInstance<typeof console.error>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const link of links()) link.remove();
    error.mockRestore();
  });

  it('appends one relative stylesheet link and resolves once it has loaded', async () => {
    const service: AdminStylesheetService = TestBed.inject(AdminStylesheetService);
    let settled: boolean = false;
    const first: Promise<void> = service.load().then(() => {
      settled = true;
    });
    const [link] = links();
    expect(links()).toHaveLength(1);
    expect(link?.rel).toBe('stylesheet');
    // Relative to <base href>, so that the build's root `admin.css` is the file requested.
    expect(link?.getAttribute('href')).toBe('admin.css');
    await Promise.resolve();
    expect(settled).toBe(false);
    loaded(link, 1200);
    await first;
    expect(settled).toBe(true);
    await expect(service.load()).resolves.toBeUndefined();
    expect(links()).toHaveLength(1);
    expect(error).not.toHaveBeenCalled();
  });

  it('reports a loaded sheet without any rule, such as the SPA index of a stale dev server', async () => {
    const service: AdminStylesheetService = TestBed.inject(AdminStylesheetService);
    const load: Promise<void> = service.load();
    loaded(links()[0], 0);
    await expect(load).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledOnce();
    expect(error.mock.calls[0]?.[0]).toContain(
      'Administration stylesheet admin.css loaded without any CSS rule',
    );
    // Tests run in dev mode: the message names the fix.
    expect(error.mock.calls[0]?.[0]).toContain('Restart the dev server (npx nx serve web)');
  });

  it('removes a link that failed and retries on the next call', async () => {
    const service: AdminStylesheetService = TestBed.inject(AdminStylesheetService);
    const failed: Promise<void> = service.load();
    links()[0]?.dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('Administration stylesheet unavailable: admin.css');
    expect(links()).toHaveLength(0);
    const retry: Promise<void> = service.load();
    expect(links()).toHaveLength(1);
    loaded(links()[0], 1200);
    await expect(retry).resolves.toBeUndefined();
  });

  it('touches no document on the server, where the admin is never rendered', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    await expect(TestBed.inject(AdminStylesheetService).load()).resolves.toBeUndefined();
    expect(links()).toHaveLength(0);
  });
});
