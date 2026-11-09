import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Mock } from 'vitest';
import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, disabled, form, type FieldTree } from '@angular/forms/signals';
import { Editor, type JSONContent } from '@tiptap/core';
import { Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { AdminMedia, ArticleDocumentDraft } from '@vfortin/content-web-data-access/admin';
import { ModifierKeyService, ToastService } from '@vfortin/ui';
import { ArticleEditorComponent } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/article-editor.component';
import type { ArticleImageUpload } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/models/article-image-upload.type';
import { articleExtensions } from '@internal/content-web-feature-admin/lib/ui/components/article-editor/utils/article-extensions/article-extensions.utils';
import {
  GOLDEN_MEDIA,
  buildGoldenDocument,
} from '@internal/content-web-feature-admin/lib/ui/components/article-editor/testing/golden-document';

/**
 * Constant MEDIA
 *
 * @description
 * Media answered by the fake upload.
 */
const MEDIA: AdminMedia = { ...GOLDEN_MEDIA, width: 1600, height: 900 };

/**
 * Constant DOCUMENT
 *
 * @description
 * Document loaded into the editor, already in the editor's JSON form.
 */
const DOCUMENT: ArticleDocumentDraft = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Contexte' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Un paragraphe.' }] },
  ],
};

/**
 * Component HostComponent
 *
 * @description
 * Signal Form binding the editor with `[formField]`, as the project form does.
 */
@Component({
  imports: [ArticleEditorComponent, FormField],
  template: `<content-article-editor
    controlId="edit"
    [language]="language()"
    [upload]="upload"
    [formField]="article.doc"
  />`,
})
class HostComponent {
  public readonly locked: WritableSignal<boolean> = signal<boolean>(false);
  public readonly language: WritableSignal<string | null> = signal<string | null>(null);
  public readonly model: WritableSignal<{ doc: ArticleDocumentDraft }> = signal<{
    doc: ArticleDocumentDraft;
  }>({ doc: DOCUMENT });
  public readonly article: FieldTree<{ doc: ArticleDocumentDraft }, string | number, 'writable'> =
    form(this.model, (path): void => disabled(path.doc, (): boolean => this.locked()));
  public upload: Mock<ArticleImageUpload> = vi.fn<ArticleImageUpload>((): Promise<AdminMedia> =>
    Promise.resolve(MEDIA),
  );
}

/**
 * Interface Mounted
 *
 * @description
 * Rendered host, its editor and its root element.
 */
interface Mounted {
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
  editor: Editor;
  root: HTMLElement;
  settle: () => Promise<void>;
}

/**
 * Function mount
 *
 * @description
 * Renders the host and returns the TipTap editor mounted by the component.
 *
 * @returns {Promise<Mounted>} Host, editor and helpers.
 */
async function mount(): Promise<Mounted> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root: HTMLElement = fixture.nativeElement as HTMLElement;
  const surface: (HTMLElement & { editor?: Editor }) | null = root.querySelector('#edit');
  if (!surface?.editor) throw new Error('editor missing');
  const settle = async (): Promise<void> => {
    await new Promise((done: (value: unknown) => void): unknown => setTimeout(done));
    await fixture.whenStable();
  };
  return { fixture, host: fixture.componentInstance, editor: surface.editor, root, settle };
}

/**
 * Function files
 *
 * @description
 * Fake clipboard or drag event carrying files.
 *
 * @param {'clipboardData' | 'dataTransfer'} key - Event property holding the files.
 * @param {File[]} list - Files carried.
 *
 * @returns {{ event: T; prevented: Mock }} Event and its `preventDefault` spy.
 */
function files<T extends Event>(
  key: 'clipboardData' | 'dataTransfer',
  list: File[],
): { event: T; prevented: Mock } {
  const prevented: Mock = vi.fn();
  return {
    event: {
      [key]: { files: list },
      preventDefault: prevented,
      clientX: 0,
      clientY: 0,
    } as unknown as T,
    prevented,
  };
}

/**
 * Function png
 *
 * @description
 * Small PNG file.
 *
 * @returns {File} Image file.
 */
const png = (): File => new File(['png'], 'ecran.png', { type: 'image/png' });

/**
 * Function figures
 *
 * @description
 * Figures of an editor document.
 *
 * @param {Editor} editor - Editor read.
 *
 * @returns {JSONContent[]} Figure nodes.
 */
const figures = (editor: Editor): JSONContent[] =>
  (editor.getJSON().content ?? []).filter((node: JSONContent): boolean => node.type === 'figure');

/**
 * Function dialogButton
 *
 * @description
 * Button of the open dialog, which the CDK renders outside the host.
 *
 * @param {string} label - Visible text.
 *
 * @returns {HTMLButtonElement} The button.
 */
function dialogButton(label: string): HTMLButtonElement {
  const found: HTMLButtonElement | undefined = [
    ...document.querySelectorAll<HTMLButtonElement>('[data-slot="dialog-content"] button'),
  ].find((button: HTMLButtonElement): boolean => button.textContent?.trim() === label);
  if (!found) throw new Error(`${label} missing`);
  return found;
}

/**
 * Function fill
 *
 * @description
 * Types into a field of the open dialog.
 *
 * @param {string} id - Field id.
 * @param {string} value - Text entered.
 */
function fill(id: string, value: string): void {
  const field: HTMLInputElement | HTMLTextAreaElement | null = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[data-slot="dialog-content"] #${id}`);
  if (!field) throw new Error(`${id} missing`);
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

/**
 * Function footerHints
 *
 * @description
 * Spoken keyboard hints of the open dialog's footer bar.
 *
 * @returns {(string | undefined)[]} One sentence per hint.
 */
function footerHints(): (string | undefined)[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      '[data-slot="dialog-content"] [data-slot="dialog-footer"][data-variant="bar"] [data-slot="kbd-hint"] .sr-only',
    ),
  ].map((hint: HTMLElement): string | undefined => hint.textContent ?? undefined);
}

/**
 * Function submitDialog
 *
 * @description
 * Submits the form of the open dialog.
 */
function submitDialog(): void {
  document
    .querySelector('[data-slot="dialog-content"] form')
    ?.dispatchEvent(new Event('submit', { cancelable: true }));
}

/**
 * Function toolbarButton
 *
 * @description
 * Toolbar button of the editor by accessible name.
 *
 * @param {HTMLElement} root - Host element.
 * @param {string} label - `aria-label` of the button.
 *
 * @returns {HTMLButtonElement} The button.
 */
function toolbarButton(root: HTMLElement, label: string): HTMLButtonElement {
  const found: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>(
    `button[aria-label="${label}"]`,
  );
  if (!found) throw new Error(`${label} missing`);
  return found;
}

describe('ArticleEditorComponent', (): void => {
  afterEach((): void => {
    document
      .querySelectorAll('.cdk-overlay-container')
      .forEach((node: Element): void => node.remove());
  });

  it('shows the bound document and writes each edit back as editor JSON', async (): Promise<void> => {
    const { host, editor, root, settle } = await mount();
    // Signal Forms tags model arrays with symbol keys; compare the JSON only.
    expect(editor.getJSON()).toEqual(JSON.parse(JSON.stringify(DOCUMENT)));
    expect(root.querySelector('h2')?.className).toContain('font-display');
    expect(root.querySelector('#edit')?.getAttribute('aria-label')).toBe('Article');
    editor
      .chain()
      .setTextSelection(editor.state.doc.content.size - 1)
      .insertContent(' Suite.')
      .run();
    await settle();
    expect(JSON.parse(JSON.stringify(host.model().doc))).toEqual(editor.getJSON());
    expect(host.article.doc().dirty()).toBe(true);
  });

  it('loads an outside value without dirtying the form nor adding a history step', async (): Promise<void> => {
    const { host, editor, settle } = await mount();
    expect(host.article().dirty()).toBe(false);
    const other: ArticleDocumentDraft = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Autre article.' }] }],
    };
    host.model.set({ doc: other });
    await settle();
    expect(editor.getText()).toBe('Autre article.');
    expect(host.article().dirty()).toBe(false);
    expect(editor.can().undo()).toBe(false);
    host.article().reset({ doc: structuredClone(other) });
    await settle();
    expect(editor.getText()).toBe('Autre article.');
    expect(host.article().dirty()).toBe(false);
  });

  it('marks the field touched on blur and follows its disabled state', async (): Promise<void> => {
    const { host, editor, settle } = await mount();
    editor.view.dom.dispatchEvent(new FocusEvent('focus'));
    editor.view.dom.dispatchEvent(new FocusEvent('blur'));
    await settle();
    expect(host.article.doc().touched()).toBe(true);
    expect(editor.isEditable).toBe(true);
    host.locked.set(true);
    await settle();
    expect(editor.isEditable).toBe(false);
    expect(host.article().dirty()).toBe(false);
  });

  it('squares the toolbar top corners while it is stuck under the page bar', async (): Promise<void> => {
    const { root, settle } = await mount();
    const bar: HTMLElement | null = root.querySelector('[role="toolbar"]');
    const sentinel: Element | null | undefined = bar?.previousElementSibling;
    expect(bar?.className).toContain('rounded-t-lg');
    expect(bar?.className).toContain('data-stuck:rounded-t-none');
    // At rest the sentinel sits below the page bar (jsdom lays nothing out: its position is stubbed).
    const top: { value: number } = { value: 200 };
    vi.spyOn(sentinel as Element, 'getBoundingClientRect').mockImplementation(
      (): DOMRect => new DOMRect(0, top.value, 100, 1),
    );
    window.dispatchEvent(new Event('scroll'));
    await settle();
    expect(bar?.hasAttribute('data-stuck')).toBe(false);
    // Scrolled past the 48 px page bar: the sentinel above the toolbar has left the viewport.
    top.value = -120;
    window.dispatchEvent(new Event('scroll'));
    await settle();
    expect(bar?.hasAttribute('data-stuck')).toBe(true);
    top.value = 300;
    window.dispatchEvent(new Event('scroll'));
    await settle();
    expect(bar?.hasAttribute('data-stuck')).toBe(false);
  });

  it('destroys the editor with the component', async (): Promise<void> => {
    const { fixture, editor } = await mount();
    fixture.destroy();
    expect(editor.isDestroyed).toBe(true);
  });

  it('uploads a pasted image and inserts its figure only once stored, replacing an empty paragraph', async (): Promise<void> => {
    const { host, editor, root, settle } = await mount();
    let answer: (media: AdminMedia) => void = (): void => undefined;
    host.upload.mockImplementationOnce(
      (): Promise<AdminMedia> =>
        new Promise<AdminMedia>((done: (media: AdminMedia) => void): void => {
          answer = done;
        }),
    );
    editor
      .chain()
      .setTextSelection(editor.state.doc.content.size - 1)
      .splitBlock()
      .run();
    const { event, prevented } = files<ClipboardEvent>('clipboardData', [png()]);
    expect(editor.view.props.handlePaste?.(editor.view, event, Slice.empty)).toBe(true);
    expect(prevented).toHaveBeenCalled();
    await settle();
    expect(host.upload).toHaveBeenCalledWith(expect.any(File));
    expect(root.querySelector('[role="status"]')?.textContent).toContain('Envoi de l’image');
    expect(figures(editor)).toEqual([]);
    answer(MEDIA);
    await settle();
    expect(editor.getJSON().content?.at(-1)).toEqual({
      type: 'figure',
      attrs: { media: MEDIA.id, alt: '', caption: '', src: MEDIA.src },
    });
    expect(editor.getJSON().content).toHaveLength(3);
    expect(root.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
    const figure: HTMLElement | null = root.querySelector('figure[data-media]');
    expect(figure?.querySelector('img')?.getAttribute('src')).toBe(MEDIA.src);
    expect(figure?.hasAttribute('data-missing-alt')).toBe(true);
    expect(figure?.textContent).toContain('Texte alternatif manquant');
    expect(host.model().doc.content.at(-1)?.type).toBe('figure');
  });

  it('inserts a dropped image after the block under the pointer, clamping a position the document lost', async (): Promise<void> => {
    const { host, editor, settle } = await mount();
    const { event } = files<DragEvent>('dataTransfer', [png()]);
    editor.view.posAtCoords = (): { pos: number; inside: number } => ({ pos: 3, inside: -1 });
    expect(editor.view.props.handleDrop?.(editor.view, event, Slice.empty, false)).toBe(true);
    await settle();
    expect(
      editor.getJSON().content?.map((node: JSONContent): string | undefined => node.type),
    ).toEqual(['heading', 'figure', 'paragraph']);
    host.upload.mockImplementationOnce(async (): Promise<AdminMedia> => {
      editor.commands.setContent({
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Court.' }] }],
      });
      return MEDIA;
    });
    editor.view.posAtCoords = (): { pos: number; inside: number } => ({ pos: 40, inside: -1 });
    editor.view.props.handleDrop?.(
      editor.view,
      files<DragEvent>('dataTransfer', [png()]).event,
      Slice.empty,
      false,
    );
    await settle();
    expect(
      editor.getJSON().content?.map((node: JSONContent): string | undefined => node.type),
    ).toEqual(['paragraph', 'figure']);
    expect(editor.view.props.handleDrop?.(editor.view, event, Slice.empty, true)).toBe(false);
  });

  it('refuses unsupported or oversized files and toasts a failed upload', async (): Promise<void> => {
    const { host, editor, settle } = await mount();
    const toasts: ToastService = TestBed.inject<ToastService>(ToastService);
    const svg: File = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    const big: File = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.png', {
      type: 'image/png',
    });
    editor.view.props.handlePaste?.(
      editor.view,
      files<ClipboardEvent>('clipboardData', [svg, big]).event,
      Slice.empty,
    );
    await settle();
    expect(host.upload).not.toHaveBeenCalled();
    host.upload.mockRejectedValueOnce(new Error('L’image dépasse 10 Mo.'));
    editor.view.props.handlePaste?.(
      editor.view,
      files<ClipboardEvent>('clipboardData', [png()]).event,
      Slice.empty,
    );
    await settle();
    expect(toasts.toasts().map((toast): [string, string] => [toast.type, toast.message])).toEqual([
      ['error', '« logo.svg » n’est pas une image acceptée : JPEG, PNG, WebP, AVIF ou GIF.'],
      ['error', '« big.png » dépasse 10 Mo.'],
      ['error', 'L’image n’a pas été envoyée.'],
    ]);
    expect(toasts.toasts()[2]?.description).toBe('L’image dépasse 10 Mo.');
    expect(figures(editor)).toEqual([]);
    expect(
      editor.view.props.handlePaste?.(
        editor.view,
        files<ClipboardEvent>('clipboardData', []).event,
        Slice.empty,
      ),
    ).toBe(false);
  });

  it('uploads the images chosen with the image button', async (): Promise<void> => {
    const { host, editor, root, settle } = await mount();
    const picker: HTMLInputElement | null = root.querySelector('input[type="file"]');
    if (!picker) throw new Error('picker missing');
    const click: Mock = vi.fn();
    picker.click = click;
    toolbarButton(root, 'Image').click();
    expect(click).toHaveBeenCalled();
    Object.defineProperty(picker, 'files', { value: [png()], configurable: true });
    picker.dispatchEvent(new Event('change'));
    await settle();
    expect(host.upload).toHaveBeenCalledTimes(1);
    expect(figures(editor)).toHaveLength(1);
  });

  it('edits the alternative text and caption of a figure in a dialog', async (): Promise<void> => {
    const { host, editor, root, settle } = await mount();
    const end: number = editor.state.doc.content.size;
    editor
      .chain()
      .insertContentAt(end, {
        type: 'figure',
        attrs: { media: MEDIA.id, alt: '', caption: '', src: null },
      })
      .setNodeSelection(end)
      .run();
    await settle();
    expect(root.querySelector('figure')?.textContent).toContain('Image indisponible');
    toolbarButton(root, 'Texte alternatif et légende').click();
    await settle();
    // Enter adds a line in the alternative text, so the bar recalls Escape only.
    expect(footerHints()).toEqual(['Échap : Annuler']);
    expect(
      document
        .querySelector('[data-slot="dialog-content"] form > [data-slot="dialog-header"]')
        ?.getAttribute('data-variant'),
    ).toBe('bar');
    fill('figure-alt', '  Écran du calendrier  ');
    fill('figure-caption', 'Le calendrier.');
    submitDialog();
    await settle();
    expect(figures(editor)[0]?.attrs).toEqual({
      media: MEDIA.id,
      alt: 'Écran du calendrier',
      caption: 'Le calendrier.',
      src: null,
    });
    expect(root.querySelector('figure')?.hasAttribute('data-missing-alt')).toBe(false);
    expect(root.querySelector('figcaption')?.textContent).toBe('Le calendrier.');
    expect(host.model().doc.content.at(-1)).toMatchObject({
      attrs: { alt: 'Écran du calendrier' },
    });

    const node: ProseMirrorNode | null = editor.state.doc.nodeAt(end);
    if (!node) throw new Error('figure missing');
    expect(
      editor.view.props.handleDoubleClickOn?.(
        editor.view,
        end,
        node,
        end,
        new MouseEvent('dblclick'),
        true,
      ),
    ).toBe(true);
    await settle();
    fill('figure-alt', 'x'.repeat(301));
    submitDialog();
    await settle();
    expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).toContain(
      '300 caractères maximum.',
    );
    expect(document.querySelector('#figure-alt')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#figure-caption')?.hasAttribute('aria-invalid')).toBe(false);
    // The dialog applies to the article like the link dialog; only the save bar saves the project.
    expect(dialogButton('Appliquer').type).toBe('submit');
    dialogButton('Annuler').click();
    await settle();
    expect(figures(editor)[0]?.attrs?.['alt']).toBe('Écran du calendrier');
  });

  it('adds, changes and removes a link through its dialog', async (): Promise<void> => {
    const { editor, root, settle } = await mount();
    editor.commands.setTextSelection({ from: 12, to: 22 });
    toolbarButton(root, 'Lien').click();
    await settle();
    fill('link-href', 'http://example.com');
    submitDialog();
    await settle();
    expect(document.querySelector('[data-slot="dialog-content"]')?.textContent).toContain(
      'https:// ou mailto:',
    );
    expect(document.querySelector('#link-href')?.getAttribute('aria-invalid')).toBe('true');
    fill('link-href', ' https://example.com ');
    submitDialog();
    await settle();
    const link = (): unknown =>
      JSON.stringify(editor.getJSON()).match(/"link","attrs":\{"href":"([^"]+)"\}/)?.[1] ?? null;
    expect(link()).toBe('https://example.com');
    expect(root.querySelector('a')?.getAttribute('target')).toBeNull();
    editor.commands.setTextSelection(14);
    await settle();
    expect(toolbarButton(root, 'Lien').getAttribute('aria-pressed')).toBe('true');
    toolbarButton(root, 'Lien').click();
    await settle();
    expect(document.querySelector<HTMLInputElement>('#link-href')?.value).toBe(
      'https://example.com',
    );
    // A short form dialog: its buttons say how to validate, the hint only names Escape.
    expect(footerHints()).toEqual(['Échap : Annuler']);
    expect(
      document
        .querySelector('[data-slot="dialog-content"] form > [data-slot="dialog-header"]')
        ?.getAttribute('data-variant'),
    ).toBe('bar');
    expect(
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[data-slot="dialog-content"] [data-variant="bar"] button',
        ),
      ].map((button: HTMLButtonElement): string | undefined => button.textContent?.trim()),
    ).toEqual(['Retirer le lien', 'Annuler', 'Appliquer']);
    dialogButton('Retirer le lien').click();
    await settle();
    expect(link()).toBeNull();
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    toolbarButton(root, 'Lien').click();
    await settle();
    fill('link-href', 'mailto:contact@example.com');
    submitDialog();
    await settle();
    expect(link()).toBe('mailto:contact@example.com');
    expect(editor.getText()).toContain('mailto:contact@example.com');
  });

  it('returns the focus to the text and its selection when the link dialog is cancelled', async (): Promise<void> => {
    const { editor, root, settle } = await mount();
    editor.commands.setTextSelection({ from: 12, to: 22 });
    toolbarButton(root, 'Lien').click();
    await settle();
    dialogButton('Annuler').click();
    await settle();
    // TipTap focuses on the next frame.
    await new Promise((done: (value: unknown) => void): unknown => requestAnimationFrame(done));
    expect(document.activeElement).toBe(root.querySelector('#edit'));
    expect([editor.state.selection.from, editor.state.selection.to]).toEqual([12, 22]);
  });

  it('marks the language of the edited document on the editing surface', async (): Promise<void> => {
    const { host, root, settle } = await mount();
    expect(root.querySelector('#edit')?.hasAttribute('lang')).toBe(false);
    host.language.set('en');
    await settle();
    expect(root.querySelector('#edit')?.getAttribute('lang')).toBe('en');
  });

  it('is one toolbar tab stop whose arrow, Home and End keys move among the enabled buttons', async (): Promise<void> => {
    const { root, settle } = await mount();
    const bar: HTMLElement | null = root.querySelector<HTMLElement>('[role="toolbar"]');
    if (!bar) throw new Error('toolbar missing');
    expect(bar.getAttribute('aria-label')).toBe('Mise en forme');
    const buttons: HTMLButtonElement[] = [...bar.querySelectorAll<HTMLButtonElement>('button')];
    const enabled: HTMLButtonElement[] = buttons.filter(
      (button: HTMLButtonElement): boolean => !button.disabled,
    );
    const stops = (): (string | null)[] =>
      buttons
        .filter((button: HTMLButtonElement): boolean => button.tabIndex === 0)
        .map((button: HTMLButtonElement): string | null => button.getAttribute('aria-label'));
    const press = async (key: string): Promise<void> => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
      await settle();
    };
    await settle();
    expect(stops()).toEqual(['Paragraphe']);
    toolbarButton(root, 'Paragraphe').focus();
    await press('ArrowRight');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Titre de section');
    await press('ArrowRight');
    await press('ArrowRight');
    // Out of the block kinds group, on to the next control.
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Gras');
    expect(stops()).toEqual(['Gras']);
    await press('End');
    expect(document.activeElement).toBe(enabled.at(-1));
    await press('ArrowRight');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Paragraphe');
    await press('ArrowLeft');
    expect(document.activeElement).toBe(enabled.at(-1));
    await press('Home');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Paragraphe');
    expect(stops()).toEqual(['Paragraphe']);
  });

  it('names each shortcut with the platform modifier, in caps and in aria-keyshortcuts', async (): Promise<void> => {
    /**
     * Function tooltipOf
     *
     * @description
     * Shows the tooltip of a toolbar button through keyboard focus and reads its text and caps.
     *
     * @param {HTMLButtonElement} button - Toolbar button.
     *
     * @returns {Promise<string[]>} Tooltip text followed by each key cap.
     */
    const tooltipOf = async (button: HTMLButtonElement): Promise<string[]> => {
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await new Promise((resolve: (value: unknown) => void): unknown => setTimeout(resolve, 600));
      const tooltip: HTMLElement | null = document.querySelector('[role="tooltip"]');
      const caps: string[] = [...(tooltip?.querySelectorAll('kbd') ?? [])].map(
        (cap: Element): string => cap.textContent?.trim() ?? '',
      );
      button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      return [tooltip?.childNodes[0]?.textContent?.trim() ?? '', ...caps];
    };
    const { root } = await mount();
    expect(toolbarButton(root, 'Gras').getAttribute('aria-keyshortcuts')).toBe('Control+B');
    expect(toolbarButton(root, 'Titre de section').getAttribute('aria-keyshortcuts')).toBe(
      'Control+Alt+2',
    );
    expect(toolbarButton(root, 'Liste à puces').getAttribute('aria-keyshortcuts')).toBe(
      'Control+Shift+8',
    );
    expect(await tooltipOf(toolbarButton(root, 'Gras'))).toEqual(['Gras', 'Ctrl', 'B']);
    expect(root.innerHTML).not.toContain('Ctrl B');
  });

  it('uses the Command key on Apple platforms', async (): Promise<void> => {
    TestBed.configureTestingModule({
      providers: [{ provide: ModifierKeyService, useValue: { apple: true, key: '⌘' } }],
    });
    const { root } = await mount();
    expect(toolbarButton(root, 'Rétablir la modification').getAttribute('aria-keyshortcuts')).toBe(
      'Meta+Shift+Z',
    );
    expect(toolbarButton(root, 'Paragraphe').getAttribute('aria-keyshortcuts')).toBe('Meta+Alt+0');
  });

  it('formats from the toolbar and reflects the selection state', async (): Promise<void> => {
    const { editor, root, settle } = await mount();
    editor.commands.setTextSelection({ from: 12, to: 22 });
    await settle();
    const bold: HTMLButtonElement = toolbarButton(root, 'Gras');
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    bold.click();
    await settle();
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    // A pressed toggle, the current block type included, takes the accent ink.
    expect(bold.classList).toContain('aria-pressed:text-accent');
    expect(toolbarButton(root, 'Paragraphe').getAttribute('aria-pressed')).toBe('true');
    expect(toolbarButton(root, 'Paragraphe').classList).toContain('aria-pressed:text-accent');
    for (const label of ['Italique', 'Code']) toolbarButton(root, label).click();
    await settle();
    expect(JSON.stringify(editor.getJSON())).toContain('"type":"code"');
    toolbarButton(root, 'Titre de section').click();
    await settle();
    expect(editor.getJSON().content?.[1]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
    toolbarButton(root, 'Sous-titre').click();
    await settle();
    expect(editor.getJSON().content?.[1]).toMatchObject({ attrs: { level: 3 } });
    toolbarButton(root, 'Paragraphe').click();
    await settle();
    expect(editor.getJSON().content?.[1]?.type).toBe('paragraph');
    for (const label of [
      'Liste à puces',
      'Liste numérotée',
      'Citation',
      'Bloc de code',
      'Séparateur',
    ])
      toolbarButton(root, label).click();
    await settle();
    toolbarButton(root, 'Annuler la modification').click();
    await settle();
    expect(toolbarButton(root, 'Rétablir la modification').disabled).toBe(false);
    toolbarButton(root, 'Rétablir la modification').click();
    await settle();
    expect(
      editor
        .getJSON()
        .content?.some((node: JSONContent): boolean => node.type === 'horizontalRule'),
    ).toBe(true);
  });

  it('offers the language of a code block only inside one, and highlights the code in it', async (): Promise<void> => {
    const { host, editor, root, settle } = await mount();
    const picker = (): HTMLButtonElement | null =>
      root.querySelector<HTMLButtonElement>('button[aria-label^="Langage du bloc de code"]');
    const highlighted = (): string[] =>
      [...root.querySelectorAll<HTMLElement>('pre [class*="hljs-"]')].map(
        (span: HTMLElement): string => `${span.className}:${span.textContent ?? ''}`,
      );
    const items = (): HTMLElement[] => [
      ...document.querySelectorAll<HTMLElement>('[role="menuitemradio"]'),
    ];
    const choose = async (label: string): Promise<void> => {
      picker()?.click();
      await settle();
      const item: HTMLElement | undefined = items().find(
        (candidate: HTMLElement): boolean => candidate.textContent?.trim() === label,
      );
      if (!item) throw new Error(`${label} missing`);
      item.click();
      await settle();
    };
    const block = (): JSONContent | undefined =>
      editor.getJSON().content?.find((node: JSONContent): boolean => node.type === 'codeBlock');
    await settle();
    expect(picker()).toBeNull();

    const end: number = editor.state.doc.content.size;
    editor
      .chain()
      .insertContentAt(end, {
        type: 'codeBlock',
        content: [{ type: 'text', text: 'const answer: number = 42; // réponse' }],
      })
      .setTextSelection(end + 3)
      .run();
    await settle();
    // Plain text: named so, and never guessed.
    expect(picker()?.getAttribute('aria-label')).toBe('Langage du bloc de code : Texte brut');
    expect(picker()?.textContent?.trim()).toBe('Texte brut');
    expect(picker()?.closest('[role="toolbar"]')).not.toBeNull();
    expect(highlighted()).toEqual([]);

    picker()?.click();
    await settle();
    expect(items().map((item: HTMLElement): string => item.textContent?.trim() ?? '')).toEqual([
      'Texte brut',
      'TypeScript',
      'JavaScript',
      'HTML',
      'XML',
      'CSS',
      'SCSS',
      'JSON',
      'Bash',
      'Python',
      'PHP',
      'SQL',
      'YAML',
      'Markdown',
      'Java',
      'C#',
      'Go',
      'Rust',
      'Dockerfile',
      'Nginx',
      'Mermaid',
    ]);
    expect(items()[0]?.getAttribute('aria-checked')).toBe('true');
    items()[1]?.click();
    await settle();
    expect(block()?.attrs).toEqual({ language: 'typescript' });
    expect(
      JSON.parse(JSON.stringify(host.model().doc)).content.find(
        (node: JSONContent): boolean => node.type === 'codeBlock',
      )?.attrs,
    ).toEqual({ language: 'typescript' });
    expect(picker()?.getAttribute('aria-label')).toBe('Langage du bloc de code : TypeScript');
    expect(highlighted()).toEqual(
      expect.arrayContaining([
        'hljs-keyword:const',
        'hljs-built_in:number',
        'hljs-number:42',
        'hljs-comment:// réponse',
      ]),
    );
    // The colours of the public article's token kinds, on the editing surface.
    const surface: string =
      root.querySelector('pre')?.closest('[class*="hljs-keyword"]')?.className ?? '';
    expect(surface).toContain(']:text-aurora-violet');
    expect(surface).toContain('.hljs-built\\_in)]:text-aurora-blue');
    expect(surface).toContain(':is(.hljs-comment,.hljs-quote)]:italic');

    await choose('Mermaid');
    expect(block()?.attrs).toEqual({ language: 'mermaid' });
    expect(highlighted()).toEqual([]);
    await choose('Texte brut');
    expect(block()?.attrs).toEqual({ language: null });
    expect(highlighted()).toEqual([]);
    await choose('HTML');
    expect(block()?.attrs).toEqual({ language: 'html' });

    // Only inside a code block.
    editor.commands.setTextSelection(3);
    await settle();
    expect(picker()).toBeNull();
  });

  it('keeps an unlisted language plain until the service names it, and its picker in the tab stop', async (): Promise<void> => {
    const { editor, root, settle } = await mount();
    const end: number = editor.state.doc.content.size;
    editor
      .chain()
      .insertContentAt(end, {
        type: 'codeBlock',
        attrs: { language: 'ts' },
        content: [{ type: 'text', text: 'const a = 1;' }],
      })
      .setTextSelection(end + 3)
      .run();
    await settle();
    expect(root.querySelectorAll('pre [class*="hljs-"]')).toHaveLength(0);
    const picker: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>(
      'button[aria-label^="Langage du bloc de code"]',
    );
    expect(picker?.textContent?.trim()).toBe('Texte brut');
    // One more stop of the toolbar's arrow keys: End reaches it, the last enabled control (the marks
    // are disabled in a code block).
    toolbarButton(root, 'Annuler la modification').focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }),
    );
    await settle();
    expect(document.activeElement).toBe(picker);
  });
});

describe('articleExtensions', (): void => {
  /**
   * Function editorOf
   *
   * @description
   * Detached editor with the article schema.
   *
   * @returns {Editor} A new editor.
   */
  const editorOf = (): Editor =>
    new Editor({ element: document.createElement('div'), extensions: articleExtensions() });

  it('produces exactly the golden document of the contract fixtures', (): void => {
    const editor: Editor = editorOf();
    buildGoldenDocument(editor);
    const golden: unknown = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          '../../../contracts/content/src/lib/testing/article-document.golden.json',
        ),
        'utf8',
      ),
    );
    expect(editor.getJSON()).toEqual(golden);
    editor.destroy();
  });

  it('keeps lists three levels deep and figures out of lists and quotes', (): void => {
    const editor: Editor = editorOf();
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph' }] });
    editor.commands.toggleBulletList();
    editor.commands.insertContent('Un');
    for (const label of ['Deux', 'Trois', 'Quatre']) {
      editor.commands.splitListItem('listItem');
      editor.commands.insertContent(label);
      editor.commands.sinkListItem('listItem');
    }
    expect(JSON.stringify(editor.getJSON()).match(/"bulletList"/g)).toHaveLength(3);
    editor.commands.setContent(
      '<blockquote><h2>Titre</h2><figure data-media="3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90"><img src="/media/x.png" alt="a"></figure></blockquote>',
    );
    expect(JSON.stringify(editor.getJSON())).not.toMatch(
      /"blockquote","content":\[\{"type":"(heading|figure)"/,
    );
    editor.destroy();
  });

  it('parses only uploaded figures and https or mailto links from pasted HTML', (): void => {
    const editor: Editor = editorOf();
    editor.commands.setContent(
      [
        '<h1>Grand titre</h1>',
        '<p><img src="https://ailleurs.example/image.png"><a href="javascript:alert(1)">piège</a> <a href="https://ok.example">ok</a></p>',
        '<figure data-media="pas-un-uuid"><img src="/media/x.webp"></figure>',
        '<figure data-media="3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90"><img src="https://ailleurs.example/x.webp" alt="Écran"><figcaption>Légende</figcaption></figure>',
      ].join(''),
    );
    const json: JSONContent = editor.getJSON();
    expect(json.content?.[0]?.type).toBe('paragraph');
    expect(JSON.stringify(json)).not.toContain('javascript:');
    expect(JSON.stringify(json)).toContain('"href":"https://ok.example"');
    expect(json.content?.filter((node: JSONContent): boolean => node.type === 'figure')).toEqual([
      {
        type: 'figure',
        attrs: {
          media: '3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90',
          alt: 'Écran',
          caption: 'Légende',
          src: null,
        },
      },
    ]);
    expect(editor.getHTML()).toContain('<figure data-media="3f2b8c1e-7a4d-4e2f-9b1a-0c5d6e7f8a90"');
    editor.destroy();
  });
});
