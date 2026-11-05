import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { PublicationStatusDto } from '@vfortin/content-contracts';
import { API_PREFIX } from '@vfortin/web-http';
import type { Observable } from 'rxjs';
import { ifMatch } from '@internal/content-web-data-access/lib/admin/utils/if-match/if-match.utils';

/** HTTP boundary for the explicit publication batch, independent of individual editor saves. */
@Injectable({ providedIn: 'root' })
export class AdminPublicationApiService {
  private readonly http: HttpClient = inject<HttpClient>(HttpClient);
  private readonly endpoint: string = `${API_PREFIX}/content/admin/publication`;

  public status(): Observable<PublicationStatusDto> {
    return this.http.get<PublicationStatusDto>(this.endpoint);
  }

  public start(version: number): Observable<PublicationStatusDto> {
    return this.http.post<PublicationStatusDto>(`${this.endpoint}/start`, null, {
      headers: ifMatch(version),
    });
  }

  public publish(version: number): Observable<PublicationStatusDto> {
    return this.http.post<PublicationStatusDto>(`${this.endpoint}/publish`, null, {
      headers: ifMatch(version),
    });
  }
}
