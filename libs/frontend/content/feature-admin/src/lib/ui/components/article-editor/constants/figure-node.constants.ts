import { Node, type NodeViewRenderer } from '@tiptap/core';
import type { DOMOutputSpec, Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ARTICLE_TYPOGRAPHY } from '@vfortin/content-web-ui';
import { badgeVariants } from '@vfortin/ui';

/**
 * Constant MEDIA_ID
 *
 * @description
 * Shape of an uploaded media id (UUID), the only `data-media` value a pasted figure may carry.
 */
const MEDIA_ID: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Constant MEDIA_SRC
 *
 * @description
 * Same-origin WebP URL of an uploaded media, the only image URL a figure displays.
 */
const MEDIA_SRC: RegExp = /^\/media\/[0-9a-f-]{36}\.webp$/;

/**
 * Function figureView
 *
 * @description
 * Draws a figure in the editor as the public article shows it (`figure > img + figcaption`), a
 * placeholder when its media URL is unknown, and a warning badge while its alternative text is empty.
 *
 * @param {ProseMirrorNode} node - Figure node.
 *
 * @returns {HTMLElement} The figure element.
 */
function figureView(node: ProseMirrorNode): HTMLElement {
  const figure: HTMLElement = document.createElement('figure');
  figure.className = `${ARTICLE_TYPOGRAPHY.figure} relative cursor-pointer rounded-xl outline-2 outline-offset-4 outline-transparent [&.ProseMirror-selectednode]:outline-accent/70`;
  figure.dataset['media'] = String(node.attrs['media']);
  const alt: string = String(node.attrs['alt'] ?? '');
  const src: unknown = node.attrs['src'];
  if (typeof src === 'string' && src !== '') {
    const image: HTMLImageElement = document.createElement('img');
    image.className = ARTICLE_TYPOGRAPHY.image;
    image.src = src;
    image.alt = alt;
    image.draggable = false;
    figure.append(image);
  } else {
    const placeholder: HTMLElement = document.createElement('div');
    placeholder.className =
      'flex aspect-video w-full items-center rounded-xl bg-surface-raised px-5 text-sm text-fg-faint';
    placeholder.textContent = $localize`:@@admin.article.figure.unavailable:Image indisponible`;
    figure.append(placeholder);
  }
  const caption: string = String(node.attrs['caption'] ?? '');
  if (caption !== '') {
    const text: HTMLElement = document.createElement('figcaption');
    text.className = ARTICLE_TYPOGRAPHY.caption;
    text.textContent = caption;
    figure.append(text);
  }
  if (alt.trim() === '') {
    figure.dataset['missingAlt'] = '';
    const badge: HTMLElement = document.createElement('span');
    badge.className = `${badgeVariants({ variant: 'warning', dot: true })} absolute top-3 left-3`;
    badge.textContent = $localize`:@@admin.article.figure.missingAlt:Texte alternatif manquant`;
    figure.append(badge);
  }
  return figure;
}

/**
 * Constant figureNodeView
 *
 * @description
 * Node view redrawing the figure whenever its attributes change; the figure is an atom, so the view
 * owns its whole content.
 */
const figureNodeView: NodeViewRenderer = ({ node }) => {
  const dom: HTMLElement = figureView(node);
  return {
    get dom(): HTMLElement {
      return dom;
    },
    update: (next: ProseMirrorNode): boolean => {
      if (next.type !== node.type) return false;
      const fresh: HTMLElement = figureView(next);
      dom.replaceChildren(...fresh.childNodes);
      dom.dataset['media'] = fresh.dataset['media'];
      if (fresh.dataset['missingAlt'] === undefined) delete dom.dataset['missingAlt'];
      else dom.dataset['missingAlt'] = '';
      return true;
    },
    ignoreMutation: (): boolean => true,
  };
};

/**
 * Constant FigureNode
 *
 * @description
 * Top-level image block of an article (D40), an atom referencing an uploaded media with its alternative
 * text and caption; `src` is a display attribute that the revision drops. Only `figure[data-media]` is
 * parsed, so a pasted foreign `<img>` is ignored and every image goes through the upload.
 */
export const FigureNode: Node = Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  isolating: true,

  addAttributes() {
    return {
      media: { default: null, rendered: false },
      alt: { default: '', rendered: false },
      caption: { default: '', rendered: false },
      src: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-media]',
        getAttrs: (element: HTMLElement): Record<string, string | null> | false => {
          const media: string | null = element.getAttribute('data-media');
          if (!media || !MEDIA_ID.test(media)) return false;
          const src: string | null | undefined = element.querySelector('img')?.getAttribute('src');
          return {
            media,
            alt: element.querySelector('img')?.getAttribute('alt') ?? '',
            caption: element.querySelector('figcaption')?.textContent ?? '',
            src: src && MEDIA_SRC.test(src) ? src : null,
          };
        },
      },
    ];
  },

  renderHTML({ node }: { node: ProseMirrorNode }): DOMOutputSpec {
    const src: unknown = node.attrs['src'];
    const image: [string, Record<string, string>] = [
      'img',
      typeof src === 'string' && src !== ''
        ? { src, alt: String(node.attrs['alt']), class: ARTICLE_TYPOGRAPHY.image }
        : { alt: String(node.attrs['alt']), class: ARTICLE_TYPOGRAPHY.image },
    ];
    const caption: string = String(node.attrs['caption'] ?? '');
    const attributes: Record<string, string> = {
      'data-media': String(node.attrs['media']),
      class: ARTICLE_TYPOGRAPHY.figure,
    };
    return caption === ''
      ? ['figure', attributes, image]
      : [
          'figure',
          attributes,
          image,
          ['figcaption', { class: ARTICLE_TYPOGRAPHY.caption }, caption],
        ];
  },

  addNodeView() {
    return figureNodeView;
  },
});
