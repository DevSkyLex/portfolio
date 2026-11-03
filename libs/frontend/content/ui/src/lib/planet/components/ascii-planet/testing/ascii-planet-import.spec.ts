import type { Mock } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AsciiPlanetComponent } from '@internal/content-web-ui/lib/planet/components/ascii-planet/ascii-planet.component';
import type { PlanetRendererLoader } from '@internal/content-web-ui/lib/planet/models/planet-renderer-loader/planet-renderer-loader.type';
import { PLANET_RENDERER_LOADER } from '@internal/content-web-ui/lib/planet/tokens/planet-renderer-loader/planet-renderer-loader.token';

type RendererModule = Awaited<ReturnType<PlanetRendererLoader>>;

/** A controlled module load that can finish after the owning view has been replaced or destroyed. */
function pendingRenderer(): {
  promise: Promise<RendererModule>;
  resolve: (renderer: RendererModule) => void;
  reject: (reason: Error) => void;
} {
  let resolve: ((renderer: RendererModule) => void) | undefined;
  let reject: ((reason: Error) => void) | undefined;
  const promise: Promise<RendererModule> = new Promise<RendererModule>((success, failure): void => {
    resolve = success;
    reject = failure;
  });
  return {
    promise,
    resolve: (renderer): void => {
      if (!resolve) throw new Error('Deferred renderer was not initialized.');
      resolve(renderer);
    },
    reject: (reason: Error): void => {
      if (!reject) throw new Error('Deferred renderer was not initialized.');
      reject(reason);
    },
  };
}

describe('AsciiPlanetComponent renderer loading', (): void => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps a labelled stationary fallback when its lazy renderer fails to load', async (): Promise<void> => {
    const load: Mock<PlanetRendererLoader> = vi
      .fn<PlanetRendererLoader>()
      .mockRejectedValue(new Error('Chunk unavailable'));
    TestBed.overrideProvider(PLANET_RENDERER_LOADER, { useValue: load });
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    fixture.componentRef.setInput('label', 'Planète');
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;

    await vi.waitFor(() => expect(host.getAttribute('data-renderer')).toBe('static'));
    await fixture.whenStable();
    expect(host.hasAttribute('data-static')).toBe(true);
    expect(host.className).toContain('from-aurora-violet/15');
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe('Planète');
    expect(host.querySelector('canvas')).toBeNull();
    fixture.destroy();
  });

  it('does not mount a renderer whose load succeeds after destruction', async (): Promise<void> => {
    const pending: {
      promise: Promise<RendererModule>;
      resolve: (renderer: RendererModule) => void;
      reject: (reason: Error) => void;
    } = pendingRenderer();
    const load: Mock<PlanetRendererLoader> = vi
      .fn<PlanetRendererLoader>()
      .mockReturnValue(pending.promise);
    const mountPlanet: Mock<RendererModule['mountPlanet']> = vi.fn<RendererModule['mountPlanet']>(
      (): (() => void) => (): void => undefined,
    );
    TestBed.overrideProvider(PLANET_RENDERER_LOADER, { useValue: load });
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    await fixture.whenStable();
    expect(load).toHaveBeenCalledOnce();
    const host: HTMLElement = fixture.nativeElement;
    const before: string = host.outerHTML;

    fixture.destroy();
    pending.resolve({ mountPlanet });
    await pending.promise;
    await Promise.resolve();
    expect(mountPlanet).not.toHaveBeenCalled();
    expect(host.outerHTML).toBe(before);
  });

  it('handles a failed pending load after destruction without mutating the detached view', async (): Promise<void> => {
    const pending: {
      promise: Promise<RendererModule>;
      resolve: (renderer: RendererModule) => void;
      reject: (reason: Error) => void;
    } = pendingRenderer();
    const load: Mock<PlanetRendererLoader> = vi
      .fn<PlanetRendererLoader>()
      .mockReturnValue(pending.promise);
    TestBed.overrideProvider(PLANET_RENDERER_LOADER, { useValue: load });
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    await fixture.whenStable();
    expect(load).toHaveBeenCalledOnce();
    const host: HTMLElement = fixture.nativeElement;
    const before: string = host.outerHTML;

    fixture.destroy();
    pending.reject(new Error('Chunk failed after view teardown'));
    await pending.promise.catch((): undefined => undefined);
    await Promise.resolve();
    expect(host.outerHTML).toBe(before);
    expect(host.hasAttribute('data-static')).toBe(false);
  });

  it('ignores an obsolete load when inputs have already started a replacement renderer', async (): Promise<void> => {
    const obsolete: {
      promise: Promise<RendererModule>;
      resolve: (renderer: RendererModule) => void;
      reject: (reason: Error) => void;
    } = pendingRenderer();
    const cleanup: Mock<() => void> = vi.fn<() => void>();
    const mountPlanet: Mock<RendererModule['mountPlanet']> = vi.fn<RendererModule['mountPlanet']>(
      () => cleanup,
    );
    const load: Mock<PlanetRendererLoader> = vi
      .fn<PlanetRendererLoader>()
      .mockReturnValueOnce(obsolete.promise)
      .mockResolvedValue({ mountPlanet });
    TestBed.overrideProvider(PLANET_RENDERER_LOADER, { useValue: load });
    const fixture: ComponentFixture<AsciiPlanetComponent> =
      TestBed.createComponent(AsciiPlanetComponent);
    await fixture.whenStable();
    expect(load).toHaveBeenCalledOnce();

    fixture.componentRef.setInput('cell', 12);
    await fixture.whenStable();
    await vi.waitFor(() => expect(mountPlanet).toHaveBeenCalledOnce());
    obsolete.reject(new Error('Obsolete chunk request failed'));
    await obsolete.promise.catch((): undefined => undefined);
    await Promise.resolve();
    expect((fixture.nativeElement as HTMLElement).hasAttribute('data-static')).toBe(false);
    expect(mountPlanet).toHaveBeenCalledOnce();
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});
