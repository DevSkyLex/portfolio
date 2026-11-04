import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  PLATFORM_ID,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { ArticleCode, ArticleCodeTokenKind } from '@vfortin/content-web-model';
import { ButtonDirective } from '@vfortin/ui';
import {
  CODE_COPY_FEEDBACK_MS,
  CODE_COPY_ICON_CLASSES,
  CODE_COPY_ICONS,
  CODE_COPY_MESSAGES,
} from '@internal/content-web-ui/lib/article/components/article-code/constants/article-code.constants';
import type { CodeCopyState } from '@internal/content-web-ui/lib/article/components/article-code/models/code-copy-state.type';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

/**
 * Component ArticleCodeComponent
 * @class ArticleCodeComponent
 *
 * @description
 * Code block of a published article (D40 code block revision): a header row with the language name
 * (none for plain text), a polite status and a « Copier » button, above the code. Highlighted runs
 * render as `<span>`s coloured by kind, never through `innerHTML`; a block without runs shows its text.
 * The clipboard is only written in the browser, from the click on a hydrated page.
 */
@Component({
  selector: 'content-article-code',
  imports: [ButtonDirective, NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="typography.codeHeader">
      @if (code().language; as language) {
        <span [class]="typography.codeLanguage">{{ language }}</span>
      }
      <span role="status" [class]="typography.codeStatus">{{ message() }}</span>
      <button
        type="button"
        uiBtn
        variant="ghost"
        size="xs"
        aria-label="Copier le code"
        i18n-aria-label="@@project.code.copyLabel"
        [attr.data-state]="state()"
        (click)="copy()"
      >
        <ng-icon [svg]="icon()" [class]="iconClass()" size="14" aria-hidden="true" />
        <span i18n="@@project.code.copy">Copier</span>
      </button>
    </div>
    <pre
      [class]="typography.codePre"
    ><code>@for (token of code().tokens; track $index) {<span [class]="tokenClass(token.kind)">{{ token.text }}</span>} @empty {<ng-container>{{ code().text }}</ng-container>}</code></pre>`,
})
export class ArticleCodeComponent {
  // #region Properties
  /**
   * Property code
   * @readonly
   *
   * @description
   * Code block to render.
   *
   * @type {InputSignal<ArticleCode>}
   */
  public readonly code: InputSignal<ArticleCode> = input.required<ArticleCode>();

  /**
   * Property typography
   * @readonly
   *
   * @description
   * Classes of the article nodes, shared with the administrator editor.
   *
   * @type {typeof ARTICLE_TYPOGRAPHY}
   */
  protected readonly typography: typeof ARTICLE_TYPOGRAPHY = ARTICLE_TYPOGRAPHY;

  /**
   * Property state
   * @readonly
   *
   * @description
   * Outcome of the last copy, back to `idle` after `CODE_COPY_FEEDBACK_MS`.
   *
   * @type {WritableSignal<CodeCopyState>}
   */
  protected readonly state: WritableSignal<CodeCopyState> = signal<CodeCopyState>('idle');

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Icon of the copy button: copy, then a check or an alert.
   *
   * @type {Signal<string>}
   */
  protected readonly icon: Signal<string> = computed((): string => CODE_COPY_ICONS[this.state()]);

  /**
   * Property iconClass
   * @readonly
   *
   * @description
   * Ink of the copy icon.
   *
   * @type {Signal<string>}
   */
  protected readonly iconClass: Signal<string> = computed(
    (): string => CODE_COPY_ICON_CLASSES[this.state()],
  );

  /**
   * Property message
   * @readonly
   *
   * @description
   * Status text of the live region, empty while waiting.
   *
   * @type {Signal<string>}
   */
  protected readonly message: Signal<string> = computed(
    (): string => CODE_COPY_MESSAGES[this.state()],
  );

  /**
   * Property document
   * @readonly
   *
   * @description
   * Rendering document, whose window owns the clipboard.
   *
   * @type {Document}
   */
  private readonly document: Document = inject<Document>(DOCUMENT);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether the component runs in the browser; prerendering never touches the clipboard.
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property reset
   *
   * @description
   * Pending return to `idle`, replaced by every copy and cleared on destroy.
   *
   * @type {ReturnType<typeof setTimeout> | undefined}
   */
  private reset: ReturnType<typeof setTimeout> | undefined;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears the pending return to `idle` when the block is destroyed.
   */
  public constructor() {
    inject<DestroyRef>(DestroyRef).onDestroy((): void => clearTimeout(this.reset));
  }
  // #endregion

  // #region Methods
  /**
   * Method tokenClass
   * @method tokenClass
   *
   * @description
   * Colour classes of a highlighted run.
   *
   * @param {ArticleCodeTokenKind | null} kind - Kind of the run.
   *
   * @returns {string} Its classes; none for plain code.
   */
  protected tokenClass(kind: ArticleCodeTokenKind | null): string {
    return kind === null ? '' : ARTICLE_TYPOGRAPHY.codeTokens[kind];
  }

  /**
   * Method copy
   * @method copy
   *
   * @description
   * Writes the code to the clipboard and shows the outcome. A missing Clipboard API (an insecure
   * context) or a refused write is shown as a failure.
   *
   * @returns {Promise<void>} Settles once the outcome is shown.
   */
  protected async copy(): Promise<void> {
    if (!this.browser) return;
    const clipboard: Clipboard | undefined = this.document.defaultView?.navigator.clipboard;
    let outcome: CodeCopyState = 'failed';
    if (clipboard) {
      try {
        await clipboard.writeText(this.code().text);
        outcome = 'copied';
      } catch {
        // Refused by the browser (permission, focus): reported as a failure below.
      }
    }
    this.state.set(outcome);
    clearTimeout(this.reset);
    this.reset = setTimeout((): void => this.state.set('idle'), CODE_COPY_FEEDBACK_MS);
  }
  // #endregion
}
