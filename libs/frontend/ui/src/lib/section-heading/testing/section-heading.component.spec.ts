import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SectionHeadingComponent } from '@internal/ui/lib/section-heading/section-heading.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies projected French title content to the section heading component test.
 */
@Component({
  imports: [SectionHeadingComponent],
  template: `<ui-section-heading headingId="projects-title">Projets</ui-section-heading>`,
})
class HostComponent {}

describe('SectionHeadingComponent', (): void => {
  it('renders the projected title as the section heading, revealed by its line', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const heading: HTMLElement = fixture.nativeElement.querySelector('h2') as HTMLElement;
    expect(heading.id).toBe('projects-title');
    expect(heading.textContent?.trim()).toBe('Projets');
    expect(heading.querySelector('span')?.className).toContain(
      'in-data-js:group-not-data-in:translate-y-[105%]',
    );
  });
});
