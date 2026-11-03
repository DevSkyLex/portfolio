import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from '@internal/web/app/app';

describe('App', (): void => {
  it('only contains the router outlet', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture: ComponentFixture<App> = TestBed.createComponent<App>(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
