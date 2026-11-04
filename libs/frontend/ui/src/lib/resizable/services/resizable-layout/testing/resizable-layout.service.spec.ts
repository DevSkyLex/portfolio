import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ResizableLayout } from '@internal/ui/lib/resizable/models/resizable/resizable-layout.interface';
import { ResizableLayoutService } from '@internal/ui/lib/resizable/services/resizable-layout/resizable-layout.service';
import { storedPanelSizes } from '@internal/ui/lib/resizable/utils/resizable/resizable.utils';

/**
 * Constant LAYOUT
 *
 * @description
 * Two-panel layout whose first panel stays between 20 and 40 percent.
 *
 * @type {ResizableLayout}
 */
const LAYOUT: ResizableLayout = {
  key: 'test.layout',
  sizes: [30, 70],
  limits: [
    { min: 20, max: 40 },
    { min: 60, max: 80 },
  ],
};

describe('storedPanelSizes', (): void => {
  it('keeps a stored layout within the bounds that sums to about 100', (): void => {
    expect(storedPanelSizes('[25,75]', LAYOUT)).toEqual([25, 75]);
    expect(storedPanelSizes('[33.33,66.67]', LAYOUT)).toEqual([33.33, 66.67]);
    expect(storedPanelSizes('[19.8,80.2]', LAYOUT)).toEqual([19.8, 80.2]);
  });

  it('falls back to the defaults for a missing or invalid value', (): void => {
    for (const raw of [
      null,
      '',
      'not json',
      '{"a":1}',
      '[30]',
      '[30,70,0]',
      '["30","70"]',
      '[null,70]',
      '[10,90]',
      '[45,55]',
      '[30,60]',
      '[39,69]',
    ]) {
      expect(storedPanelSizes(raw, LAYOUT)).toBe(LAYOUT.sizes);
    }
  });

  it('accepts any percentage for a panel without limits', (): void => {
    expect(storedPanelSizes('[90,10]', { key: 'k', sizes: [50, 50], limits: [] })).toEqual([
      90, 10,
    ]);
  });
});

describe('ResizableLayoutService', (): void => {
  afterEach((): void => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('writes rounded sizes under the layout key and reads them back', (): void => {
    const layouts: ResizableLayoutService = TestBed.inject(ResizableLayoutService);
    expect(layouts.read(LAYOUT)).toEqual([30, 70]);
    layouts.write(LAYOUT, [25.123_456, 74.876_544]);
    expect(localStorage.getItem('test.layout')).toBe('[25.12,74.88]');
    expect(layouts.read(LAYOUT)).toEqual([25.12, 74.88]);
  });

  it('falls back to the defaults on an invalid stored value', (): void => {
    localStorage.setItem('test.layout', '[90,10]');
    expect(TestBed.inject(ResizableLayoutService).read(LAYOUT)).toBe(LAYOUT.sizes);
  });

  it('survives a storage that refuses reads and writes', (): void => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((): never => {
      throw new DOMException('denied', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((): never => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const layouts: ResizableLayoutService = TestBed.inject(ResizableLayoutService);
    expect(layouts.read(LAYOUT)).toBe(LAYOUT.sizes);
    expect((): void => layouts.write(LAYOUT, [25, 75])).not.toThrow();
  });

  it('never touches storage outside the browser', (): void => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    localStorage.setItem('test.layout', '[25,75]');
    const layouts: ResizableLayoutService = TestBed.inject(ResizableLayoutService);
    expect(layouts.read(LAYOUT)).toBe(LAYOUT.sizes);
    layouts.write(LAYOUT, [35, 65]);
    expect(localStorage.getItem('test.layout')).toBe('[25,75]');
  });
});

/**
 * Constant SIDEBAR
 *
 * @description
 * Layout whose first panel is remembered in pixels, between 200 and 360 px.
 */
const SIDEBAR = {
  key: 'test.sidebar',
  sizes: [16, 84],
  limits: [
    { min: '200px', max: '360px' },
    { min: 50, max: 100 },
  ],
  pixels: { index: 0, default: 232 },
} as const satisfies ResizableLayout;

describe('ResizableLayoutService pixels', (): void => {
  afterEach((): void => localStorage.clear());

  it('stores the pixel panel length and reads it back within its bounds', (): void => {
    const layouts: ResizableLayoutService = TestBed.inject(ResizableLayoutService);
    expect(layouts.readPixels(SIDEBAR)).toBe(232);
    layouts.writePixels(SIDEBAR, 287.6);
    expect(localStorage.getItem('test.sidebar')).toBe('288');
    expect(layouts.readPixels(SIDEBAR)).toBe(288);
    layouts.writePixels(SIDEBAR, Number.NaN);
    expect(localStorage.getItem('test.sidebar')).toBe('288');
  });

  it('falls back to the default for a percentage layout stored before or an out-of-bounds length', (): void => {
    const layouts: ResizableLayoutService = TestBed.inject(ResizableLayoutService);
    for (const raw of ['[16,84]', '16', '199', '361', 'nope', '"240"']) {
      localStorage.setItem('test.sidebar', raw);
      expect(layouts.readPixels(SIDEBAR)).toBe(232);
    }
  });

  it('checks a stored percentage layout against its percentage bounds only', (): void => {
    expect(storedPanelSizes('[16,84]', SIDEBAR)).toEqual([16, 84]);
    expect(storedPanelSizes('[60,40]', SIDEBAR)).toBe(SIDEBAR.sizes);
  });
});
