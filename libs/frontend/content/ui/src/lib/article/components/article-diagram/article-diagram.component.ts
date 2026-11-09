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
import type { RenderedDiagram } from '@internal/content-web-ui/lib/article/components/article-diagram/utils/mermaid-renderer/mermaid-renderer.utils';
import { ARTICLE_TYPOGRAPHY } from '@internal/content-web-ui/lib/article/constants/article-typography.constants';

type RenderedSource = { readonly source: string; readonly image: RenderedDiagram };

/** Renders a Mermaid block after hydration and keeps the readable source as a fallback. */
@Component({
  selector: 'content-article-diagram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    @if (diagram(); as image) {
      <figure class="m-0 flex justify-center rounded-xl border border-border bg-surface-raised p-5">
        <img
          class="block h-auto max-w-full"
          [src]="image.url"
          [width]="image.width"
          [height]="image.height"
          [alt]="image.description || defaultDescription"
          (error)="rendered.set(null)"
        />
      </figure>
    } @else {
      <pre [class]="fallbackClass"><code>{{ source() }}</code></pre>
    }
  `,
})
export class ArticleDiagramComponent {
  public readonly source: InputSignal<string> = input.required<string>();

  protected readonly fallbackClass: string = ARTICLE_TYPOGRAPHY.codeBlock;
  protected readonly defaultDescription: string = $localize`:@@project.diagram.description:Diagramme Mermaid`;
  protected readonly rendered: WritableSignal<RenderedSource | null> = signal(null);
  protected readonly diagram: Signal<RenderedDiagram | null> = computed(() => {
    const rendered: RenderedSource | null = this.rendered();
    return rendered?.source === this.source() ? rendered.image : null;
  });

  private readonly document: Document = inject<Document>(DOCUMENT);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  private readonly theme: WritableSignal<string | null> = signal(null);

  public constructor() {
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
