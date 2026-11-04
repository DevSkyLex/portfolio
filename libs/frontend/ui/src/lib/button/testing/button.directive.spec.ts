import type { Mock } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ButtonDirective } from '@internal/ui/lib/button/button.directive';
import { buttonVariants } from '@internal/ui/lib/button/constants/button.variants';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Renders a secondary small button with a caller class for directive styling assertions.
 */
@Component({
  imports: [ButtonDirective],
  template: `<button uiBtn variant="secondary" size="sm" class="w-full">Send</button>`,
})
class HostComponent {}

describe('ButtonDirective', () => {
  it("applies the variant, the size and the caller's classes", async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.className).toContain('hover:border-border-hover');
    expect(button.className).toContain('h-9');
    expect(button.className).toContain('w-full');
    expect(button.getAttribute('data-slot')).toBe('button');
  });

  it('takes the radius of its height and keeps the narrow ghost padding off the xs size', () => {
    const classes = (
      size: 'xs' | 'sm' | 'lg',
      variant: 'ghost' | 'primary' = 'primary',
    ): string[] => buttonVariants({ size, variant }).split(' ');
    expect(classes('sm')).toEqual(expect.arrayContaining(['h-9', 'rounded-md']));
    expect(classes('xs')).toEqual(expect.arrayContaining(['h-7', 'rounded-sm', 'px-2.5']));
    expect(classes('lg')).toEqual(expect.arrayContaining(['h-14', 'rounded-lg']));
    expect(classes('xs', 'ghost')).not.toContain('px-3');
    expect(classes('sm', 'ghost')).toContain('px-3');
  });

  it('offers square icon sizes on the small-control radius', () => {
    expect(buttonVariants({ size: 'icon-xs', variant: 'ghost' }).split(' ')).toEqual(
      expect.arrayContaining(['size-7', 'rounded-sm', 'px-0']),
    );
    expect(buttonVariants({ size: 'icon-sm', variant: 'ghost' }).split(' ')).toEqual(
      expect.arrayContaining(['size-8', 'rounded-sm', 'px-0']),
    );
    expect(buttonVariants({ size: 'icon-sm', variant: 'ghost' })).not.toContain('px-3');
  });

  it('keeps the medium weight when a caller resizes the text, and a quiet disabled fill', () => {
    const classes: string[] = buttonVariants({ size: 'xs', variant: 'primary' }).split(' ');
    expect(classes).toEqual(expect.arrayContaining(['font-medium', 'text-[13px]']));
    expect(classes).toEqual(
      expect.arrayContaining(['disabled:bg-fill-disabled', 'aria-disabled:bg-fill-disabled']),
    );
    expect(classes).not.toContain('disabled:bg-border-field');
    expect(buttonVariants({ variant: 'danger' })).toContain('disabled:bg-fill-disabled');
  });

  describe('ripple', () => {
    /**
     * Function render
     *
     * @description
     * Creates the button fixture, fixes its measured bounds and replaces `animate` with a spy.
     *
     * @returns Button element and animation spy.
     */
    async function render(): Promise<{
      button: HTMLButtonElement;
      animate: Mock<
        (
          keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
          options?: number | KeyframeAnimationOptions,
        ) => Animation
      >;
    }> {
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      await fixture.whenStable();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        top: 20,
        width: 120,
        height: 40,
      } as DOMRect);
      const animate: Mock<HTMLElement['animate']> = vi.fn<HTMLElement['animate']>();
      Object.defineProperty(button, 'animate', { value: animate, configurable: true });
      return { button, animate };
    }

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it('starts from the pointer and covers the farthest corner', async () => {
      const { button, animate } = await render();
      button.dispatchEvent(new MouseEvent('pointerdown', { clientX: 40, clientY: 30 }));
      expect(button.style.getPropertyValue('--rx')).toBe('30.0px');
      expect(button.style.getPropertyValue('--ry')).toBe('10.0px');
      expect(button.style.getPropertyValue('--rs')).toBe(
        `${(Math.hypot(90, 30) * 2).toFixed(1)}px`,
      );
      expect(animate).toHaveBeenCalledWith(
        [
          { opacity: 0.28, scale: 0 },
          { opacity: 0, scale: 1 },
        ],
        expect.objectContaining({ duration: 900, pseudoElement: '::after' }),
      );
    });

    it('starts from the centre when pressed from the keyboard', async () => {
      const { button, animate } = await render();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(button.style.getPropertyValue('--rx')).toBe('60.0px');
      expect(button.style.getPropertyValue('--ry')).toBe('20.0px');
      expect(animate).toHaveBeenCalledOnce();
    });

    it('stays still when the visitor prefers reduced motion', async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }));
      const { button, animate } = await render();
      button.dispatchEvent(new MouseEvent('pointerdown', { clientX: 40, clientY: 30 }));
      expect(animate).not.toHaveBeenCalled();
      expect(button.style.getPropertyValue('--rx')).toBe('');
    });

    it('runs when motion is allowed', async () => {
      vi.stubGlobal('matchMedia', () => ({ matches: false }));
      const { button, animate } = await render();
      button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(animate).toHaveBeenCalledOnce();
    });

    it('does nothing where the Web Animations API is missing', async () => {
      const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
      await fixture.whenStable();
      const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
      expect(typeof button.animate).not.toBe('function');
      button.dispatchEvent(new MouseEvent('pointerdown', { clientX: 40, clientY: 30 }));
      expect(button.style.getPropertyValue('--rx')).toBe('');
    });
  });
});
