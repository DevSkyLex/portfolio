import type { VitestUtils } from 'vitest';
import { Component } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealDirective } from '@internal/ui/lib/reveal/reveal.directive';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Minimal test host that exposes a section to the reveal directive without adding unrelated rendering behavior.
 */
@Component({ imports: [RevealDirective], template: `<section uiReveal>Projects</section>` })
class HostComponent {}

describe('RevealDirective', (): void => {
  afterEach((): VitestUtils => vi.unstubAllGlobals());

  it('marks the element visible as soon as it enters the viewport', async (): Promise<void> => {
    let notify: IntersectionObserverCallback = (): undefined => undefined;
    vi.stubGlobal('matchMedia', (): { matches: boolean } => ({ matches: false }));
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        public constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        public observe(): void {
          return undefined;
        }
        public disconnect(): void {
          return undefined;
        }
      },
    );
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const section: HTMLElement = fixture.nativeElement.querySelector('section');
    expect(section.hasAttribute('data-in')).toBe(false);
    notify([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect(section.hasAttribute('data-in')).toBe(true);
  });

  it('shows right away when motion is reduced', async (): Promise<void> => {
    vi.stubGlobal('matchMedia', (): { matches: boolean } => ({ matches: true }));
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('section').hasAttribute('data-in')).toBe(true);
  });
});
