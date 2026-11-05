import type { ErrorCopy } from '@internal/web-shell/lib/pages/error-page/models/error-copy/error-copy.interface';
import type { CodeGrid } from '@internal/web-shell/lib/pages/error-page/models/code-grid/code-grid.interface';

import {
  type InputSignal,
  type Signal,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  RESPONSE_INIT,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { lucideArrowLeft, lucideMail, lucideRotateCw } from '@ng-icons/lucide';
import { type DecoGlyph, ButtonDirective, DecoComponent } from '@vfortin/ui';
import { CODE_CELL_CLASSES } from '@internal/web-shell/lib/pages/error-page/constants/code-cell-classes.constants';
import { ERROR_COPY } from '@internal/web-shell/lib/pages/error-page/constants/error-copy.constants';
import { ERROR_DECO_GLYPHS } from '@internal/web-shell/lib/pages/error-page/constants/error-deco-glyphs.constants';
import {
  ERROR_CODES,
  type ErrorCode,
} from '@internal/web-shell/lib/pages/error-page/models/error-code.model';
import { codeCells } from '@internal/web-shell/lib/pages/error-page/utils/code-cells/code-cells.utils';

/**
 * Component ErrorPageComponent
 * @class ErrorPageComponent
 *
 * @description
 * Renders a localized prerendered error page with a bitmap code, aurora reveal, retry action for
 * transient failures, and the shell's minimal footer layout.
 */
@Component({
  selector: 'app-error-page',
  imports: [ButtonDirective, DecoComponent, NgIcon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative flex flex-1 items-center overflow-hidden py-24 @max-[768px]:py-12' },
  template: `
    <ui-deco [glyphs]="deco" />
    <div
      class="relative wrap grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-24 @max-[1024px]:grid-cols-1 @max-[1024px]:gap-12"
    >
      <div
        class="grid grid-cols-[repeat(var(--cols),var(--cell))] gap-(--gap) justify-self-end [--cell:24px] [--gap:6px] @max-[1024px]:justify-self-start @max-[1024px]:[--cell:16px] @max-[1024px]:[--gap:5px] @max-[768px]:[--cell:12px] @max-[768px]:[--gap:4px]"
        [style.--cols]="grid().columns"
        aria-hidden="true"
      >
        @for (cell of grid().cells; track $index) {
          <span
            class="relative size-(--cell) before:absolute"
            [class]="cells[cell.state]"
            [style.--t]="cell.tint"
            [style.--k]="cell.rank"
          ></span>
        }
      </div>
      <div class="order-first @max-[1024px]:order-none">
        <h1 class="mb-4 font-display text-d1 text-fg @max-[768px]:text-d1-sm">
          <span class="sr-only" i18n="@@error.label">Erreur {{ known() }} : </span
          >{{ copy().title }}
        </h1>
        <p class="max-w-[460px] text-[20px]/8 text-pretty text-fg-muted @max-[768px]:text-[18px]/7">
          {{ copy().text }}
        </p>
        <div
          class="mt-12 flex flex-wrap gap-3 @max-[768px]:w-full @max-[768px]:flex-col @max-[768px]:items-stretch"
        >
          @if (copy().retry) {
            <button class="px-6 @max-[768px]:w-full" uiBtn type="button" (click)="retry()">
              <ng-icon [svg]="icons.retry" size="16" strokeWidth="1.5" aria-hidden="true" />
              <ng-container i18n="@@error.retry">Réessayer</ng-container>
            </button>
          }
          <a
            class="px-6 @max-[768px]:w-full"
            uiBtn
            [variant]="copy().retry ? 'secondary' : 'primary'"
            routerLink="/"
          >
            <ng-icon [svg]="icons.home" size="16" strokeWidth="1.5" aria-hidden="true" />
            <ng-container i18n="@@error.home">Retour à l'accueil</ng-container>
          </a>
          <a
            class="px-6 @max-[768px]:w-full"
            uiBtn
            variant="secondary"
            href="mailto:contact@valentin-fortin.pro"
          >
            <ng-icon [svg]="icons.mail" size="16" strokeWidth="1.5" aria-hidden="true" />
            <ng-container i18n="@@error.contact">Me contacter</ng-container>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class ErrorPageComponent {
  // #region Properties
  /**
   * Property code
   * @readonly
   *
   * @description
   * Error code route input, defaulting to not found when the route supplies no value.
   *
   * @type {InputSignal<string>}
   */
  public readonly code: InputSignal<string> = input<string>('404');

  /**
   * Property document
   * @readonly
   *
   * @description
   * Browser document used by the retry action to reload the current URL.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property title
   * @readonly
   *
   * @description
   * Angular title service updated after the selected error copy is resolved.
   *
   * @type {Title}
   */
  private readonly title: Title = inject<Title>(Title);

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Icons rendered beside retry, home, and contact actions.
   *
   * @type {{ retry: typeof lucideRotateCw; home: typeof lucideArrowLeft; mail: typeof lucideMail }}
   */
  protected readonly icons: {
    retry: typeof lucideRotateCw;
    home: typeof lucideArrowLeft;
    mail: typeof lucideMail;
  } = { retry: lucideRotateCw, home: lucideArrowLeft, mail: lucideMail };

  /**
   * Property deco
   * @readonly
   *
   * @description
   * Decorative glyphs displayed around the error content.
   *
   * @type {readonly DecoGlyph[]}
   */
  protected readonly deco: readonly DecoGlyph[] = ERROR_DECO_GLYPHS;

  /**
   * Property cells
   * @readonly
   *
   * @description
   * Cell-state classes applied to the error-code bitmap.
   *
   * @type {typeof CODE_CELL_CLASSES}
   */
  protected readonly cells: typeof CODE_CELL_CLASSES = CODE_CELL_CLASSES;

  /**
   * Property known
   * @readonly
   *
   * @description
   * Supported route code after falling back to 404 for unknown input.
   *
   * @type {Signal<ErrorCode>}
   */
  protected readonly known: Signal<ErrorCode> = computed<ErrorCode>(() =>
    (ERROR_CODES as readonly string[]).includes(this.code()) ? (this.code() as ErrorCode) : '404',
  );

  /**
   * Property copy
   * @readonly
   *
   * @description
   * Localized content and retry metadata associated with the resolved error code.
   *
   * @type {Signal<ErrorCopy>}
   */
  protected readonly copy: Signal<ErrorCopy> = computed<ErrorCopy>(() => ERROR_COPY[this.known()]);

  /**
   * Property grid
   * @readonly
   *
   * @description
   * Row-major bitmap grid generated for the resolved error code.
   *
   * @type {Signal<CodeGrid>}
   */
  protected readonly grid: Signal<CodeGrid> = computed<CodeGrid>(() => codeCells(this.known()));
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Keeps the document title aligned with the localized error code, including reused error routes.
   */
  public constructor() {
    const response: ResponseInit | null = inject<ResponseInit | null>(RESPONSE_INIT, {
      optional: true,
    });
    effect(() => {
      this.title.setTitle(`${this.copy().title} — Valentin Fortin`);
      if (response) {
        response.status = Number(this.known());
        const headers: Headers = new Headers(response.headers);
        headers.set('X-Robots-Tag', 'noindex');
        response.headers = headers;
      }
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method retry
   * @method retry
   *
   * @description
   * Reloads the current document for errors whose copy offers a retry action.
   *
   * @returns {void} Starts a full-document reload of the current error URL.
   */
  protected retry(): void {
    this.document.location.reload();
  }
  // #endregion
}
