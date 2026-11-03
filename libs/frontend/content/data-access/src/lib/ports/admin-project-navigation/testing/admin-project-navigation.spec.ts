import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';
import { AdminProjectNavigationPort } from '@internal/content-web-data-access/lib/ports/admin-project-navigation/admin-project-navigation.port';
import { provideAdminProjectNavigation } from '@internal/content-web-data-access/lib/providers/admin-project-navigation/admin-project-navigation.provider';

describe('AdminProjectNavigationPort', (): void => {
  afterEach((): TestBed => TestBed.resetTestingModule());
  it('publishes navigation meaning without exposing transport fields and distinguishes failures', async (): Promise<void> => {
    const api = {
      list: vi.fn().mockReturnValue(
        of([
          {
            id: 'p',
            title: { fr: 'Projet', en: 'Project' },
            slug: 'project',
            status: 'draft',
            version: 42,
          },
        ]),
      ),
    } as const;
    TestBed.configureTestingModule({
      providers: [
        provideAdminProjectNavigation(),
        { provide: AdminProjectsApiService, useValue: api },
      ],
    });
    const navigation: AdminProjectNavigationPort = TestBed.inject<AdminProjectNavigationPort>(
      AdminProjectNavigationPort,
    );
    await navigation.refresh();
    expect(navigation.items()).toEqual([
      {
        id: 'p',
        label: 'Projet',
        keywords: ['project', 'Project'],
        path: '/admin/projects/p',
        status: 'draft',
      },
    ]);
    expect(navigation.callState().status).toBe('success');
    api.list.mockReturnValue(throwError((): Error => new Error('offline')));
    await navigation.refresh();
    expect(navigation.callState().status).toBe('error');
    expect(navigation.items()).toEqual([]);
  });
});
