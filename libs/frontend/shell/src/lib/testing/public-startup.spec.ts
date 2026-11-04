import type { Mock } from 'vitest';
import {
  ApplicationInitStatus,
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  PLATFORM_ID,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { publicContentGuard } from '@internal/web-shell/lib/http/guards/public-content/public-content.guard';
import { provideWebShell } from '@internal/web-shell/lib/provide-web-shell';

@Component({ template: 'Public ready', changeDetection: ChangeDetectionStrategy.OnPush })
class PublicPageComponent {}

@Component({ template: 'Admin ready', changeDetection: ChangeDetectionStrategy.OnPush })
class AdminPageComponent {}

@Component({ template: 'Content unavailable', changeDetection: ChangeDetectionStrategy.OnPush })
class ContentUnavailableComponent {}

/** Minimal valid public projection; a route may consume it only after the loader resolves. */
const snapshot: {
  locale: string;
  revision: number;
  profile: { heroIntro: string; aboutStatement: string; aboutLead: string; facts: never[] };
  projects: never[];
  timeline: never[];
  skills: never[];
  legal: Record<
    'notice' | 'privacy',
    { updatedOn: string; document: { type: 'doc'; content: { type: 'paragraph' }[] } }
  >;
} = {
  locale: 'fr',
  revision: 1,
  profile: { heroIntro: '', aboutStatement: '', aboutLead: '', facts: [] },
  projects: [],
  timeline: [],
  skills: [],
  legal: {
    notice: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
    privacy: {
      updatedOn: '2026-11-02',
      document: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  },
};

function configure(load: () => Promise<unknown>, platform: 'browser' | 'server' = 'browser'): void {
  TestBed.configureTestingModule({
    providers: [
      { provide: LOCALE_ID, useValue: 'fr' },
      { provide: PLATFORM_ID, useValue: platform },
      provideWebShell({ contentSnapshot: load }),
    ],
  });
  TestBed.inject<Router>(Router).resetConfig([
    { path: 'admin/login', component: AdminPageComponent },
    { path: 'error/503', component: ContentUnavailableComponent },
    { path: '', component: PublicPageComponent, canActivate: [publicContentGuard] },
  ]);
}

describe('public content route startup', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-js', '');
    document.documentElement.removeAttribute('data-app');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-js');
    document.documentElement.removeAttribute('data-app');
  });

  it('activates administration without requesting the public snapshot', async () => {
    const load: Mock<() => Promise<never>> = vi.fn(() =>
      Promise.reject(new Error('Public chunk unavailable')),
    );
    configure(load);
    await TestBed.inject<ApplicationInitStatus>(ApplicationInitStatus).donePromise;
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/admin/login');
    expect(harness.routeNativeElement?.textContent).toBe('Admin ready');
    expect(load).not.toHaveBeenCalled();
    expect(document.documentElement.hasAttribute('data-app')).toBe(true);
  });

  it('does not mark public startup usable while its snapshot is still pending', async () => {
    let resolve: ((value: unknown) => void) | undefined;
    const load: Mock<() => Promise<unknown>> = vi.fn(
      () => new Promise<unknown>((ready) => (resolve = ready)),
    );
    configure(load);
    const navigation: Promise<RouterTestingHarness> = RouterTestingHarness.create('/');
    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    expect(document.documentElement.hasAttribute('data-app')).toBe(false);
    if (!resolve) throw new Error('Snapshot loader was not requested');
    resolve(snapshot);
    const harness: RouterTestingHarness = await navigation;
    expect(harness.routeNativeElement?.textContent).toBe('Public ready');
    expect(document.documentElement.hasAttribute('data-app')).toBe(true);
  });

  it('renders an independent unavailable page when a CSR public load fails', async () => {
    const failure: Error = new Error('Public chunk unavailable');
    configure(() => Promise.reject(failure));
    const harness: RouterTestingHarness = await RouterTestingHarness.create('/');
    expect(harness.routeNativeElement?.textContent).toBe('Content unavailable');
    expect(TestBed.inject<Router>(Router).url).toBe('/error/503');
    expect(document.documentElement.hasAttribute('data-app')).toBe(true);
  });

  it('propagates server content failures so invalid prerendering cannot be published', async () => {
    configure(() => Promise.reject(new Error('Invalid server snapshot')), 'server');
    await expect(RouterTestingHarness.create('/')).rejects.toThrow('Invalid server snapshot');
    expect(document.documentElement.hasAttribute('data-app')).toBe(false);
  });
});
