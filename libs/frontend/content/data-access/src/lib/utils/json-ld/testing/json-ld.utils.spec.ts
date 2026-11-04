import { jsonLdText } from '@internal/content-web-data-access/lib/utils/json-ld/json-ld.utils';

describe('jsonLdText', (): void => {
  it('escapes every opening angle bracket and keeps the parsed value', (): void => {
    const data: Record<string, unknown> = { headline: 'A </script><script>alert(1)</script> b' };
    const text: string = jsonLdText(data);
    expect(text).not.toContain('<');
    expect(text).toContain('\\u003c/script>');
    expect(JSON.parse(text)).toEqual(data);
  });
});
