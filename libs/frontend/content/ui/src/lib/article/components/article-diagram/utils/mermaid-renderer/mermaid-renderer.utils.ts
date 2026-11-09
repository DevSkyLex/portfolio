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
  const surface: string = token('--surface-sunk');
  const node: string = token('--surface-raised');
  const alternateSurface: string = token('--surface');
  const ink: string = token('--fg');
  const line: string = token('--fg-muted');
  const border: string = token('--border');
  const cardRadius: string = token('--radius-xl');
  const labelRadius: string = token('--radius-xs');
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
      'look',
      'themeVariables',
      'themeCSS',
      'fontFamily',
      'altFontFamily',
    ],
    theme: 'base',
    // The default Neo look adds gradient borders and shadow filters to rectangular nodes.
    look: 'classic',
    fontFamily,
    flowchart: {
      curve: 'rounded',
      minNodeWidth: 112,
      nodeSpacing: 24,
      padding: 9,
      rankSpacing: 40,
      wrappingWidth: 140,
    },
    themeVariables: {
      darkMode: dark,
      fontSize: token('--text-control') || '15px',
      background: surface,
      primaryColor: node,
      primaryBorderColor: border,
      primaryTextColor: ink,
      secondaryColor: alternateSurface,
      secondaryBorderColor: border,
      secondaryTextColor: ink,
      tertiaryColor: surface,
      tertiaryBorderColor: border,
      tertiaryTextColor: ink,
      textColor: ink,
      lineColor: line,
      edgeLabelBackground: node,
      actorBkg: node,
      actorBorder: border,
      actorTextColor: ink,
      actorLineColor: line,
      signalColor: line,
      signalTextColor: ink,
      noteBkgColor: alternateSurface,
      noteBorderColor: border,
      noteTextColor: ink,
    },
    // Mermaid scopes this stylesheet inside the SVG, where page CSS variables do not resolve.
    themeCSS: `
      .node rect.label-container:not([rx]),
      .node rect.label-container[rx="0"],
      rect.actor {
        rx: ${cardRadius};
        ry: ${cardRadius};
      }
      .flowchart-link {
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .flowchart-link.edge-thickness-normal {
        stroke-width: 1.25px;
      }
      marker[id$="-pointEnd"] .arrowMarkerPath,
      marker[id$="-pointStart"] .arrowMarkerPath {
        stroke-width: 0 !important;
        transform: translate(1px, 1px) scale(0.8);
      }
      .edgeLabel rect {
        rx: ${labelRadius};
        ry: ${labelRadius};
        opacity: 1;
      }
    `,
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
