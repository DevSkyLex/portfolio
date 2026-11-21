import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { SiteLogoComponent } from '@internal/web-shell/lib/layout/site-layout/components/site-logo/site-logo.component';

describe('SiteLogoComponent', () => {
  let fixture: ComponentFixture<SiteLogoComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SiteLogoComponent] });
    fixture = TestBed.createComponent(SiteLogoComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('is hidden from assistive technologies, the surrounding link naming the site', () => {
    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws the five band shapes in the aurora hues, top to bottom', () => {
    const fills: string[] = Array.from(host.querySelectorAll('path')).map(
      (path: SVGPathElement): string => path.getAttribute('class') ?? '',
    );

    expect(fills).toEqual([
      'fill-aurora-pink',
      'fill-aurora-violet',
      'fill-aurora-violet',
      'fill-aurora-blue',
      'fill-aurora-cyan',
    ]);
  });
});
