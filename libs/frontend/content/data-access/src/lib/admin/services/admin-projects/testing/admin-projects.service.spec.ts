import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { Observable } from 'rxjs';
import type { AdminProject } from '@internal/content-web-data-access/lib/admin/models/admin-project/admin-project.type';
import type { ProjectRevisionRequest } from '@vfortin/content-contracts';
import { AdminProjectsApiService } from '@internal/content-web-data-access/lib/admin/services/admin-projects/admin-projects.service';

describe('AdminProjectsApiService', (): void => {
  afterEach((): void => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('uses the unified article API for the lifecycle and preserves optimistic versions', (): void => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api: AdminProjectsApiService = TestBed.inject(AdminProjectsApiService);
    const http: HttpTestingController = TestBed.inject(HttpTestingController);
    const revision: ProjectRevisionRequest = {
      title: { fr: 'Draft' },
      summary: { fr: 'Summary' },
      lead: { fr: 'Lead' },
      client: { fr: 'Personal' },
      role: { fr: 'Author' },
      place: { fr: 'Online' },
      period: { start: { year: 2026, month: null }, end: null },
      siteUrl: null,
      techs: [],
      featured: false,
      cover: null,
      article: {
        fr: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Text' }] }],
        },
      },
      seo: { title: {}, description: {}, keywords: { fr: [] } },
    };
    const operations: Observable<AdminProject | AdminProject[]>[] = [
      api.list(),
      api.get('entry'),
      api.create(revision),
      api.revise('entry', 7, revision),
      api.publish('entry', 8),
      api.unpublish('entry', 9),
    ];
    for (const operation of operations) operation.subscribe({ error: (): void => undefined });
    const requests: TestRequest[] = http.match((request) =>
      request.url.startsWith('/api/content/admin/articles'),
    );
    expect(requests).toHaveLength(6);
    expect(requests.every((request) => !request.request.params.has('kind'))).toBe(true);
    expect(requests.slice(3).map((request) => request.request.headers.get('If-Match'))).toEqual([
      '"7"',
      '"8"',
      '"9"',
    ]);
    requests.forEach((request) => request.flush({}, { status: 503, statusText: 'Unavailable' }));
  });
});
