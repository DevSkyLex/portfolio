import {
  Directive,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { cn } from '@internal/ui/lib/class-names/class-names.utils';
import type { AvatarImageStatus } from '@internal/ui/lib/avatar/models/avatar/avatar-image-status.type';
import { type AvatarSize, avatarVariants } from '@internal/ui/lib/avatar/constants/avatar.variants';

/**
 * Directive AvatarDirective
 * @class AvatarDirective
 *
 * @description
 * Owns the avatar size and image lifecycle state shared by the image and fallback directives. The
 * fallback remains visible until an image loads successfully.
 */
@Directive({
  selector: '[uiAvatar]',
  host: { '[class]': 'classes()', '[attr.data-size]': 'size()', 'data-slot': 'avatar' },
})
export class AvatarDirective {
  // #region Properties
  /**
   * Property size
   * @readonly
   *
   * @description
   * Avatar dimensions and fallback text scale selected from the supported sizes.
   *
   * @type {InputSignal<AvatarSize>}
   */
  public readonly size: InputSignal<AvatarSize> = input<AvatarSize>('md');

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the selected avatar styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property imageStatus
   *
   * @description
   * Current image lifecycle state; the image directive updates it from source and load events.
   *
   * @type {WritableSignal<AvatarImageStatus>}
   */
  public readonly imageStatus: WritableSignal<AvatarImageStatus> =
    signal<AvatarImageStatus>('idle');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Circular avatar base styles combined with the selected size and caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(avatarVariants({ size: this.size() }), this.class()),
  );
  // #endregion
}

/**
 * Directive AvatarImageDirective
 * @class AvatarImageDirective
 *
 * @description
 * Displays an image only after successful loading and updates the parent avatar state on source,
 * load, and error changes.
 */
@Directive({
  selector: 'img[uiAvatarImage]',
  host: {
    '[class]': 'classes()',
    '[attr.src]': 'src() || null',
    '[attr.data-status]': 'avatar.imageStatus()',
    '(load)': 'avatar.imageStatus.set("loaded")',
    '(error)': 'avatar.imageStatus.set("error")',
    'data-slot': 'avatar-image',
  },
})
export class AvatarImageDirective {
  // #region Properties
  /**
   * Property avatar
   * @readonly
   *
   * @description
   * Parent avatar whose image state controls the image and fallback visibility.
   *
   * @type {AvatarDirective}
   */
  protected readonly avatar: AvatarDirective = inject<AvatarDirective>(AvatarDirective);

  /**
   * Property image
   * @readonly
   *
   * @description
   * Native image element inspected after rendering to handle an already completed cached request.
   *
   * @type {HTMLImageElement}
   */
  private readonly image: HTMLImageElement =
    inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  /**
   * Property src
   * @readonly
   *
   * @description
   * Image URL; null or undefined leaves the avatar in its fallback state.
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly src: InputSignal<string | null | undefined> = input<string | null | undefined>();

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the image sizing and visibility styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Image crop and size styles, hidden until load completion, combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'aspect-square size-full object-cover',
      this.avatar.imageStatus() !== 'loaded' && 'hidden',
      this.class(),
    ),
  );
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Tracks source changes and reconciles cached image completion after the first render.
   */
  public constructor() {
    effect(() => this.avatar.imageStatus.set(this.src() ? 'loading' : 'error'));

    // A cached image may finish before the load listener is attached.
    afterNextRender(() => {
      if (this.src() && this.image.complete) {
        this.avatar.imageStatus.set(this.image.naturalWidth > 0 ? 'loaded' : 'error');
      }
    });
  }
  // #endregion
}

/**
 * Directive AvatarFallbackDirective
 * @class AvatarFallbackDirective
 *
 * @description
 * Renders initials or other fallback content until the parent avatar image loads successfully.
 */
@Directive({
  selector: '[uiAvatarFallback]',
  host: { '[class]': 'classes()', 'data-slot': 'avatar-fallback' },
})
export class AvatarFallbackDirective {
  // #region Properties
  /**
   * Property avatar
   * @readonly
   *
   * @description
   * Parent avatar state used to hide the fallback after a successful image load.
   *
   * @type {AvatarDirective}
   */
  private readonly avatar: AvatarDirective = inject<AvatarDirective>(AvatarDirective);

  /**
   * Property class
   * @readonly
   *
   * @description
   * Additional classes merged with the fallback content alignment styles.
   *
   * @type {InputSignal<string>}
   */
  public readonly class: InputSignal<string> = input<string>('');

  /**
   * Property classes
   * @readonly
   *
   * @description
   * Centered uppercase fallback styles, hidden after the image loads, combined with caller classes.
   *
   * @type {Signal<string>}
   */
  protected readonly classes: Signal<string> = computed<string>(() =>
    cn(
      'flex size-full items-center justify-center uppercase',
      this.avatar.imageStatus() === 'loaded' && 'hidden',
      this.class(),
    ),
  );
  // #endregion
}
