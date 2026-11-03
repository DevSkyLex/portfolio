import type { MockInstance } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TimelineStep } from '@vfortin/content-web-model';
import { TimelineComponent } from '@internal/content-web-ui/lib/timeline/timeline.component';

// Preloaded so that the component's lazy import resolves before the test ends.
import '@internal/content-web-ui/lib/timeline/renderers/parallel-scene/parallel-scene';

/**
 * Constant step
 *
 * @description
 * Builds a one-year timeline fixture with its identifier reused as title and place.
 */
const step: (id: string, kind: TimelineStep['kind'], start: number) => TimelineStep = (
  id: string,
  kind: TimelineStep['kind'],
  start: number,
): TimelineStep => ({
  id,
  kind,
  title: id,
  place: 'Tours',
  description: 'Description.',
  start,
  end: start + 1,
  dateLabel: String(start),
  techs: [],
});

describe('TimelineComponent', (): void => {
  afterEach((): void => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /**
   * Constant render
   *
   * @description
   * Creates the component with unsorted education and experience fixtures and waits for the lazy scene import.
   */
  const render: () => Promise<HTMLElement> = async (): Promise<HTMLElement> => {
    const fixture: ComponentFixture<TimelineComponent> = TestBed.createComponent(TimelineComponent);
    fixture.componentRef.setInput('steps', [
      step('xp', 'experience', 2023),
      step('bts', 'education', 2021),
      step('master', 'education', 2024),
    ]);
    fixture.componentRef.setInput('educationLabel', 'Formation');
    fixture.componentRef.setInput('experienceLabel', 'Expérience');
    await fixture.whenStable();
    await new Promise((resolve: (value: unknown) => void): ReturnType<typeof setTimeout> =>
      setTimeout(resolve),
    );
    return fixture.nativeElement as HTMLElement;
  };

  it('lists each line of the journey in time order, labelled', async (): Promise<void> => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const host: HTMLElement = await render();
    const tracks: HTMLOListElement[] = [...host.querySelectorAll('ol')];
    expect(
      tracks.map((ol: HTMLOListElement): string | null => ol.getAttribute('aria-label')),
    ).toEqual(['Formation', 'Expérience']);
    expect(
      [...(tracks[0]?.querySelectorAll('li[data-start]') ?? [])].map((li: Element): string | null =>
        li.getAttribute('data-start'),
      ),
    ).toEqual(['2021.00', '2024.00']);
  });

  it('falls back to the static layout when the scene cannot draw', async (): Promise<void> => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const host: HTMLElement = await render();
    expect(host.hasAttribute('data-static')).toBe(true);
  });

  it('does not load the scene with reduced motion', async (): Promise<void> => {
    vi.stubGlobal('matchMedia', (): { matches: boolean } => ({ matches: true }));
    const getContext: MockInstance<HTMLCanvasElement['getContext']> = vi.spyOn(
      HTMLCanvasElement.prototype,
      'getContext',
    );
    const host: HTMLElement = await render();
    expect(getContext).not.toHaveBeenCalled();
    expect(host.hasAttribute('data-static')).toBe(false);
  });
});
