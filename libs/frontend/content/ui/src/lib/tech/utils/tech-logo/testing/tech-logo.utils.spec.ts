import { techLogo } from '@internal/content-web-ui/lib/tech/utils/tech-logo/tech-logo.utils';

describe('techLogo', (): void => {
  it('drops the embedded title and keeps the drawing', (): void => {
    expect(techLogo('<svg><title>Angular</title><path d="M0 0"/></svg>')).toBe(
      '<svg><path d="M0 0"/></svg>',
    );
    expect(techLogo('<svg><path d="M0 0"/></svg>')).toBe('<svg><path d="M0 0"/></svg>');
  });
});
