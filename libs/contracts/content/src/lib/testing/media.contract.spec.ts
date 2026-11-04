import { MediaDtoSchema } from '@internal/content-contracts/lib/media.contract';
import project from '@internal/content-contracts/lib/testing/admin-project.fixture.json';

describe('MediaDtoSchema', (): void => {
  it('accepts the media listed by the administrator fixture', (): void => {
    expect(
      project.media.map((media: unknown): boolean => MediaDtoSchema.safeParse(media).success),
    ).toEqual([true, true]);
  });

  it('rejects a source outside the media directory', (): void => {
    expect(
      MediaDtoSchema.safeParse({ ...project.media[0], src: '/assets/cover.webp' }).success,
    ).toBe(false);
  });
});
