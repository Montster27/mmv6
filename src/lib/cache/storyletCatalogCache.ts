/** Release selection is authenticated and run-specific. Never reuse another user's browser catalog. */
export async function fetchStoryletCatalog<T>(
  _seasonIndex: number | undefined,
  fetcher: () => Promise<T>
): Promise<T> {
  return fetcher();
}
