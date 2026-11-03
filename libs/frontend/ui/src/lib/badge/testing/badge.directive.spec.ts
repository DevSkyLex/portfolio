import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { BadgeDirective } from '@internal/ui/lib/badge/badge.directive';

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

describe('BadgeDirective', () => {
  it('keeps the native element and its semantics', async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const [tag, link] = fixture.nativeElement.querySelectorAll('[data-slot="badge"]');
    expect(tag.tagName).toBe('SPAN');
    expect(tag.className).toContain('bg-void-raised');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/tags/nx');
    expect(link.dataset.variant).toBe('outline');
  });

  it("lets the caller's classes win over the defaults", async () => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const link: HTMLElement = fixture.nativeElement.querySelector('a');
    expect(link.className).toContain('h-6');
    expect(link.className).not.toContain('h-7');
  });
});
