import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Class SiteLogoComponent
 * @class SiteLogoComponent
 *
 * @description
 * Brand mark of the site ("Strates", `branding/generate.py` at the repository root): four bands of a
 * disc in the aurora hues, cut by a centred hole and tilted by 14 degrees. Its own geometry, found in no
 * icon pack, hence inline paths instead of an `ng-icon`; the fills follow the theme through the aurora
 * tokens. Decorative: the link around it carries the name. Size it with the host classes.
 */
@Component({
  selector: 'app-site-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg class="size-full" viewBox="0 0 100 100" focusable="false">
      <g transform="rotate(-14 50 50)">
        <path
          class="fill-aurora-pink"
          d="M50 14A36 36 0 0 1 80.1 30.26A5 5 0 0 1 75.92 38L61.17 38A1.6 1.6 0 0 1 60.16 37.64A16 16 0 0 0 39.84 37.64A1.6 1.6 0 0 1 38.83 38L24.08 38A5 5 0 0 1 19.9 30.26A36 36 0 0 1 50 14Z"
        />
        <path
          class="fill-aurora-violet"
          d="M19.15 42L33.6 42A1.6 1.6 0 0 1 35.1 44.18A16 16 0 0 0 35.1 55.82A1.6 1.6 0 0 1 33.6 58L19.15 58A5 5 0 0 1 14.17 53.48A36 36 0 0 1 14.17 46.52A5 5 0 0 1 19.15 42Z"
        />
        <path
          class="fill-aurora-violet"
          d="M66.4 42L80.85 42A5 5 0 0 1 85.83 46.52A36 36 0 0 1 85.83 53.48A5 5 0 0 1 80.85 58L66.4 58A1.6 1.6 0 0 1 64.9 55.82A16 16 0 0 0 64.9 44.18A1.6 1.6 0 0 1 66.4 42Z"
        />
        <path
          class="fill-aurora-blue"
          d="M22.29 62L38.83 62A1.6 1.6 0 0 1 39.84 62.36A16 16 0 0 0 60.16 62.36A1.6 1.6 0 0 1 61.17 62L77.71 62A4 4 0 0 1 81.18 68A36 36 0 0 1 78.54 71.94A4 4 0 0 1 75.37 73.5L24.63 73.5A4 4 0 0 1 21.46 71.94A36 36 0 0 1 18.82 68A4 4 0 0 1 22.29 62Z"
        />
        <path
          class="fill-aurora-cyan"
          d="M33.1 77.5L66.9 77.5A2 2 0 0 1 67.9 81.24A36 36 0 0 1 50 86A36 36 0 0 1 32.1 81.24A2 2 0 0 1 33.1 77.5Z"
        />
      </g>
    </svg>
  `,
})
export class SiteLogoComponent {}
