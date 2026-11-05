import type { Mock } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogService, ToastService } from '@vfortin/ui';
import { AdminPublicationSectionComponent } from '@internal/content-web-feature-admin/lib/ui/sections/admin-publication-section/admin-publication-section.component';

const URL: string = '/api/content/admin/publication';
const STATUS = {
  version: 2,
  batching: true,
  pendingChanges: false,
  revision: 4,
  publishedRevision: 4,
} as const;

/** Resolve SignalStore continuations and update the template after an HTTP answer. */
async function settle(fixture: ComponentFixture<AdminPublicationSectionComponent>): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  fixture.detectChanges();
}

describe('AdminPublicationSectionComponent', (): void => {
  const confirm: Mock<ConfirmDialogService['confirm']> = vi.fn<ConfirmDialogService['confirm']>();
  const success: Mock<ToastService['success']> = vi.fn<ToastService['success']>();
  let fixture: ComponentFixture<AdminPublicationSectionComponent>;
  let backend: HttpTestingController;

  beforeEach(async (): Promise<void> => {
    confirm.mockReset().mockResolvedValue(true);
    success.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfirmDialogService, useValue: { confirm } },
        { provide: ToastService, useValue: { success } },
      ],
    });
    fixture = TestBed.createComponent(AdminPublicationSectionComponent);
    backend = TestBed.inject<HttpTestingController>(HttpTestingController);
    backend.expectOne(URL).flush(STATUS);
    await settle(fixture);
  });

  afterEach((): void => backend.verify());

  it('refreshes changes saved on the same page, asks confirmation and publishes that observed version', async (): Promise<void> => {
    const button: HTMLButtonElement | undefined = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find(
      (node: HTMLButtonElement): boolean =>
        node.textContent?.includes('Publier le groupe') ?? false,
    );
    button?.click();
    backend.expectOne(URL).flush({ ...STATUS, version: 3, revision: 5, pendingChanges: true });
    await settle(fixture);
    expect(confirm).toHaveBeenCalledOnce();
    const request: TestRequest = backend.expectOne(`${URL}/publish`);
    expect(request.request.headers.get('if-match')).toBe('"3"');
    request.flush({ ...STATUS, version: 4, revision: 5, publishedRevision: 5, batching: false });
    await settle(fixture);
    expect(success).toHaveBeenCalledWith(expect.stringContaining('après la reconstruction'));
    expect(fixture.nativeElement.textContent).toContain('Préparer une publication groupée');
  });

  it('does not publish if the confirmation is declined', async (): Promise<void> => {
    confirm.mockResolvedValue(false);
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    buttons[1]?.click();
    backend.expectOne(URL).flush(STATUS);
    await settle(fixture);
    backend.expectNone(`${URL}/publish`);
    expect(success).not.toHaveBeenCalled();
  });

  it('does not open a confirmation or publish after navigation destroys the section', async (): Promise<void> => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    buttons[1]?.click();
    const refresh: TestRequest = backend.expectOne(URL);
    fixture.destroy();
    refresh.flush(STATUS);
    await Promise.resolve();
    await Promise.resolve();
    expect(confirm).not.toHaveBeenCalled();
    backend.expectNone(`${URL}/publish`);
  });

  it('shows a conflict if another save happens after confirmation, without silently retrying', async (): Promise<void> => {
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    buttons[1]?.click();
    backend.expectOne(URL).flush(STATUS);
    await settle(fixture);
    backend
      .expectOne(`${URL}/publish`)
      .flush({}, { status: 412, statusText: 'Precondition Failed' });
    await settle(fixture);
    expect(fixture.nativeElement.textContent).toContain('Actualisez l’état avant de publier');
    expect(success).not.toHaveBeenCalled();
  });
});
