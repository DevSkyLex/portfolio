import mermaid, { type RenderResult } from 'mermaid';

/** The static SVG image and its intrinsic dimensions and accessible description. */
export interface RenderedDiagram {
  readonly url: string;
  readonly width: number;
  readonly height: number;
  readonly description: string;
}

const MAX_SOURCE_LENGTH: number = 10_000;
let nextId: number = 0;

// Mermaid's site configuration is shared. Finish a render before initializing the next palette.
let renderQueue: Promise<void> = Promise.resolve();

/** Queues a diagram only while its block and theme are current. */
export function renderMermaid(
  document: Document,
  source: string,
  dark: boolean,
  abort: AbortSignal,
): Promise<RenderedDiagram | null> {
  const render: Promise<RenderedDiagram | null> = renderQueue.then(async () => {
    if (abort.aborted || source.length > MAX_SOURCE_LENGTH) return null;
    return renderImage(document, source, dark);
  });
  renderQueue = render.then(
    (): void => undefined,
    (): void => undefined,
  );
  return render;
}

async function renderImage(
  document: Document,
  source: string,
  dark: boolean,
): Promise<RenderedDiagram | null> {
  const tokens: CSSStyleDeclaration = getComputedStyle(document.documentElement);
  const token = (name: string): string => tokens.getPropertyValue(name).trim();
  const surface: string = token('--surface-raised');
  const node: string = token('--surface');
  const ink: string = token('--fg');
  const line: string = token('--fg-muted');
  const violet: string = token('--aurora-violet');
  const blue: string = token('--aurora-blue');
  const pink: string = token('--aurora-pink');
  const fontFamily: string = token('--font-sans') || 'system-ui, sans-serif';
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    maxTextSize: MAX_SOURCE_LENGTH,
    maxEdges: 200,
    htmlLabels: false,
    secure: [
      'secure',
      'securityLevel',
      'startOnLoad',
      'maxTextSize',
      'maxEdges',
      'suppressErrorRendering',
      'htmlLabels',
      'flowchart',
      'dompurifyConfig',
      'theme',
      'themeVariables',
      'themeCSS',
      'fontFamily',
      'altFontFamily',
    ],
    theme: 'base',
    fontFamily,
    themeVariables: {
      darkMode: dark,
      background: surface,
      primaryColor: node,
      primaryBorderColor: violet,
      primaryTextColor: ink,
      secondaryColor: node,
      secondaryBorderColor: blue,
      secondaryTextColor: ink,
      tertiaryColor: surface,
      tertiaryBorderColor: pink,
      tertiaryTextColor: ink,
      textColor: ink,
      lineColor: line,
      edgeLabelBackground: surface,
      actorBkg: node,
      actorBorder: violet,
      actorTextColor: ink,
      actorLineColor: line,
      signalColor: line,
      signalTextColor: ink,
      noteBkgColor: surface,
      noteBorderColor: blue,
      noteTextColor: ink,
    },
  });

  // Mermaid measures SVG text during layout, so the temporary tree must be attached.
  const stage: HTMLDivElement = document.createElement('div');
  stage.inert = true;
  stage.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none';
  document.body.append(stage);
  try {
    const { svg }: RenderResult = await mermaid.render(
      `_article-mermaid-${++nextId}`,
      source,
      stage,
    );
    const root: Element = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
    const [, , width = 0, height = 0] = (root.getAttribute('viewBox') ?? '')
      .split(/[\s,]+/)
      .map(Number);
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height)))
      return null;
    const description: string =
      root.querySelector('desc')?.textContent?.trim() ||
      root.querySelector('title')?.textContent?.trim() ||
      '';
    // SVG stays in the browser's image context so diagram markup cannot become interactive.
    return {
      url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      width: Math.ceil(width),
      height: Math.ceil(height),
      description,
    };
  } finally {
    stage.remove();
  }
}
