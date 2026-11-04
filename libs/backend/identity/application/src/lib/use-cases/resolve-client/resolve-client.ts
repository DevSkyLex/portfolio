import {
  OAuthClient,
  OAuthError,
  assertMetadataDocumentUrl,
  isMetadataDocumentClientId,
} from '@vfortin/identity-domain';
import type {
  ClientMetadataFetcher,
  FetchedClientMetadata,
  OAuthUnitOfWork,
} from '@internal/identity-application/lib/ports/oauth/oauth.ports';

/**
 * Constant METADATA_CACHE_MIN_SECONDS
 *
 * @description
 * Shortest reuse of a fetched metadata document, in seconds, even under `no-store`: one consent
 * fetches it once, not on every step.
 *
 * @type {number}
 */
export const METADATA_CACHE_MIN_SECONDS = 60 as const;

/**
 * Constant METADATA_CACHE_DEFAULT_SECONDS
 *
 * @description
 * Reuse of a document served without a cache header, in seconds.
 *
 * @type {number}
 */
export const METADATA_CACHE_DEFAULT_SECONDS = 3600 as const;

/**
 * Constant METADATA_CACHE_MAX_SECONDS
 *
 * @description
 * Longest reuse whatever `max-age` says, in seconds, so that a changed registration is seen within
 * a day.
 *
 * @type {number}
 */
export const METADATA_CACHE_MAX_SECONDS = 86_400 as const;

/**
 * Function cacheSeconds
 *
 * @description
 * Bounds the freshness the document's HTTP cache headers ask for.
 *
 * @param {number | null} maxAge - `max-age` in seconds, `0` for `no-store`/`no-cache`, `null` without header.
 *
 * @returns {number} Seconds to reuse the copy.
 */
function cacheSeconds(maxAge: number | null): number {
  const asked: number = maxAge ?? METADATA_CACHE_DEFAULT_SECONDS;
  return Math.min(Math.max(asked, METADATA_CACHE_MIN_SECONDS), METADATA_CACHE_MAX_SECONDS);
}

/**
 * Function resolveClient
 *
 * @description
 * Finds the client of an authorization request (D45). An `https` identifier is a Client ID Metadata
 * Document: the stored copy is used while fresh, otherwise the document is fetched again (outside
 * any transaction), validated and stored; a failed fetch aborts, as the draft recommends. Any other
 * identifier must be a stored dynamic registration. The logo is fetched once per validated metadata.
 * Only an administrator's review triggers these outbound fetches.
 *
 * @param {OAuthUnitOfWork} unitOfWork - Transaction boundary of the reads and writes.
 * @param {ClientMetadataFetcher} fetcher - SSRF-safe outbound fetches.
 * @param {string} clientId - Presented client identifier.
 * @param {Date} now - Review instant.
 *
 * @returns {Promise<OAuthClient>} Client with fresh metadata.
 *
 * @throws {OAuthError} `invalid_client` for an unknown client or a rejected document.
 */
export async function resolveClient(
  unitOfWork: OAuthUnitOfWork,
  fetcher: ClientMetadataFetcher,
  clientId: string,
  now: Date,
): Promise<OAuthClient> {
  const stored: OAuthClient | null = await unitOfWork.run(
    ({ clients }): Promise<OAuthClient | null> => clients.findById(clientId),
  );
  let client: OAuthClient;
  let changed: boolean = false;
  if (!isMetadataDocumentClientId(clientId)) {
    if (stored === null || stored.kind !== 'dynamic') {
      throw new OAuthError('invalid_client', 'The client is not registered.');
    }
    client = stored;
  } else if (stored !== null && !stored.isStale(now)) {
    client = stored;
  } else {
    assertMetadataDocumentUrl(clientId);
    let fetched: FetchedClientMetadata;
    try {
      fetched = await fetcher.fetchDocument(clientId);
    } catch {
      throw new OAuthError('invalid_client', 'The client metadata document could not be fetched.');
    }
    const expiresAt: Date = new Date(now.getTime() + cacheSeconds(fetched.maxAgeSeconds) * 1000);
    client = OAuthClient.fromMetadataDocument(clientId, fetched.document, now, expiresAt, stored);
    changed = true;
  }
  if (client.logoUri !== null && client.needsLogo()) {
    client = client.withLogo(await fetcher.fetchLogo(client.logoUri), now);
    changed = true;
  }
  if (changed) {
    const saved: OAuthClient = client;
    await unitOfWork.run(({ clients }): Promise<void> => clients.save(saved));
  }
  return client;
}
