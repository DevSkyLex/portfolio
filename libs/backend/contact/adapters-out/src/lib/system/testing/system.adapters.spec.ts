import {
  RandomIdGenerator,
  SystemClock,
} from '@internal/contact-adapters-out/lib/system/system.adapters';

describe('SystemClock and RandomIdGenerator', (): void => {
  it('read the time and draw unique identifiers', (): void => {
    expect(Math.abs(new SystemClock().now().getTime() - Date.now())).toBeLessThan(1_000);
    const ids: RandomIdGenerator = new RandomIdGenerator();
    expect(ids.next()).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids.next()).not.toBe(ids.next());
  });
});
