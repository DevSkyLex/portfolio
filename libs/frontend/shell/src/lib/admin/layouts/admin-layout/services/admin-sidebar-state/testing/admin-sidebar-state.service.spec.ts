import { type WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminSidebarStateService } from '@internal/web-shell/lib/admin/layouts/admin-layout/services/admin-sidebar-state/admin-sidebar-state.service';

/**
 * Constant KEY
 *
 * @description
 * Storage key of the collapsed state.
 *
 * @type {string}
 */
const KEY = 'portfolio.admin.layout.sidebar-collapsed' as const;

/**
 * Function create
 *
 * @description
 * Creates the service as the admin layout provides it and connects a narrow signal and a panel id.
 *
 * @returns Service and its narrow layout signal.
 */
function create(): { state: AdminSidebarStateService; narrow: WritableSignal<boolean> } {
  TestBed.configureTestingModule({ providers: [AdminSidebarStateService] });
  const state: AdminSidebarStateService =
    TestBed.inject<AdminSidebarStateService>(AdminSidebarStateService);
  const narrow: WritableSignal<boolean> = signal<boolean>(false);
  state.connect(narrow, signal<string | null>('ui-resizable-panel-0'));
  return { state, narrow };
}

describe('AdminSidebarStateService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('starts expanded without a stored state and remembers each toggle', () => {
    const { state } = create();
    expect(state.collapsed()).toBe(false);
    expect(state.expanded()).toBe(true);
    expect(state.rail()).toBe(false);
    expect(state.controls()).toBe('ui-resizable-panel-0');
    expect(state.shortcut()).toEqual(['[']);

    state.toggle();
    expect(state.collapsed()).toBe(true);
    expect(state.expanded()).toBe(false);
    expect(state.rail()).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('true');
    state.toggle();
    expect(localStorage.getItem(KEY)).toBe('false');
  });

  it('starts collapsed from a stored true only', () => {
    localStorage.setItem(KEY, 'true');
    expect(create().state.collapsed()).toBe(true);
    TestBed.resetTestingModule();
    for (const invalid of ['false', '1', 'collapsed', '{}']) {
      localStorage.setItem(KEY, invalid);
      expect(create().state.collapsed()).toBe(false);
      TestBed.resetTestingModule();
    }
  });

  it('expands when the storage cannot be read and keeps a refused toggle for the page', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota', 'QuotaExceededError');
    });
    const { state } = create();
    expect(state.collapsed()).toBe(false);
    state.toggle();
    expect(state.collapsed()).toBe(true);
  });

  it('is unavailable below 1024 px, where toggles change nothing and the rail waits', () => {
    localStorage.setItem(KEY, 'true');
    const { state, narrow } = create();
    narrow.set(true);
    expect(state.available()).toBe(false);
    expect(state.rail()).toBe(false);
    state.toggle();
    expect(state.collapsed()).toBe(true);
    expect(state.transitioning()).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('true');
    narrow.set(false);
    expect(state.rail()).toBe(true);
  });

  it('marks the width transition of a toggle until the layout settles it', () => {
    const { state } = create();
    expect(state.transitioning()).toBe(false);
    state.toggle();
    expect(state.transitioning()).toBe(true);
    state.settle();
    expect(state.transitioning()).toBe(false);
  });
});
