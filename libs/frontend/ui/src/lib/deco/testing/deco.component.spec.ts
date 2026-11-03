import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DecoComponent } from '@internal/ui/lib/deco/deco.component';
import { GlyphComponent } from '@internal/ui/lib/deco/components/glyph/glyph.component';

describe('DecoComponent', () => {
  it('draws one hidden shape per glyph, placed, sized and tinted', async () => {
    const fixture: ComponentFixture<DecoComponent> = TestBed.createComponent(DecoComponent);
    fixture.componentRef.setInput('glyphs', [
      { shape: 'cross', x: 92, y: 22, size: 70, depth: 0.6, phase: 1, tint: 'cyan' },
      { shape: 'square', x: 60, y: 12, size: 44, depth: 0.8, phase: 0, tint: 'violet', mid: true },
    ]);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    const shapes: HTMLElement[] = [...host.querySelectorAll<HTMLElement>(':scope > span')];
    expect(shapes).toHaveLength(2);
    expect(shapes[0]?.style.left).toBe('92%');
    expect(shapes[0]?.style.top).toBe('22%');
    expect(shapes[0]?.style.getPropertyValue('--fs')).toBe('70px');
    expect(shapes[0]?.style.getPropertyValue('--z')).toBe('0.6');
    expect(shapes[0]?.style.getPropertyValue('--t')).toBe('1');
    expect(shapes[0]?.className).toContain('text-aurora-cyan');
    expect(shapes[0]?.className).not.toContain('@max-[768px]:hidden');
    expect(shapes[0]?.querySelector('ui-glyph')?.className).toContain('size-[0.3em]');
    expect(shapes[0]?.querySelector('ui-glyph')?.className).toContain('animate-float');
    expect(shapes[1]?.className).toContain('text-aurora-violet');
    expect(shapes[1]?.className).toContain('@max-[768px]:hidden');
  });
});

describe('GlyphComponent', () => {
  it.each([
    ['dot', 'rounded-[50%]'],
    ['square', 'size-[0.2em]'],
    ['cross', 'bg-no-repeat'],
  ] as const)('draws a %s', async (shape, expected) => {
    const fixture: ComponentFixture<GlyphComponent> = TestBed.createComponent(GlyphComponent);
    fixture.componentRef.setInput('shape', shape);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    expect(host.className).toContain(expected);
    expect(host.className).toContain('block');
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });
});
