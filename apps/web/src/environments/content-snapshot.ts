/**
 * Export contentSnapshot
 *
 * @description
 * Browser-only source used after client navigation without transferred content. Initial hydration
 * consumes the request's validated TransferState; server configuration supplies its own fixed origin.
 */
export const contentSnapshot = async (locale: 'fr' | 'en'): Promise<unknown> => {
  const response: Response = await fetch(`/api/content/snapshot?locale=${locale}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Public content upstream returned ${response.status}.`);
  return response.json();
};
