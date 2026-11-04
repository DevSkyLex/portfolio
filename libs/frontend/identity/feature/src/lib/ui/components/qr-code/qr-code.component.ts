import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { type QrCodeGenerateResult, encode } from 'uqr';
import { toQrPath } from '@internal/identity-web-feature/lib/utils/qr-path/qr-path.utils';

/**
 * Constant QUIET_ZONE
 *
 * @description
 * Light margin around the code in modules: four, the minimum the QR specification asks for.
 */
const QUIET_ZONE: number = 4;

/**
 * Component QrCodeComponent
 * @class QrCodeComponent
 *
 * @description
 * Renders a text as a QR code in an Angular SVG template (no `innerHTML`): one `<path>` of dark
 * modules over a light square with its quiet zone. The colours swap tokens between themes so the
 * code stays dark on light in both, which authenticator scanners expect.
 */
@Component({
  selector: 'identity-qr-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <svg
      class="block size-full"
      role="img"
      shape-rendering="crispEdges"
      [attr.viewBox]="viewBox()"
      [attr.aria-label]="label()"
    >
      <rect
        class="fill-fg light:fill-surface"
        [attr.x]="-quietZone"
        [attr.y]="-quietZone"
        [attr.width]="extent()"
        [attr.height]="extent()"
      />
      <path class="fill-surface light:fill-fg" [attr.d]="path()" />
    </svg>
  `,
})
export class QrCodeComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Text encoded in the code, such as an `otpauth://` URI.
   *
   * @type {InputSignal<string>}
   */
  public readonly value: InputSignal<string> = input.required<string>();

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the image.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property quietZone
   * @readonly
   *
   * @description
   * Margin in modules, read by the template.
   */
  protected readonly quietZone: number = QUIET_ZONE;

  /**
   * Property code
   * @readonly
   *
   * @description
   * Module matrix without border, medium error correction.
   *
   * @type {Signal<QrCodeGenerateResult>}
   */
  private readonly code: Signal<QrCodeGenerateResult> = computed<QrCodeGenerateResult>(() =>
    encode(this.value(), { ecc: 'M', border: 0 }),
  );

  /**
   * Property extent
   * @readonly
   *
   * @description
   * Side of the drawn square in modules, quiet zone included.
   *
   * @type {Signal<number>}
   */
  protected readonly extent: Signal<number> = computed<number>(
    () => this.code().size + 2 * QUIET_ZONE,
  );

  /**
   * Property viewBox
   * @readonly
   *
   * @description
   * View box starting at the outer edge of the quiet zone.
   *
   * @type {Signal<string>}
   */
  protected readonly viewBox: Signal<string> = computed<string>(
    () => `${-QUIET_ZONE} ${-QUIET_ZONE} ${this.extent()} ${this.extent()}`,
  );

  /**
   * Property path
   * @readonly
   *
   * @description
   * Dark modules as a single path.
   *
   * @type {Signal<string>}
   */
  protected readonly path: Signal<string> = computed<string>(() => toQrPath(this.code().data));
  // #endregion
}
