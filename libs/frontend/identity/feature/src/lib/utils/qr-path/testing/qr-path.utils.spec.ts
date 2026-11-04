import { toQrPath } from '@internal/identity-web-feature/lib/utils/qr-path/qr-path.utils';

describe('toQrPath', () => {
  it('draws each horizontal run of dark modules as one rectangle', () => {
    expect(
      toQrPath([
        [true, true, false, true],
        [false, false, false, false],
        [false, true, true, true],
      ]),
    ).toBe('M0 0h2v1h-2zM3 0h1v1h-1zM1 2h3v1h-3z');
  });

  it('returns an empty path for an empty or light matrix', () => {
    expect(toQrPath([])).toBe('');
    expect(toQrPath([[false, false]])).toBe('');
  });
});
