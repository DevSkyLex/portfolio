import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { lucideMoveHorizontal } from '@ng-icons/lucide';
import { ButtonDirective, DialogContentDirective, DialogTriggerDirective } from '@vfortin/ui';
import {
  CODE_COPY_FEEDBACK_MS,
  CODE_COPY_ICON_CLASSES,
  CODE_COPY_ICONS,
  CODE_COPY_MESSAGES,
} from '@internal/content-web-ui/lib/article/components/article-code/constants/article-code.constants';
import type { CodeCopyState } from '@internal/content-web-ui/lib/article/components/article-code/models/code-copy-state.type';
import { ArticleDiagramViewportComponent } from '@internal/content-web-ui/lib/article/components/article-diagram/components/article-diagram-viewport/article-diagram-viewport.component';
import type { RenderedDiagram } from '@internal/content-web-ui/lib/article/components/article-diagram/utils/mermaid-renderer/mermaid-renderer.utils';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

type RenderedSource = { readonly source: string; readonly image: RenderedDiagram };

/** Renders a Mermaid block after hydration and keeps the readable source as a fallback. */
@Component({
  selector: 'content-article-diagram',
  imports: [
    ArticleDiagramViewportComponent,
    ButtonDirective,
    DialogContentDirective,
    DialogTriggerDirective,
    NgIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    @if (diagram(); as image) {
      @let description = image.description || defaultDescription;
      <content-article-diagram-viewport
        [image]="image"
        [description]="description"
        (imageFailed)="rendered.set(null)"
      >
        <button
          uiBtn
          type="button"
          variant="secondary"
          size="icon-sm"
          class="border-border bg-surface-raised"
          aria-label="Agrandir le schéma"
          i18n-aria-label="@@project.diagram.expand"
          [uiDialogTrigger]="expandedDiagram"
        >
          <ng-icon [svg]="expandIcon" size="16" aria-hidden="true" />
        </button>
        <button
          uiBtn
          type="button"
          variant="secondary"
          size="icon-sm"
          class="border-border bg-surface-raised"
          aria-label="Copier le code Mermaid"
          i18n-aria-label="@@project.diagram.copy"
          (click)="copy()"
        >
          <ng-icon [svg]="copyIcon()" [class]="copyIconClass()" size="16" aria-hidden="true" />
        </button>
        <span class="sr-only" role="status">{{ copyMessage() }}</span>
      </content-article-diagram-viewport>
      <ng-template
        uiDialogContent
        #expandedDiagram="uiDialogContent"
        [ariaLabel]="description"
        [class]="'max-w-7xl p-3 pt-12 shadow-none sm:p-5 sm:pt-12'"
      >
        <content-article-diagram-viewport
          [image]="image"
          [description]="description"
          [expanded]="true"
          (imageFailed)="rendered.set(null)"
        />
      </ng-template>
    } @else {
      <pre [class]="fallbackClass"><code>{{ source() }}</code></pre>
    }
  `,
})
export class ArticleDiagramComponent {
  public readonly source: InputSignal<string> = input.required<string>();

  protected readonly fallbackClass: string = ARTICLE_TYPOGRAPHY.codeBlock;
  protected readonly defaultDescription: string = $localize`:@@project.diagram.description:Diagramme Mermaid`;
  protected readonly expandIcon: string = lucideMoveHorizontal;
  protected readonly copyIcon: Signal<string> = computed(() => CODE_COPY_ICONS[this.copyState()]);
  protected readonly copyIconClass: Signal<string> = computed(
    () => CODE_COPY_ICON_CLASSES[this.copyState()],
  );
  protected readonly copyMessage: Signal<string> = computed(
    () => CODE_COPY_MESSAGES[this.copyState()],
  );
  protected readonly rendered: WritableSignal<RenderedSource | null> = signal(null);
  protected readonly diagram: Signal<RenderedDiagram | null> = computed(() => {
    const rendered: RenderedSource | null = this.rendered();
    return rendered?.source === this.source() ? rendered.image : null;
  });

  private readonly document: Document = inject<Document>(DOCUMENT);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  private readonly theme: WritableSignal<string | null> = signal(null);
  private readonly copyState: WritableSignal<CodeCopyState> = signal('idle');
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | undefined;

  public constructor() {
    this.destroyRef.onDestroy((): void => clearTimeout(this.copyFeedbackTimer));
    afterNextRender((): void => {
      const root: HTMLElement = this.document.documentElement;
      const readTheme = (): void => this.theme.set(root.getAttribute('data-theme'));
      const observer: MutationObserver = new MutationObserver(readTheme);
      observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
      this.destroyRef.onDestroy((): void => observer.disconnect());
      readTheme();
    });
    afterRenderEffect((onCleanup: (cleanup: () => void) => void): void => {
      const source: string = this.source();
      const dark: boolean = this.theme() !== 'light';
      if (!source.trim()) return;
      const controller: AbortController = new AbortController();
      onCleanup((): void => controller.abort());
      void this.render(source, dark, controller.signal);
    });
  }

  /** Copies the original Mermaid source, including author-supplied formatting. */
  protected async copy(): Promise<void> {
    const clipboard: Clipboard | undefined = this.document.defaultView?.navigator.clipboard;
    let outcome: CodeCopyState = 'failed';
    if (clipboard) {
      try {
        await clipboard.writeText(this.source());
        outcome = 'copied';
      } catch {
        // A denied write uses the same feedback as an unavailable clipboard.
      }
    }
    if (this.destroyRef.destroyed) return;
    this.copyState.set(outcome);
    clearTimeout(this.copyFeedbackTimer);
    this.copyFeedbackTimer = setTimeout(
      (): void => this.copyState.set('idle'),
      CODE_COPY_FEEDBACK_MS,
    );
  }

  private async render(source: string, dark: boolean, abort: AbortSignal): Promise<void> {
    try {
      const { renderMermaid } =
        await import('@internal/content-web-ui/lib/article/components/article-diagram/utils/mermaid-renderer/mermaid-renderer.utils');
      const image: RenderedDiagram | null = await renderMermaid(this.document, source, dark, abort);
      if (!abort.aborted) this.rendered.set(image === null ? null : { source, image });
    } catch {
      if (!abort.aborted) this.rendered.set(null);
    }
  }
}
