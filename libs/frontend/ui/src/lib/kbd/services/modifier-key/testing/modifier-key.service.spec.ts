import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModifierKeyService } from '@internal/ui/lib/kbd/services/modifier-key/modifier-key.service';

describe('ModifierKeyService', (): void => {
  afterEach((): void => {
    vi.restoreAllMocks();
  });

  it('names the Command key on Apple platforms', (): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    const modifier: ModifierKeyService = TestBed.inject(ModifierKeyService);
    expect(modifier.apple).toBe(true);
    expect(modifier.key).toBe('⌘');
  });

  it('names Ctrl on Windows and Linux', (): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    expect(TestBed.inject(ModifierKeyService).key).toBe('Ctrl');
  });

  it('spells Apple combinations with the Command, Option and Shift symbols', (): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    const modifier: ModifierKeyService = TestBed.inject(ModifierKeyService);
    expect(modifier.caps(['Mod', 'Maj', '8'])).toEqual(['⌘', '⇧', '8']);
    expect(modifier.caps(['Mod', 'Alt', 'Shift', 'C'])).toEqual(['⌘', '⌥', '⇧', 'C']);
    expect(modifier.ariaKeys(['Mod', 'Alt', '2'])).toBe('Meta+Alt+2');
    expect(modifier.ariaKeys(['Mod', 'Maj', 'Z'])).toBe('Meta+Shift+Z');
  });

  it('keeps the written caps on Windows and Linux, with Control in aria-keyshortcuts', (): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Win32');
    const modifier: ModifierKeyService = TestBed.inject(ModifierKeyService);
    expect(modifier.caps(['Mod', 'Maj', '8'])).toEqual(['Ctrl', 'Maj', '8']);
    expect(modifier.caps(['Mod', 'Alt', '0'])).toEqual(['Ctrl', 'Alt', '0']);
    expect(modifier.ariaKeys(['Mod', 'K'])).toBe('Control+K');
    expect(modifier.ariaKeys(['Mod', 'Maj', '7'])).toBe('Control+Shift+7');
  });

  it('defaults to Ctrl outside the browser', (): void => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    expect(TestBed.inject(ModifierKeyService).key).toBe('Ctrl');
  });
});
