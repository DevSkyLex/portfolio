import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminAuthLayoutComponent } from '@internal/web-shell/lib/admin/layouts/admin-auth-layout/admin-auth-layout.component';

describe('AdminAuthLayoutComponent', (): void => {
  it('shows the site mark and the owner name above the routed page', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<AdminAuthLayoutComponent> =
      TestBed.createComponent(AdminAuthLayoutComponent);
    await fixture.whenStable();
    const host: HTMLElement = fixture.nativeElement;
    const brand: HTMLElement | null = host.querySelector('[data-slot="admin-auth-brand"]');
    expect(brand?.textContent?.trim()).toBe('Valentin Fortin');
    expect(brand?.querySelector('app-site-logo')?.getAttribute('aria-hidden')).toBe('true');
    expect(brand?.classList).toContain('left-5');
    expect(host.querySelector('router-outlet')).not.toBeNull();
  });
});
