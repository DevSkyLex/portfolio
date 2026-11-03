import { SystemClock } from '@internal/content-adapters-out/lib/system/system.adapters';

describe('SystemClock', (): void => {
  it('reads the current time', (): void => {
    expect(Math.abs(new SystemClock().now().getTime() - Date.now())).toBeLessThan(1_000);
  });
});
