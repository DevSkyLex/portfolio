import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AsciiPlanetComponent } from '@internal/content-web-ui/lib/planet/components/ascii-planet/ascii-planet.component';

// Preloaded so that the component's lazy import resolves before the test ends.
import '@internal/content-web-ui/lib/planet/renderers/planet/planet-renderer';

describe('AsciiPlanetComponent', (): void => {
  beforeEach((): void => {
    // jsdom has no canvas contexts: both renderers give up and the 2D fallback is reported.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => vi.restoreAllMocks());

  /**
   * Constant settle
   *
   * @description
   * Waits for Angular stability and the component's deferred renderer import to settle.
   */
  const settle: (fixture: { whenStable(): Promise<unknown> }) => Promise<void> = async (fixture: {
    whenStable(): Promise<unknown>;
  }): Promise<void> => {
    await fixture.whenStable();
    await new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
      setTimeout(resolve),
    );
  };

  it('fills a box of the given height and hides itself from assistive technologies', async (): Promise<void> => {
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    fixture.componentRef.setInput('height', 640);
    await settle(fixture);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.style.height).toBe('640px');
    expect(host.className).toContain('relative');
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(host.getAttribute('data-renderer')).toBe('2d');
  });

  it('pins itself behind the page when fixed, and exposes a label as an image', async (): Promise<void> => {
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    fixture.componentRef.setInput('fixed', true);
    fixture.componentRef.setInput('label', 'Planète');
    await settle(fixture);
    const host: HTMLElement = fixture.nativeElement;
    expect(host.style.height).toBe('');
    expect(host.className).toContain('fixed inset-0');
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Planète');
    expect(host.hasAttribute('aria-hidden')).toBe(false);
  });
});
