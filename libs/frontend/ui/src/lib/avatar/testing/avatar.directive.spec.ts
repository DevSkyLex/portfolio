import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AVATAR_IMPORTS } from '@internal/ui/lib/avatar/constants/avatar.imports';
import type { AvatarSize } from '@internal/ui/lib/avatar/constants/avatar.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies mutable size and image-source inputs to exercise avatar loading, failure, and fallback
 * rendering behavior.
 */
@Component({
  imports: [AVATAR_IMPORTS],
  template: `<span uiAvatar [size]="size()">
    <img uiAvatarImage [src]="src()" alt="Valentin Fortin" />
    <span uiAvatarFallback>VF</span>
  </span>`,
})
class HostComponent {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Avatar size changed by the host test to verify the selected dimension classes.
   *
   * @type {WritableSignal<AvatarSize>}
   */
  public readonly size: WritableSignal<AvatarSize> = signal<AvatarSize>('md');

  /**
   * Property src
   * @readonly
   *
   * @description
   * Initial image URL; setting it to null covers the no-source fallback state.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly src: WritableSignal<string | null> = signal<string | null>('portrait.png');
  // #endregion
}

/**
 * Function parts
 *
 * @description
 * Returns the avatar root, image, and fallback elements queried from the test fixture.
 *
 * @param {{ nativeElement: HTMLElement }} fixture - Fixture wrapper containing the rendered host.
 *
 * @returns {{ avatar: HTMLElement; image: HTMLImageElement; fallback: HTMLElement }} Queried avatar parts.
 */
function parts(fixture: { nativeElement: HTMLElement }): {
  avatar: HTMLElement;
  image: HTMLImageElement;
  fallback: HTMLElement;
} {
  const root: HTMLElement = fixture.nativeElement;
  return {
    avatar: root.querySelector('[data-slot="avatar"]') as HTMLElement,
    image: root.querySelector('img') as HTMLImageElement,
    fallback: root.querySelector('[data-slot="avatar-fallback"]') as HTMLElement,
  };
}

describe('AvatarDirective', () => {
  it('shows the fallback while the image loads, then the image', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const { image, fallback } = parts(fixture);
    expect(image.getAttribute('src')).toBe('portrait.png');
    expect(image.classList).toContain('hidden');
    expect(fallback.classList).not.toContain('hidden');

    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(image.classList).not.toContain('hidden');
    expect(fallback.classList).toContain('hidden');
  });

  it('falls back when the image fails or has no source', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const { image, fallback } = parts(fixture);
    image.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(image.dataset['status']).toBe('error');
    expect(fallback.classList).not.toContain('hidden');

    fixture.componentInstance.src.set(null);
    await fixture.whenStable();
    expect(image.getAttribute('src') ?? '').toBe('');
    expect(fallback.classList).not.toContain('hidden');
  });

  describe('with an image already in the cache', () => {
    afterEach(() => vi.restoreAllMocks());

    /**
     * Function cached
     *
     * @description
     * Mocks the native image completion properties, renders a fixture, and returns its avatar parts.
     * A positive natural width represents a successful cached image; zero represents a broken one.
     *
     * @param {number} naturalWidth - Mocked intrinsic width used to determine load success.
     *
     * @returns {Promise<{ avatar: HTMLElement; image: HTMLImageElement; fallback: HTMLElement }>}
     * Rendered avatar parts after the cached-image reconciliation runs.
     */
    async function cached(
      naturalWidth: number,
    ): Promise<{ avatar: HTMLElement; image: HTMLImageElement; fallback: HTMLElement }> {
      vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(naturalWidth);
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      await fixture.whenStable();
      return parts(fixture);
    }

    it('shows it at once, without waiting for a load event', async () => {
      const { image, fallback } = await cached(64);
      expect(image.dataset['status']).toBe('loaded');
      expect(image.classList).not.toContain('hidden');
      expect(fallback.classList).toContain('hidden');
    });

    it('falls back at once when the cached image is broken', async () => {
      const { image, fallback } = await cached(0);
      expect(image.dataset['status']).toBe('error');
      expect(fallback.classList).not.toContain('hidden');
    });
  });

  it('applies the size', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.size.set('lg');
    await fixture.whenStable();
    const { avatar } = parts(fixture);
    expect(avatar.className).toContain('size-14');
    expect(avatar.dataset['size']).toBe('lg');
  });
});
