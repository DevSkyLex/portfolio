import { articleOrder } from '@internal/content-web-data-access/lib/utils/article-order/article-order.utils';

describe('articleOrder', (): void => {
  const item: (slug: string, featured?: boolean) => { slug: string; featured: boolean } = (
    slug: string,
    featured: boolean = false,
  ): { slug: string; featured: boolean } => ({ slug, featured });

  it('reads the featured projects, then the home row from its last card', (): void => {
    expect(
      articleOrder([item('movah', true), item('rdi'), item('crm'), item('iot')]).map(
        (p: { slug: string; featured: boolean }): string => p.slug,
      ),
    ).toEqual(['movah', 'iot', 'rdi', 'crm']);
  });

  it('starts from the last regular card when nothing is featured', (): void => {
    expect(
      articleOrder([item('a', true)]).map(
        (p: { slug: string; featured: boolean }): string => p.slug,
      ),
    ).toEqual(['a']);
    expect(
      articleOrder([item('a'), item('b')]).map(
        (p: { slug: string; featured: boolean }): string => p.slug,
      ),
    ).toEqual(['b', 'a']);
    expect(articleOrder([])).toEqual([]);
  });
});
