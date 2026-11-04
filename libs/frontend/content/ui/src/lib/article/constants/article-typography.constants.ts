import type { ArticleCodeTokenKind } from '@vfortin/content-web-model';

/**
 * Constant ARTICLE_TYPOGRAPHY
 *
 * @description
 * Classes of every node of an article document (D40), shared by the public renderer and the
 * administrator editor so that the editor shows the published look. The heading sizes follow the
 * article titles of the "Portfolio — One page v2" mockup and need a `@container/page` ancestor.
 *
 * `codeBlock` is a whole code box (the editor's `<pre>`); the public page frames its code in
 * `codeFrame`, a header row (language, copy button and status) above `codePre`. `codeTokens` colours
 * the highlighted runs by kind with text tokens of 4.5:1 or more on `surface-raised` in both themes
 * (the light aurora cyan, 4.3:1, is left out).
 */
export const ARTICLE_TYPOGRAPHY = {
  flow: 'flex flex-col gap-4',
  h2: 'scroll-mt-28 font-display text-[32px]/[38px] font-semibold tracking-[-0.02em] text-balance text-fg @max-[768px]/page:text-[26px]/8',
  h3: 'scroll-mt-28 pt-2 font-display text-[22px]/[28px] font-semibold tracking-[-0.01em] text-balance text-fg',
  paragraph: 'max-w-measure text-body',
  bulletList: 'flex max-w-measure flex-col gap-3',
  bulletItem:
    'relative pl-[22px] text-body text-fg before:absolute before:top-[11px] before:left-0.5 before:size-1.5 before:bg-aurora-violet',
  orderedList: 'flex max-w-measure list-decimal flex-col gap-3 pl-6 marker:text-fg-muted',
  orderedItem: 'pl-1 text-body text-fg',
  nestedList: 'mt-3',
  blockquote:
    'flex max-w-measure flex-col gap-3 border-l-2 border-border-strong pl-6 text-fg-muted',
  codeBlock:
    'max-w-measure overflow-x-auto rounded-xl bg-surface-raised p-5 font-mono text-[13px]/6 text-fg',
  codeFrame: 'flex max-w-measure flex-col overflow-hidden rounded-xl bg-surface-raised',
  codeHeader: 'flex min-h-10 items-center gap-3 border-b border-border py-1.5 pr-1.5 pl-5',
  codeLanguage: 'font-mono text-xs/5 text-fg-muted',
  codeStatus: 'ml-auto text-xs/5 text-fg-muted',
  codePre: 'overflow-x-auto p-5 font-mono text-[13px]/6 text-fg',
  codeTokens: {
    keyword: 'text-aurora-violet',
    string: 'text-success-ink',
    number: 'text-warning-ink',
    literal: 'text-warning-ink',
    comment: 'text-fg-faint italic',
    function: 'text-info-ink',
    type: 'text-aurora-blue',
    variable: 'text-aurora-pink',
    property: 'text-aurora-pink',
    operator: 'text-fg-muted',
    punctuation: 'text-fg-muted',
    tag: 'text-danger-ink',
    attribute: 'text-warning-ink',
    meta: 'text-fg-muted',
  } satisfies Readonly<Record<ArticleCodeTokenKind, string>>,
  inlineCode: 'rounded-xs bg-surface-raised px-1.5 py-0.5 font-mono text-[0.85em] text-fg',
  bold: 'font-semibold text-fg',
  italic: 'italic',
  link: 'text-fg underline decoration-fg-muted/60 underline-offset-4 transition-[text-decoration-color] duration-(--dur-pop) ease-orbit hover:decoration-current motion-reduce:transition-none',
  horizontalRule: 'my-4 max-w-measure border-0 border-t border-border',
  figure: 'm-0 flex flex-col gap-3 py-2',
  image: 'h-auto w-full rounded-xl bg-surface-raised',
  caption: 'text-sm/5 text-fg-muted',
} as const;
