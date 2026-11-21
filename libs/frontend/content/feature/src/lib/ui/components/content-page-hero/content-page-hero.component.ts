import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft } from '@ng-icons/lucide';
import { AsciiPlanetComponent } from '@vfortin/content-web-ui';

/** Shared public heading and sky for collection and detail pages. */
@Component({
  selector: 'content-page-hero',
  imports: [AsciiPlanetComponent, NgIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="relative pt-8 pb-16 shadow-[0_-1px_0_var(--surface)]">
      <div
        class="pointer-events-auto absolute inset-x-0 top-0 -bottom-[240px] overflow-hidden mask-[linear-gradient(to_bottom,#000_calc(100%-240px),transparent)] opacity-90 [&_canvas]:mask-[linear-gradient(to_bottom,#000_40%,transparent_96%)]"
        aria-hidden="true"
      >
        <content-ascii-planet forms="squares" [scale]="0.55" [lift]="0.08" [height]="640" />
      </div>
      <div class="relative z-1 wrap">
        <a
          class="inline-flex min-h-11 items-center gap-2 text-[15px]/5 font-medium text-fg-muted transition-colors hover:text-fg"
          [routerLink]="backLink()"
          [queryParams]="backQueryParams()"
        >
          <ng-icon [svg]="backIcon" size="16" strokeWidth="2.25" aria-hidden="true" />
          {{ backLabel() }}
        </a>

        <header
          class="mt-12 flex max-w-[980px] flex-col gap-6 @max-[768px]/page:mt-6 @max-[768px]/page:gap-4"
        >
          <h1
            class="overflow-hidden pb-[0.08em] font-display text-[clamp(36px,7cqi,104px)] leading-none font-semibold tracking-[-0.04em] text-fg"
          >
            <span
              class="inline-block transition-transform duration-(--dur-reveal) ease-orbit motion-reduce:transition-none starting:translate-y-[105%]"
              >{{ title() }}</span
            >
          </h1>
          <ng-content />
        </header>
      </div>
    </section>
  `,
})
export class ContentPageHeroComponent {
  public readonly title: InputSignal<string> = input.required<string>();
  public readonly backLink: InputSignal<string> = input.required<string>();
  public readonly backQueryParams: InputSignal<Params | null> = input<Params | null>(null);
  public readonly backLabel: InputSignal<string> = input.required<string>();

  protected readonly backIcon: typeof lucideArrowLeft = lucideArrowLeft;
}
