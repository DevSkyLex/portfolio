import { cn } from '@internal/ui/lib/class-names/class-names.utils';

describe('cn', () => {
  it('keeps a theme text size next to a text colour', () => {
    expect(cn('text-control text-fg')).toBe('text-control text-fg');
  });

  it('lets the last theme size, radius and easing win', () => {
    expect(cn('text-control text-fg', 'text-small')).toBe('text-fg text-small');
    expect(cn('rounded-md', 'rounded-full')).toBe('rounded-full');
    expect(cn('rounded-2xs', 'rounded-xl')).toBe('rounded-xl');
    expect(cn('ease-orbit', 'ease-linear')).toBe('ease-linear');
  });
});
