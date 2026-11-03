import { TestBed } from '@angular/core/testing';
import { RenderIdService } from '@internal/ui/lib/render-id/render-id.service';

describe('RenderIdService', (): void => {
  it('counts per prefix, from 0 in each application', (): void => {
    const ids: RenderIdService = TestBed.inject<RenderIdService>(RenderIdService);
    expect([ids.next('a-'), ids.next('a-'), ids.next('b-')]).toEqual(['a-0', 'a-1', 'b-0']);
    TestBed.resetTestingModule();
    expect(TestBed.inject<RenderIdService>(RenderIdService).next('a-')).toBe('a-0');
  });
});
