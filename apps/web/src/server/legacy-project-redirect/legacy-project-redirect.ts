/** Redirects legacy public project URLs to the unified article routes. */
export function legacyProjectRedirect(
  path: string,
  originalUrl: string,
  localized: boolean,
): string | null {
  const match: RegExpExecArray | null = /^\/(?:(fr|en)\/)?projects(?:\/([^/]+))?\/?$/.exec(path);
  if (match === null) return null;
  const prefix: string = match[1] ? `/${match[1]}` : localized ? '/fr' : '';
  const source: URL = new URL(originalUrl.startsWith('/') ? originalUrl : path, 'http://localhost');
  const slug: string | undefined = match[2];
  if (slug !== undefined) return `${prefix}/articles/${slug}${source.search}${source.hash}`;
  source.searchParams.set('category', 'projects');
  return `${prefix}/articles${source.search}${source.hash}`;
}
