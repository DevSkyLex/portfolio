import {
  RandomIdGenerator,
  SystemClock,
} from '@internal/content-adapters-out/lib/system/system.adapters';

describe('SystemClock', (): void => {
  it('reads the current time', (): void => {
    expect(Math.abs(new SystemClock().now().getTime() - Date.now())).toBeLessThan(1_000);
  });
});

describe('RandomIdGenerator', (): void => {
  it('generates distinct version 4 UUIDs', (): void => {
    const ids: RandomIdGenerator = new RandomIdGenerator();
    const [a, b] = [ids.next(), ids.next()];
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });
});
