import type { Mock } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY } from '@internal/web-shell/lib/theme/constants/theme.constants';
import { ThemeService } from '@internal/web-shell/lib/theme/theme.service';

/**
 * Function root
 *
 * @description
 * Returns the document root used to assert theme attributes and styles in jsdom.
 *
 * @returns {HTMLElement} Root element of the test document.
 */
const root = (): HTMLElement => document.documentElement;

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    root().removeAttribute('data-theme');
  });

  it('is dark by default and applies it on <html>', () => {
    const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('reads the saved mode, saves a new one and applies it', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
    TestBed.tick();
    expect(theme.theme()).toBe('light');
    expect(root().getAttribute('data-theme')).toBe('light');
    theme.set('dark');
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(root().getAttribute('data-theme')).toBe('dark');
  });

  it('ignores an unknown saved value', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    expect(TestBed.inject<ThemeService>(ThemeService).mode()).toBe('dark');
  });

  it('neither reads, saves nor applies anything on the server', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
    theme.set('system');
    TestBed.tick();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(root().hasAttribute('data-theme')).toBe(false);
  });

  it('renders light in system mode when the device prefers light', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string): { matches: boolean; addEventListener: () => undefined } => ({
        matches: query === '(prefers-color-scheme: light)',
        addEventListener: (): undefined => undefined,
      }),
    );
    try {
      const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
      TestBed.tick();
      theme.set('system', document.createElement('button'));
      TestBed.tick();
      expect(theme.theme()).toBe('light');
      expect(root().getAttribute('data-theme')).toBe('light');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps a scroll lock in place while applying the theme', () => {
    root().style.overflow = 'hidden';
    try {
      TestBed.inject<ThemeService>(ThemeService);
      TestBed.tick();
      expect(root().getAttribute('data-theme')).toBe('dark');
      expect(root().style.overflow).toBe('hidden');
    } finally {
      root().style.overflow = '';
    }
  });

  it('removes the system media listener when its application injector is destroyed', () => {
    const media: EventTarget = new EventTarget();
    Object.defineProperty(media, 'matches', { value: false, configurable: true });
    const add: Mock<
      (
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: AddEventListenerOptions | boolean,
      ) => void
    > = vi.spyOn(media, 'addEventListener');
    const remove: Mock<
      (
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: EventListenerOptions | boolean,
      ) => void
    > = vi.spyOn(media, 'removeEventListener');
    vi.stubGlobal('matchMedia', (): EventTarget => media);
    try {
      const theme: ThemeService = TestBed.inject<ThemeService>(ThemeService);
      theme.set('system');
      TestBed.tick();
      const handler: EventListenerOrEventListenerObject | null | undefined = add.mock.calls[0]?.[1];
      expect(handler).toBeTypeOf('function');
      TestBed.resetTestingModule();
      expect(remove).toHaveBeenCalledWith('change', handler);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
