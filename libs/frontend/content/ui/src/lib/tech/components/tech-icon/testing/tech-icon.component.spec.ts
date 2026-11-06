import { Component } from '@angular/core';
import {
  type ComponentFixture,
  type DeferBlockFixture,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing';
import { TechIconComponent } from '@internal/content-web-ui/lib/tech/components/tech-icon/tech-icon.component';

/**
 * Class TechIconHostComponent
 * @class TechIconHostComponent
 *
 * @description
 * Renders one icon per catalogue key, alias, key without logo and unknown key.
 */
@Component({
  imports: [TechIconComponent],
  template: `
    <content-tech-icon id="key" tech="postgresql" />
    <content-tech-icon id="alias" tech="postgres" />
    <content-tech-icon id="no-logo" tech="riverpod" />
    <content-tech-icon id="unknown" tech="cobol" />
  `,
})
class TechIconHostComponent {}

describe('TechIconComponent', (): void => {
  it('draws the deferred logo of a key or alias, nothing without one', async (): Promise<void> => {
    const fixture: ComponentFixture<TechIconHostComponent> =
      TestBed.createComponent(TechIconHostComponent);
    fixture.detectChanges();
    const blocks: DeferBlockFixture[] = await fixture.getDeferBlocks();
    expect(blocks).toHaveLength(4);
    for (const block of blocks) await block.render(DeferBlockState.Complete);
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const svg = (id: string): SVGElement | null => root.querySelector(`#${id} svg`);
    expect(svg('key')).not.toBeNull();
    expect(svg('alias')?.outerHTML).toBe(svg('key')?.outerHTML);
    expect(svg('key')?.querySelector('title')).toBeNull();
    expect(svg('no-logo')).toBeNull();
    expect(svg('unknown')).toBeNull();
    expect(root.querySelector('#key')?.getAttribute('aria-hidden')).toBe('true');
  });
});
