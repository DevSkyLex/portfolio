import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  afterNextRender,
  inject,
  viewChild,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AsciiPlanetComponent } from '@vfortin/content-web-ui';
import { ButtonDirective, GlyphComponent, ScrollFrameService } from '@vfortin/ui';
import type { HeroLetter } from '@internal/content-web-feature/lib/ui/sections/hero-section/models/hero-letter/hero-letter.interface';
import { heroLetters } from '@internal/content-web-feature/lib/ui/sections/hero-section/utils/hero-letters/hero-letters.utils';

/**
 * Component HeroSectionComponent
 * @class HeroSectionComponent
 *
 * @description
 * Renders the greeting, the animated job title, the pinned planet and the call to action; scroll progress drives the hero exit when motion is allowed.
 */
@Component({
  selector: 'content-hero-section',
  imports: [AsciiPlanetComponent, ButtonDirective, GlyphComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero-section.component.html',
  host: { class: 'block @container' },
})
export class HeroSectionComponent {
  // #region Properties
  /**
   * Property title
   * @readonly
   *
   * @description
   * Job title displayed large, localized; assistive technologies read it whole from the heading's hidden
   * text.
   *
   * @type {string}
   */
  protected readonly title: string = $localize`:@@hero.title:Développeur web fullstack`;

  /**
   * Property words
   * @readonly
   *
   * @description
   * Title characters paired with stagger indexes, glyph shapes and aurora colors for the template.
   *
   * @type {readonly (readonly HeroLetter[])[]}
   */
  protected readonly words: readonly (readonly HeroLetter[])[] = heroLetters(this.title.split(' '));

  /**
   * Property hero
   * @readonly
   *
   * @description
   * Required hero host queried after rendering to measure scroll-linked exit progress.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly hero: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('hero');
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers scroll-frame work after the hero renders unless reduced motion is requested, and binds cleanup to the component lifecycle.
   */
  public constructor() {
    const frames: ScrollFrameService = inject<ScrollFrameService>(ScrollFrameService);
    const destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

    // Exit progress: 0 while the hero is in place, 1 once 80 % of it has left the top of the screen.
    afterNextRender((): void => {
      const win: (Window & typeof globalThis) | null =
        this.hero().nativeElement.ownerDocument.defaultView;
      if (!win || win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const el: HTMLElement = this.hero().nativeElement;
      let hp: string = '';
      el.setAttribute('data-scroll', '');
      const remove: () => void = frames.add({
        read: (): void => {
          const r: DOMRect = el.getBoundingClientRect();
          hp = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height * 0.8))).toFixed(4);
        },
        write: (): boolean => {
          if (el.style.getPropertyValue('--hp') === hp) return false;
          el.style.setProperty('--hp', hp);
          return true;
        },
      });
      destroyRef.onDestroy(remove);
    });
  }
  // #endregion
}
