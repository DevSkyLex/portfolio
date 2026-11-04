import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BadgeDirective } from '@internal/ui/lib/badge/badge.directive';
import type {
  BadgeAppearance,
  BadgeShape,
  BadgeSize,
  BadgeVariant,
} from '@internal/ui/lib/badge/constants/badge.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a default badge on a span and a caller-styled outlined badge on a native anchor.
 */
@Component({
  imports: [BadgeDirective],
  template: `<span uiBadge>Angular</span>
    <a uiBadge variant="outline" class="h-6" href="/tags/nx">Nx</a>`,
})
class HostComponent {}

/**
 * Component AxesHostComponent
 * @class AxesHostComponent
 *
 * @description
 * One badge whose every axis is bound, led by a projected icon element when asked.
 */
@Component({
  imports: [BadgeDirective],
  template: `<span
    uiBadge
    [variant]="variant()"
    [appearance]="appearance()"
    [shape]="shape()"
    [size]="size()"
    [dot]="dot()"
    >Publié</span
  >`,
})
class AxesHostComponent {
  public readonly variant: WritableSignal<BadgeVariant> = signal<BadgeVariant>('success');
  public readonly appearance: WritableSignal<BadgeAppearance> = signal<BadgeAppearance>('outline');
  public readonly shape: WritableSignal<BadgeShape> = signal<BadgeShape>('default');
  public readonly size: WritableSignal<BadgeSize> = signal<BadgeSize>('sm');
  public readonly dot: WritableSignal<boolean> = signal<boolean>(true);
}

/**
 * Function axes
 *
 * @description
 * Renders the axes host and returns its badge with a helper applying one combination.
 *
 * @returns The badge and a setter resolving to its class list.
 */
async function axes(): Promise<{
  badge: HTMLElement;
  set: (patch: {
    variant?: BadgeVariant;
    appearance?: BadgeAppearance;
    shape?: BadgeShape;
    size?: BadgeSize;
    dot?: boolean;
  }) => Promise<string[]>;
}> {
  const fixture: ComponentFixture<AxesHostComponent> = TestBed.createComponent(AxesHostComponent);
  await fixture.whenStable();
  const host: AxesHostComponent = fixture.componentInstance;
  const badge: HTMLElement = fixture.nativeElement.querySelector('[data-slot="badge"]');
  return {
    badge,
    set: async (patch): Promise<string[]> => {
      if (patch.variant) host.variant.set(patch.variant);
      if (patch.appearance) host.appearance.set(patch.appearance);
      if (patch.shape) host.shape.set(patch.shape);
      if (patch.size) host.size.set(patch.size);
      if (patch.dot !== undefined) host.dot.set(patch.dot);
      await fixture.whenStable();
      return [...badge.classList];
    },
  };
}

describe('BadgeDirective', () => {
  it('keeps the native element and its semantics, neutral and outlined by default', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [tag, link] = fixture.nativeElement.querySelectorAll('[data-slot="badge"]');
    expect(tag.tagName).toBe('SPAN');
    expect(tag.dataset.variant).toBe('default');
    expect(tag.dataset.appearance).toBe('outline');
    expect(tag.classList).toContain('border-border');
    expect(tag.className).not.toMatch(/(^|\s)bg-/);
    // One 20 px default size for the dense admin lists and headers, the D43 `xs` radius.
    expect(tag.classList).toContain('h-5');
    expect(tag.classList).toContain('px-2');
    expect(tag.classList).toContain('rounded-xs');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/tags/nx');
    expect(link.dataset.variant).toBe('outline');
  });

  it("lets the caller's classes win over the defaults", async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const link: HTMLElement = fixture.nativeElement.querySelector('a');
    expect(link.className).toContain('h-6');
    expect(link.classList).not.toContain('h-5');
  });

  it('outline: no fill, a hairline, a muted label, the status ink on the dot and icon only', async () => {
    const { set } = await axes();
    const classes: string[] = await set({});
    expect(classes).toContain('border-border');
    expect(classes).toContain('text-fg-muted');
    expect(classes).toContain('before:bg-success-ink');
    expect(classes).toContain('[&>ng-icon]:text-success-ink');
    expect(classes).not.toContain('before:bg-current');
    expect(classes.some((c) => /^bg-/.test(c) || /^text-success/.test(c))).toBe(false);
  });

  it('ghost drops the hairline, soft tints with ink text, solid fills with on-fill text', async () => {
    const { set } = await axes();
    const ghost: string[] = await set({ appearance: 'ghost' });
    expect(ghost).toContain('border-transparent');
    expect(ghost).not.toContain('border-border');
    expect(ghost).toContain('text-fg-muted');
    expect(ghost).toContain('before:bg-success-ink');

    const soft: string[] = await set({ appearance: 'soft', variant: 'warning' });
    expect(soft).toEqual(expect.arrayContaining(['bg-warning/8', 'text-warning-ink']));
    expect(soft).not.toContain('text-fg-muted');

    const solid: string[] = await set({ appearance: 'solid', variant: 'danger' });
    expect(solid).toEqual(
      expect.arrayContaining(['bg-danger', 'text-on-fill', 'before:bg-current']),
    );
    expect(solid).toContain('[&>ng-icon]:text-current');
    expect(solid).not.toContain('before:bg-danger-ink');

    const neutralSoft: string[] = await set({ appearance: 'soft', variant: 'default' });
    expect(neutralSoft).toContain('bg-surface-raised');
    const neutralSolid: string[] = await set({ appearance: 'solid', variant: 'default' });
    expect(neutralSolid).toEqual(expect.arrayContaining(['bg-fill', 'text-on-fill']));
  });

  it('keeps the fg label on a soft accent badge, its tint being too light for accent text', async () => {
    const { set } = await axes();
    const accent: string[] = await set({ variant: 'accent', appearance: 'soft' });
    expect(accent).toEqual(expect.arrayContaining(['bg-accent/8', 'text-fg', 'before:bg-accent']));
    const solid: string[] = await set({ appearance: 'solid' });
    expect(solid).toEqual(expect.arrayContaining(['bg-accent', 'text-on-fill']));
  });

  it('keeps the sunk fill of the secondary badge whatever the appearance', async () => {
    const { set } = await axes();
    const classes: string[] = await set({ variant: 'secondary', appearance: 'outline' });
    expect(classes).toEqual(expect.arrayContaining(['bg-surface-sunk', 'border-transparent']));
    expect(classes).not.toContain('border-border');
  });

  it('rounds into a pill and grows to 24 px with 13 px text at the md size', async () => {
    const { set } = await axes();
    const pill: string[] = await set({ shape: 'pill' });
    expect(pill).toContain('rounded-full');
    expect(pill).not.toContain('rounded-xs');
    const md: string[] = await set({ size: 'md' });
    expect(md).toEqual(expect.arrayContaining(['h-6', 'px-2.5', 'text-[13px]/5']));
    expect(md).not.toContain('h-5');
  });

  it('balances a leading dot or icon with a smaller start padding, per size', async () => {
    const { set } = await axes();
    const smDot: string[] = await set({});
    expect(smDot).toEqual(expect.arrayContaining(['px-2', 'ps-1.5']));
    expect(smDot).toContain("before:content-['']");
    expect(smDot).toContain('has-[>ng-icon:first-child]:ps-1.5');
    const mdDot: string[] = await set({ size: 'md' });
    expect(mdDot).toEqual(expect.arrayContaining(['px-2.5', 'ps-2']));
    expect(mdDot).toContain('has-[>ng-icon:first-child]:ps-2');
    const plain: string[] = await set({ size: 'sm', dot: false });
    expect(plain).not.toContain('ps-1.5');
    expect(plain).not.toContain("before:content-['']");
  });
});
