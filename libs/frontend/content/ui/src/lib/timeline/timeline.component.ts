import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import type { TimelineStep } from '@vfortin/content-web-model';
import { TechTagsComponent } from '@internal/content-web-ui/lib/tech/components/tech-tags/tech-tags.component';
import type { TimelineTrack } from '@internal/content-web-ui/lib/timeline/models/timeline-track/timeline-track.interface';
import { timelineTracks } from '@internal/content-web-ui/lib/timeline/utils/timeline-tracks/timeline-tracks.utils';

/**
 * Class TimelineComponent
 * @class TimelineComponent
 *
 * @description
 * Renders education and experience tracks with a scroll-driven canvas scene when browser motion and canvas are available.
 * The projected heading and static two-column cards remain available when the scene is disabled or fails to load.
 */
@Component({
  selector: 'content-timeline',
  imports: [TechTagsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  host: {
    class:
      'group relative block bg-void [--gap-top:212px] [--n:7] [--sp:0.6] pt-(--gap-top) h-[calc(900px+var(--gap-top))] data-live:h-[calc(var(--n)*100vh+var(--gap-top))] @max-3xl:[--gap-top:308px] scene-static:h-auto',
    'data-poster': '0.66',
  },
})
export class TimelineComponent {
  // #region Properties
  /**
   * Property steps
   * @readonly
   *
   * @description
   * Timeline records divided into education and experience tracks by `tracks`.
   *
   * @type {InputSignal<readonly TimelineStep[]>}
   */
  public readonly steps: InputSignal<readonly TimelineStep[]> =
    input.required<readonly TimelineStep[]>();

  /**
   * Property educationLabel
   * @readonly
   *
   * @description
   * Accessible label applied to the education track.
   *
   * @type {InputSignal<string>}
   */
  public readonly educationLabel: InputSignal<string> = input.required<string>();

  /**
   * Property experienceLabel
   * @readonly
   *
   * @description
   * Accessible label applied to the experience track.
   *
   * @type {InputSignal<string>}
   */
  public readonly experienceLabel: InputSignal<string> = input.required<string>();

  /**
   * Property tracks
   * @readonly
   *
   * @description
   * Creates stable education and experience groups, sorting each shared input set by start year.
   *
   * @type {Signal<readonly [TimelineTrack, TimelineTrack]>}
   */
  protected readonly tracks: Signal<readonly [TimelineTrack, TimelineTrack]> = computed<
    readonly [TimelineTrack, TimelineTrack]
  >((): readonly [TimelineTrack, TimelineTrack] =>
    timelineTracks(this.steps(), this.educationLabel(), this.experienceLabel()),
  );

  /**
   * Property year
   * @readonly
   *
   * @description
   * Formats numeric years to two decimal places to match the data attributes consumed by the scene.
   *
   * @type {(value: number) => string}
   */
  protected readonly year: (value: number) => string = (value: number): string => value.toFixed(2);
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the canvas scene after browser rendering and releases it when the component is destroyed.
   */
  public constructor() {
    const host: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      const view: (Window & typeof globalThis) | null = host.ownerDocument.defaultView;
      if (!view || view.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      let stop: (() => void) | null = null;
      let dead: boolean = false;
      destroyRef.onDestroy((): void => {
        dead = true;
        stop?.();
      });
      const fail: () => void = (): void => host.setAttribute('data-static', '');
      import('@internal/content-web-ui/lib/timeline/renderers/parallel-scene/parallel-scene')
        .then(({ mountParallelScene }): void => {
          if (dead) return;
          stop = mountParallelScene(host);
          if (!stop) fail();
        })
        .catch(fail);
    });
  }
  // #endregion
}
