interface BraveSearchResult {
  title: string;
  description: string;
  url: string;
}

/**
 * Search Brave for information about a merchant/establishment.
 * Returns the top results with title and description.
 */
export async function searchMerchant(
  merchantName: string
): Promise<BraveSearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.warn("BRAVE_SEARCH_API_KEY not configured, skipping web search");
    return [];
  }

  const query = `"${merchantName}" estabelecimento comercio Brasil`;
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&search_lang=pt-br`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      console.error(`Brave Search error: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const results: BraveSearchResult[] = (data.web?.results || [])
      .slice(0, 3)
      .map((r: any) => ({
        title: r.title || "",
        description: r.description || "",
        url: r.url || "",
      }));

    return results;
  } catch (error) {
    console.error("Brave Search error:", error);
    return [];
  }
}
