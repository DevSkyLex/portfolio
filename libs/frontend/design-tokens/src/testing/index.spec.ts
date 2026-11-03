import { describe, expect, it } from 'vitest';
import { AURORA_TOKENS, readToken } from '@internal/design-tokens/index';

describe('readToken', (): void => {
  it('reads the computed value of the token on the element', (): void => {
    const el: HTMLDivElement = document.createElement('div');
    el.style.setProperty('--aurora-pink', ' #ff4fae ');
    document.body.append(el);
    expect(readToken(el, '--aurora-pink')).toBe('#ff4fae');
  });

  it('exposes the four aurora hues in order', (): void => {
    expect(AURORA_TOKENS).toEqual([
      '--aurora-pink',
      '--aurora-violet',
      '--aurora-blue',
      '--aurora-cyan',
    ]);
  });
});
