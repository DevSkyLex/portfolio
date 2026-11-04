import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  type ElementRef,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { NgIcon } from '@ng-icons/core';
import {
  lucideBold,
  lucideCaptions,
  lucideChevronDown,
  lucideCode,
  lucideHeading2,
  lucideHeading3,
  lucideImagePlus,
  lucideItalic,
  lucideLink,
  lucideList,
  lucideListOrdered,
  lucideLoaderCircle,
  lucideMinus,
  lucidePilcrow,
  lucideQuote,
  lucideRedo2,
  lucideSquareCode,
  lucideUndo2,
} from '@ng-icons/lucide';
import { Editor, type ChainedCommands, type JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import {
  ADMIN_MEDIA_LIMITS,
  type AdminMedia,
  type ArticleDocumentDraft,
  CODE_LANGUAGE_LABELS,
  emptyArticleDocument,
} from '@vfortin/content-web-data-access/admin';
import { ARTICLE_TYPOGRAPHY } from '@vfortin/content-web-ui';
import {
  ButtonDirective,
  DialogService,
  DropdownMenuImports,
  ModifierKeyService,
  ToastService,
  ToggleDirective,
  ToggleGroupDirective,
  ToggleGroupItemDirective,
  TooltipDirective,
  type DialogRef,
} from '@vfortin/ui';
import { FigureDialogComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/components/figure-dialog/figure-dialog.component';
import { LinkDialogComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/components/link-dialog/link-dialog.component';
import { ARTICLE_SHORTCUTS } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-shortcuts.constants';
import { isCodeLanguage } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-lowlight.constants';
import { IDLE_TOOLBAR } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/constants/article-toolbar.constants';
import type { ArticleImageUpload } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-image-upload.type';
import type { CodeLanguage } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/code-language.type';
import type { ArticleShortcut } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-shortcut.interface';
import type { ArticleToolbarState } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-toolbar-state.interface';
import type { FigureDialogData } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/figure-dialog-data.interface';
import type { FigureTexts } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/figure-texts.interface';
import type { LinkDialogData } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/link-dialog-data.interface';
import type { LinkDialogResult } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/link-dialog-result.type';
import { articleExtensions } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-extensions/article-extensions.utils';
import { resolveArticleShortcut } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-shortcut/article-shortcut.utils';
import { readToolbar } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-toolbar/article-toolbar.utils';
import { imageFileError } from '@internal/content-web-feature-admin/lib/utils/image-file/image-file.utils';

/**
 * Component ArticleEditorComponent
 * @class ArticleEditorComponent
 *
 * @description
 * WYSIWYG editor of one article document (D40), bound with `[formField]`: a TipTap editor whose nodes
 * carry the public article classes inside a `@container/page` wrapper, so that the editing surface is
 * the preview. A sticky toolbar of catalogue controls formats the text, and images are uploaded through
 * the page's `upload` function from the image button, a drop or a paste; a figure is inserted only once
 * the server has answered. Loading a value never marks the form dirty: only user edits write `value`.
 * Content marked `articleToolbarEnd` is projected at the far end of the toolbar (the project form's
 * language selector); its buttons share the toolbar's roving tab stop.
 */
@Component({
  selector: 'content-article-editor',
  imports: [
    ButtonDirective,
    DropdownMenuImports,
    NgIcon,
    ToggleDirective,
    ToggleGroupDirective,
    ToggleGroupItemDirective,
    TooltipDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './article-editor.component.html',
})
export class ArticleEditorComponent implements FormValueControl<ArticleDocumentDraft> {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Edited document, written by the editor on each user change.
   *
   * @type {ModelSignal<ArticleDocumentDraft>}
   */
  public readonly value: ModelSignal<ArticleDocumentDraft> =
    model<ArticleDocumentDraft>(emptyArticleDocument());

  /**
   * Property disabled
   * @readonly
   *
   * @description
   * Whether the field is disabled (a write is running): the editor stops accepting input.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly disabled: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property readonly
   * @readonly
   *
   * @description
   * Whether the field is read-only.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly readonly: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property invalid
   * @readonly
   *
   * @description
   * Whether the field fails validation; shown once touched.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly invalid: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touched
   * @readonly
   *
   * @description
   * Whether the field has been left once.
   *
   * @type {InputSignalWithTransform<boolean, unknown>}
   */
  public readonly touched: InputSignalWithTransform<boolean, unknown> = input<boolean, unknown>(
    false,
    { transform: booleanAttribute },
  );

  /**
   * Property touch
   * @readonly
   *
   * @description
   * Emits when the editing surface loses focus.
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly touch: OutputEmitterRef<void> = output<void>();

  /**
   * Property upload
   * @readonly
   *
   * @description
   * Image upload supplied by the page; without it, images cannot be added.
   *
   * @type {InputSignal<ArticleImageUpload | null>}
   */
  public readonly upload: InputSignal<ArticleImageUpload | null> = input<ArticleImageUpload | null>(
    null,
  );

  /**
   * Property label
   * @readonly
   *
   * @description
   * Accessible name of the editing surface.
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input<string>(
    $localize`:@@admin.article.editor.label:Article`,
  );

  /**
   * Property controlId
   * @readonly
   *
   * @description
   * Id of the editing surface, the target of the field label and error relationships.
   *
   * @type {InputSignal<string>}
   */
  public readonly controlId: InputSignal<string> = input<string>('');

  /**
   * Property describedBy
   * @readonly
   *
   * @description
   * Id of the error or hint describing the editing surface, if any.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly describedBy: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property language
   * @readonly
   *
   * @description
   * Language of the document, written as `lang` on the editing surface, since it may differ from the
   * admin's locale (WCAG 3.1.2); `null` inherits the page language.
   *
   * @type {InputSignal<string | null>}
   */
  public readonly language: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property toolbar
   * @readonly
   *
   * @description
   * Toolbar state, read from the editor after each transaction.
   *
   * @type {WritableSignal<ArticleToolbarState>}
   */
  protected readonly toolbar: WritableSignal<ArticleToolbarState> =
    signal<ArticleToolbarState>(IDLE_TOOLBAR);

  /**
   * Property uploads
   * @readonly
   *
   * @description
   * Number of images being uploaded.
   *
   * @type {WritableSignal<number>}
   */
  protected readonly uploads: WritableSignal<number> = signal<number>(0);

  /**
   * Property locked
   * @readonly
   *
   * @description
   * Whether the document cannot be changed (disabled or read-only).
   *
   * @type {Signal<boolean>}
   */
  protected readonly locked: Signal<boolean> = computed<boolean>(
    (): boolean => this.disabled() || this.readonly(),
  );

  /**
   * Property accept
   * @readonly
   *
   * @description
   * Types offered by the image picker, from the upload limits.
   *
   * @type {string}
   */
  protected readonly accept: string = ADMIN_MEDIA_LIMITS.types.join(',');

  /**
   * Property icons
   * @readonly
   *
   * @description
   * Lucide icons of the toolbar.
   */
  protected readonly icons: {
    readonly paragraph: typeof lucidePilcrow;
    readonly h2: typeof lucideHeading2;
    readonly h3: typeof lucideHeading3;
    readonly bold: typeof lucideBold;
    readonly italic: typeof lucideItalic;
    readonly code: typeof lucideCode;
    readonly link: typeof lucideLink;
    readonly bulletList: typeof lucideList;
    readonly orderedList: typeof lucideListOrdered;
    readonly blockquote: typeof lucideQuote;
    readonly codeBlock: typeof lucideSquareCode;
    readonly horizontalRule: typeof lucideMinus;
    readonly image: typeof lucideImagePlus;
    readonly figure: typeof lucideCaptions;
    readonly undo: typeof lucideUndo2;
    readonly redo: typeof lucideRedo2;
    readonly busy: typeof lucideLoaderCircle;
    readonly chevron: typeof lucideChevronDown;
  } = {
    paragraph: lucidePilcrow,
    h2: lucideHeading2,
    h3: lucideHeading3,
    bold: lucideBold,
    italic: lucideItalic,
    code: lucideCode,
    link: lucideLink,
    bulletList: lucideList,
    orderedList: lucideListOrdered,
    blockquote: lucideQuote,
    codeBlock: lucideSquareCode,
    horizontalRule: lucideMinus,
    image: lucideImagePlus,
    figure: lucideCaptions,
    undo: lucideUndo2,
    redo: lucideRedo2,
    busy: lucideLoaderCircle,
    chevron: lucideChevronDown,
  } as const;

  /**
   * Property plainText
   * @readonly
   *
   * @description
   * Name of a code block without language; the language names themselves are proper names.
   *
   * @type {string}
   */
  private readonly plainText: string = $localize`:@@admin.article.codeLanguage.plainText:Texte brut`;

  /**
   * Property languages
   * @readonly
   *
   * @description
   * Choices of the code block language menu: plain text (`''`, a `null` language), then the
   * contract's languages by their display names, in the contract's order.
   */
  protected readonly languages: readonly {
    readonly value: CodeLanguage | '';
    readonly label: string;
  }[] = [
    { value: '', label: this.plainText },
    ...(Object.keys(CODE_LANGUAGE_LABELS) as CodeLanguage[]).map(
      (value: CodeLanguage): { readonly value: CodeLanguage; readonly label: string } => ({
        value,
        label: CODE_LANGUAGE_LABELS[value],
      }),
    ),
  ];

  /**
   * Property surface
   * @readonly
   *
   * @description
   * Element the editor mounts in.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly surface: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('surface');

  /**
   * Property bar
   * @readonly
   *
   * @description
   * Toolbar element, whose buttons share one roving tab stop.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly bar: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('bar');

  /**
   * Property stuckSentinel
   * @readonly
   *
   * @description
   * Pixel line right above the toolbar, watched to know when the toolbar is stuck under the page bar.
   *
   * @type {Signal<ElementRef<HTMLElement>>}
   */
  private readonly stuckSentinel: Signal<ElementRef<HTMLElement>> =
    viewChild.required<ElementRef<HTMLElement>>('stuckSentinel');

  /**
   * Property stuck
   * @readonly
   *
   * @description
   * Whether the toolbar is stuck under the page bar: its top corners are square then, flush with the
   * bar, instead of the rounded corners of the editor frame at rest.
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly stuck: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property stop
   * @readonly
   *
   * @description
   * Toolbar button focused last, the toolbar's tab stop while it stays enabled; the first enabled
   * button otherwise.
   *
   * @type {WritableSignal<HTMLButtonElement | null>}
   */
  private readonly stop: WritableSignal<HTMLButtonElement | null> =
    signal<HTMLButtonElement | null>(null);

  /**
   * Property rove
   * @readonly
   *
   * @description
   * Capture-phase keydown listener of the toolbar: Left and Right move to the previous or next enabled
   * button (wrapping), Home and End to the first or last one. It runs before the block-kind toggle
   * group, whose own arrow keys would keep the focus inside the group.
   *
   * @type {(event: KeyboardEvent) => void}
   */
  private readonly rove: (event: KeyboardEvent) => void = (event: KeyboardEvent): void => {
    const keys: readonly string[] = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    const target: EventTarget | null = event.target;
    if (
      !keys.includes(event.key) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      !(target instanceof HTMLButtonElement)
    ) {
      return;
    }
    const enabled: HTMLButtonElement[] = this.buttons().filter(
      (button: HTMLButtonElement): boolean => !button.disabled,
    );
    const index: number = enabled.indexOf(target);
    if (index < 0) return;
    const count: number = enabled.length;
    const step: number = event.key === 'ArrowRight' ? 1 : -1;
    const next: number =
      event.key === 'Home' ? 0 : event.key === 'End' ? count - 1 : (index + step + count) % count;
    event.preventDefault();
    event.stopPropagation();
    const button: HTMLButtonElement | undefined = enabled[next];
    if (!button) return;
    button.focus();
    this.stop.set(button);
  };

  /**
   * Property blockGroup
   * @readonly
   *
   * @description
   * Block kind toggle group, put back in step with the editor after a command it could not run.
   *
   * @type {Signal<ToggleGroupDirective | undefined>}
   */
  private readonly blockGroup: Signal<ToggleGroupDirective | undefined> =
    viewChild<ToggleGroupDirective>(ToggleGroupDirective);

  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Opens the link and figure dialogs.
   *
   * @type {DialogService}
   */
  private readonly dialogs: DialogService = inject<DialogService>(DialogService);

  /**
   * Property toasts
   * @readonly
   *
   * @description
   * Reports refused files and failed uploads through the admin layout's toaster.
   *
   * @type {ToastService}
   */
  private readonly toasts: ToastService = inject<ToastService>(ToastService);

  /**
   * Property shortcuts
   * @readonly
   *
   * @description
   * Toolbar shortcuts for the running platform: tooltip caps with its modifier only (« Ctrl B » or
   * « ⌘ B », D36) and the matching `aria-keyshortcuts`.
   *
   * @type {Readonly<Record<keyof typeof ARTICLE_SHORTCUTS, ArticleShortcut>>}
   */
  protected readonly shortcuts: Readonly<Record<keyof typeof ARTICLE_SHORTCUTS, ArticleShortcut>> =
    ((): Readonly<Record<keyof typeof ARTICLE_SHORTCUTS, ArticleShortcut>> => {
      const modifier: ModifierKeyService = inject<ModifierKeyService>(ModifierKeyService);
      return Object.fromEntries(
        Object.entries(ARTICLE_SHORTCUTS).map(
          ([name, keys]: [string, readonly string[]]): [string, ArticleShortcut] => [
            name,
            resolveArticleShortcut(keys, modifier.apple, modifier.key),
          ],
        ),
      ) as Record<keyof typeof ARTICLE_SHORTCUTS, ArticleShortcut>;
    })();

  /**
   * Property editor
   *
   * @description
   * TipTap editor, created after the first render and destroyed with the component; a plain field,
   * since nothing in the template reads it directly.
   *
   * @type {Editor | null}
   */
  private editor: Editor | null = null;

  /**
   * Property emitted
   *
   * @description
   * Last document the editor wrote to `value`, or loaded from it: a `value` equal to it comes from the
   * editor itself and is not loaded back.
   *
   * @type {ArticleDocumentDraft | null}
   */
  private emitted: ArticleDocumentDraft | null = null;
  // #endregion

  // #region Constructor
  /**
   * Constructor
   *
   * @description
   * Creates the editor after the first render, loads every outside value without emitting an update,
   * follows the disabled state and the accessible attributes, and destroys the editor with the
   * component. The toolbar keeps a single tab stop (WAI-ARIA toolbar pattern): arrow keys, Home and End
   * move among its enabled buttons, block kinds included, ahead of the toggle group's own keys.
   */
  public constructor() {
    const lifetime: DestroyRef = inject<DestroyRef>(DestroyRef);
    afterNextRender((): void => {
      this.create();
      this.bar().nativeElement.addEventListener('keydown', this.rove, true);
      this.watchStuck(lifetime);
    });
    const injector: Injector = inject<Injector>(Injector);
    effect((): void => {
      // Every input of the buttons' disabled state, then the stop the user last focused; the DOM is
      // read once rendered, after the toggle group has written its own tab indexes.
      this.toolbar();
      this.locked();
      this.upload();
      const stop: HTMLButtonElement | null = this.stop();
      afterNextRender((): void => this.syncStops(stop), { injector });
    });
    effect((): void => {
      const value: ArticleDocumentDraft = this.value();
      untracked((): void => this.load(value));
    });
    effect((): void => {
      const editable: boolean = !this.locked();
      const attributes: Record<string, string> = this.attributes();
      untracked((): void => {
        const editor: Editor | null = this.editor;
        if (!editor) return;
        editor.setEditable(editable, false);
        editor.setOptions({ editorProps: { ...editor.options.editorProps, attributes } });
      });
    });
    inject<DestroyRef>(DestroyRef).onDestroy((): void => {
      this.bar().nativeElement.removeEventListener('keydown', this.rove, true);
      this.editor?.destroy();
      this.editor = null;
    });
  }
  // #endregion

  // #region Methods
  /**
   * Method watchStuck
   * @method watchStuck
   *
   * @description
   * Follows the sentinel above the toolbar on scroll and resize (passive listeners, one read per
   * event): once the sentinel is above the 48 px page bar, the toolbar is stuck under it.
   *
   * @param {DestroyRef} lifetime - Lifetime of the editor, which removes the listeners.
   */
  private watchStuck(lifetime: DestroyRef): void {
    const sentinel: HTMLElement = this.stuckSentinel().nativeElement;
    const view: (Window & typeof globalThis) | null = sentinel.ownerDocument.defaultView;
    if (!view) return;
    const check = (): void => this.stuck.set(sentinel.getBoundingClientRect().top < 48);
    view.addEventListener('scroll', check, { passive: true });
    view.addEventListener('resize', check, { passive: true });
    check();
    lifetime.onDestroy((): void => {
      view.removeEventListener('scroll', check);
      view.removeEventListener('resize', check);
    });
  }

  /**
   * Method focus
   * @method focus
   *
   * @description
   * Focuses the editing surface; Signal Forms calls it to reveal the field.
   *
   * @param {FocusOptions} [options] - Native focus options.
   */
  public focus(options?: FocusOptions): void {
    if (this.editor) this.editor.commands.focus();
    else this.surface().nativeElement.focus(options);
  }

  /**
   * Method onToolbarFocus
   *
   * @description
   * Makes the focused toolbar button the toolbar's tab stop.
   *
   * @param {FocusEvent} event - Focus entering an element of the toolbar.
   */
  protected onToolbarFocus(event: FocusEvent): void {
    if (event.target instanceof HTMLButtonElement) this.stop.set(event.target);
  }

  /**
   * Method setBlock
   *
   * @description
   * Turns the text blocks of the selection into paragraphs or headings.
   *
   * @param {unknown} kind - Pressed block kind of the toggle group.
   */
  protected setBlock(kind: unknown): void {
    const chain: ChainedCommands | undefined = this.editor?.chain().focus();
    if (chain) {
      if (kind === 'h2') chain.setHeading({ level: 2 }).run();
      else if (kind === 'h3') chain.setHeading({ level: 3 }).run();
      else if (kind === 'paragraph') chain.setParagraph().run();
    }
    this.blockGroup()?.value.set(this.toolbar().block);
  }

  /**
   * Method languageName
   *
   * @description
   * Display name of a code block language, the plain text name without one.
   *
   * @param {CodeLanguage | null} language - Language of the block.
   *
   * @returns {string} Name.
   */
  protected languageName(language: CodeLanguage | null): string {
    return language === null ? this.plainText : CODE_LANGUAGE_LABELS[language];
  }

  /**
   * Method languageAriaLabel
   *
   * @description
   * Accessible name of the code block language menu trigger, naming the current language.
   *
   * @param {string} name - Display name of the language.
   *
   * @returns {string} Accessible name.
   */
  protected languageAriaLabel(name: string): string {
    return $localize`:@@admin.article.codeLanguage.label:Langage du bloc de code : ${name}:language:`;
  }

  /**
   * Method setCodeLanguage
   *
   * @description
   * Sets the language of the code block holding the selection from the menu, `null` for plain text;
   * the highlighting follows at once. The selection stays in the block while the menu has
   * the focus, which returns to the trigger when it closes.
   *
   * @param {unknown} value - Value of the radio group.
   */
  protected setCodeLanguage(value: unknown): void {
    const language: CodeLanguage | null = isCodeLanguage(value) ? value : null;
    this.editor?.chain().updateAttributes('codeBlock', { language }).run();
  }

  /**
   * Method run
   *
   * @description
   * Runs one formatting or history command of the toolbar on the selection.
   *
   * @param {'bold' | 'italic' | 'code' | 'bulletList' | 'orderedList' | 'blockquote' | 'codeBlock' | 'horizontalRule' | 'undo' | 'redo'} command - Toolbar command.
   */
  protected run(
    command:
      | 'bold'
      | 'italic'
      | 'code'
      | 'bulletList'
      | 'orderedList'
      | 'blockquote'
      | 'codeBlock'
      | 'horizontalRule'
      | 'undo'
      | 'redo',
  ): void {
    const chain: ChainedCommands | undefined = this.editor?.chain().focus();
    if (!chain) return;
    const commands: Record<typeof command, (c: ChainedCommands) => ChainedCommands> = {
      bold: (c: ChainedCommands): ChainedCommands => c.toggleBold(),
      italic: (c: ChainedCommands): ChainedCommands => c.toggleItalic(),
      code: (c: ChainedCommands): ChainedCommands => c.toggleCode(),
      bulletList: (c: ChainedCommands): ChainedCommands => c.toggleBulletList(),
      orderedList: (c: ChainedCommands): ChainedCommands => c.toggleOrderedList(),
      blockquote: (c: ChainedCommands): ChainedCommands => c.toggleBlockquote(),
      codeBlock: (c: ChainedCommands): ChainedCommands => c.toggleCodeBlock(),
      horizontalRule: (c: ChainedCommands): ChainedCommands => c.setHorizontalRule(),
      undo: (c: ChainedCommands): ChainedCommands => c.undo(),
      redo: (c: ChainedCommands): ChainedCommands => c.redo(),
    };
    commands[command](chain).run();
  }

  /**
   * Method editLink
   *
   * @description
   * Opens the link dialog on the selection: applies the target (inserting it as text on an empty
   * selection), or removes the link. Every outcome, a cancel included, returns the focus to the text
   * with its selection.
   */
  protected editLink(): void {
    const editor: Editor | null = this.editor;
    if (!editor || this.locked()) return;
    const removable: boolean = editor.isActive('link');
    const ref: DialogRef<LinkDialogResult, LinkDialogComponent> = this.dialogs.open<
      LinkDialogResult,
      LinkDialogData,
      LinkDialogComponent
    >(LinkDialogComponent, {
      data: {
        href: removable ? String(editor.getAttributes('link')['href'] ?? '') : '',
        removable,
      },
      // The editor takes the focus back below, with its selection: a focus restored to the surface
      // element itself would put the caret at the start of the document.
      restoreFocus: false,
    });
    ref.closed.subscribe((result: LinkDialogResult | undefined): void => {
      if (editor.isDestroyed) return;
      if (!result) {
        // Cancelled: back to the text and its selection, rather than to the toolbar button.
        editor.commands.focus();
      } else if (result === 'remove') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else if (editor.state.selection.empty && !removable) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'text',
            text: result.href,
            marks: [{ type: 'link', attrs: { href: result.href } }],
          })
          .run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: result.href }).run();
      }
    });
  }

  /**
   * Method editFigure
   *
   * @description
   * Opens the texts dialog of the figure at a position and writes its answer into the figure.
   *
   * @param {number} pos - Position of the figure.
   */
  protected editFigure(pos: number | null): void {
    const editor: Editor | null = this.editor;
    const node: ProseMirrorNode | null | undefined =
      pos === null ? null : editor?.state.doc.nodeAt(pos);
    if (!editor || pos === null || !node || node.type.name !== 'figure' || this.locked()) return;
    const ref: DialogRef<FigureTexts, FigureDialogComponent> = this.dialogs.open<
      FigureTexts,
      FigureDialogData,
      FigureDialogComponent
    >(FigureDialogComponent, {
      data: {
        alt: String(node.attrs['alt'] ?? ''),
        caption: String(node.attrs['caption'] ?? ''),
        src: typeof node.attrs['src'] === 'string' ? node.attrs['src'] : null,
      },
    });
    ref.closed.subscribe((texts: FigureTexts | undefined): void => {
      if (!texts || editor.isDestroyed) return;
      const current: ProseMirrorNode | null = editor.state.doc.nodeAt(pos);
      if (current?.type.name !== 'figure' || current.attrs['media'] !== node.attrs['media']) return;
      editor
        .chain()
        .focus()
        .command(({ tr }): boolean => {
          tr.setNodeMarkup(pos, undefined, { ...current.attrs, ...texts });
          return true;
        })
        .setNodeSelection(pos)
        .run();
    });
  }

  /**
   * Method pick
   *
   * @description
   * Uploads the images chosen in the hidden file input, at the selection.
   *
   * @param {HTMLInputElement} picker - File input of the image button.
   */
  protected pick(picker: HTMLInputElement): void {
    const files: File[] = Array.from(picker.files ?? []);
    picker.value = '';
    void this.insertImages(files, null);
  }

  /**
   * Method buttons
   *
   * @description
   * Buttons of the toolbar, in visual order.
   *
   * @returns {HTMLButtonElement[]} The buttons.
   */
  private buttons(): HTMLButtonElement[] {
    return Array.from(this.bar().nativeElement.querySelectorAll<HTMLButtonElement>('button'));
  }

  /**
   * Method syncStops
   *
   * @description
   * Leaves a single toolbar button in the tab order: the last focused one while it is enabled, else the
   * first enabled one. It runs after each render, after the toggle group has written its own tab index.
   *
   * @param {HTMLButtonElement | null} stop - Button focused last.
   */
  private syncStops(stop: HTMLButtonElement | null): void {
    const buttons: HTMLButtonElement[] = this.buttons();
    const current: HTMLButtonElement | undefined =
      stop && buttons.includes(stop) && !stop.disabled
        ? stop
        : buttons.find((button: HTMLButtonElement): boolean => !button.disabled);
    for (const button of buttons) button.tabIndex = button === current ? 0 : -1;
  }

  /**
   * Method attributes
   *
   * @description
   * Attributes of the editing surface: the flow of the public article, its accessible name, its
   * language, its id and the description and validity relationships.
   *
   * @returns {Record<string, string>} ProseMirror view attributes.
   */
  private attributes(): Record<string, string> {
    const describedBy: string | null = this.describedBy();
    const language: string | null = this.language();
    return {
      class: `${ARTICLE_TYPOGRAPHY.flow} min-h-72 px-8 py-7 outline-none @max-[640px]/page:px-4`,
      role: 'textbox',
      'aria-multiline': 'true',
      'aria-label': this.label(),
      ...(language ? { lang: language } : {}),
      ...(this.controlId() ? { id: this.controlId() } : {}),
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      ...(this.invalid() && this.touched() ? { 'aria-invalid': 'true' } : {}),
    };
  }

  /**
   * Method create
   *
   * @description
   * Mounts the editor on the current value. Updates write `value`, blur emits `touch`, every
   * transaction refreshes the toolbar; pasted or dropped files are uploaded, a double-click on a
   * figure opens its texts dialog.
   */
  private create(): void {
    const value: ArticleDocumentDraft = this.value();
    this.emitted = value;
    this.editor = new Editor({
      element: this.surface().nativeElement,
      extensions: articleExtensions(),
      content: value as unknown as JSONContent,
      editable: !this.locked(),
      editorProps: {
        attributes: this.attributes(),
        handlePaste: (_view: EditorView, event: ClipboardEvent): boolean => {
          const files: File[] = Array.from(event.clipboardData?.files ?? []);
          if (files.length === 0) return false;
          event.preventDefault();
          void this.insertImages(files, null);
          return true;
        },
        handleDrop: (
          view: EditorView,
          event: DragEvent,
          _slice: unknown,
          moved: boolean,
        ): boolean => {
          const files: File[] = Array.from(event.dataTransfer?.files ?? []);
          if (moved || files.length === 0) return false;
          event.preventDefault();
          const at: number | null =
            view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ?? null;
          void this.insertImages(files, at);
          return true;
        },
        handleDoubleClickOn: (
          _view: EditorView,
          _pos: number,
          node: ProseMirrorNode,
          nodePos: number,
        ): boolean => {
          if (node.type.name !== 'figure') return false;
          this.editFigure(nodePos);
          return true;
        },
      },
      onUpdate: ({ editor }: { editor: Editor }): void => {
        const document: ArticleDocumentDraft = editor.getJSON() as unknown as ArticleDocumentDraft;
        this.emitted = document;
        this.value.set(document);
      },
      onBlur: (): void => this.touch.emit(),
      onTransaction: ({ editor }: { editor: Editor }): void =>
        this.toolbar.set(readToolbar(editor)),
    });
    this.toolbar.set(readToolbar(this.editor));
  }

  /**
   * Method load
   *
   * @description
   * Shows a value set from outside (form reset, "Partir du français") without emitting an update nor
   * adding a history step; a value equal to the document on display leaves the selection in place.
   *
   * @param {ArticleDocumentDraft} value - Value written by the form.
   */
  private load(value: ArticleDocumentDraft): void {
    const editor: Editor | null = this.editor;
    if (!editor || value === this.emitted) return;
    this.emitted = value;
    try {
      if (editor.schema.nodeFromJSON(value).eq(editor.state.doc)) return;
    } catch {
      // A value the schema cannot read is replaced below, as TipTap parses it leniently.
    }
    editor
      .chain()
      .setMeta('addToHistory', false)
      .setContent(value as unknown as JSONContent, { emitUpdate: false })
      .run();
  }

  /**
   * Method insertImages
   *
   * @description
   * Uploads image files one after the other and inserts each figure once its media is stored, never a
   * local `blob:` URL. A refused file or a failed upload is toasted and skipped.
   *
   * @param {readonly File[]} files - Files chosen, dropped or pasted.
   * @param {number | null} at - Drop position, or `null` for the selection.
   *
   * @returns {Promise<void>} Completion after every upload.
   */
  private async insertImages(files: readonly File[], at: number | null): Promise<void> {
    const upload: ArticleImageUpload | null = this.upload();
    if (!upload || this.locked()) return;
    let position: number | null = at;
    for (const file of files) {
      const refusal: string | null = imageFileError(file);
      if (refusal) {
        this.toasts.error(refusal);
        continue;
      }
      this.uploads.update((count: number): number => count + 1);
      try {
        const media: AdminMedia = await upload(file);
        position = this.insertFigure(media, position);
      } catch (error) {
        this.toasts.error(
          $localize`:@@admin.article.toast.uploadFailed:L’image n’a pas été envoyée.`,
          error instanceof Error && error.message ? { description: error.message } : {},
        );
      } finally {
        this.uploads.update((count: number): number => count - 1);
      }
    }
  }

  /**
   * Method insertFigure
   *
   * @description
   * Inserts a figure at the top level next to a position clamped to the current document (it may have
   * changed during the upload): it replaces an empty paragraph, or follows the block holding the
   * position. The new figure is selected.
   *
   * @param {AdminMedia} media - Uploaded media.
   * @param {number | null} at - Remembered position, or `null` for the selection.
   *
   * @returns {number | null} Position after the figure, where a following image goes.
   */
  private insertFigure(media: AdminMedia, at: number | null): number | null {
    const editor: Editor | null = this.editor;
    if (!editor || editor.isDestroyed) return null;
    const doc: ProseMirrorNode = editor.state.doc;
    const $pos: ResolvedPos = doc.resolve(
      Math.min(Math.max(at ?? editor.state.selection.to, 0), doc.content.size),
    );
    const block: ProseMirrorNode | null = $pos.depth > 0 ? $pos.node(1) : null;
    const empty: boolean = block?.type.name === 'paragraph' && block.content.size === 0;
    const from: number = $pos.depth === 0 ? $pos.pos : empty ? $pos.before(1) : $pos.after(1);
    const to: number = empty ? $pos.after(1) : from;
    editor
      .chain()
      .focus()
      .insertContentAt(
        { from, to },
        {
          type: 'figure',
          attrs: { media: media.id, alt: '', caption: '', src: media.src },
        },
      )
      .setNodeSelection(from)
      .run();
    return from + 1;
  }
  // #endregion
}
