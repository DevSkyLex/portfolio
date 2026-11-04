import { convertToParamMap } from '@angular/router';
import {
  clientRedirectHost,
  toAuthorizationQuery,
} from '@internal/identity-web-feature/lib/utils/authorization-query/authorization-query.utils';

describe('toAuthorizationQuery', () => {
  it('keeps the authorization parameters, lists repeated ones and drops the others', () => {
    expect(
      toAuthorizationQuery(
        convertToParamMap({
          client_id: 'c',
          scope: ['a', 'b'],
          prompt: 'consent',
          resource: Array.from(
            { length: 10 },
            (_value: unknown, index: number): string => `r${index}`,
          ),
        }),
      ),
    ).toEqual({
      client_id: 'c',
      scope: ['a', 'b'],
      resource: ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'],
    });
  });
});

describe('clientRedirectHost', () => {
  it.each([
    ['https://claude.ai/cb?code=x', 'claude.ai'],
    ['http://127.0.0.1:5000/cb', '127.0.0.1:5000'],
    ['http://[::1]:7/cb', '[::1]:7'],
    ['http://localhost/cb', 'localhost'],
    ['http://claude.ai/cb', null],
    ['javascript:alert(1)', null],
    ['cursor://callback', null],
    ['not a url', null],
  ])('reads %s as %s', (url: string, host: string | null) => {
    expect(clientRedirectHost(url)).toBe(host);
  });
});
