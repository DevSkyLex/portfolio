import { cn } from '@internal/ui/lib/class-names/class-names.utils';

describe('cn', () => {
  it('keeps a theme text size next to a text colour', () => {
    expect(cn('text-control text-star')).toBe('text-control text-star');
  });

  it('lets the last theme size, radius and easing win', () => {
    expect(cn('text-control text-star', 'text-small')).toBe('text-star text-small');
    expect(cn('rounded-field', 'rounded-full')).toBe('rounded-full');
    expect(cn('ease-orbit', 'ease-linear')).toBe('ease-linear');
  });
});
