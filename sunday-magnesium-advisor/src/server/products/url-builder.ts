/** Fallback URL builder — prefer the URL field returned directly from MCP. */
export function buildProductUrl(slug: string, locale = "en"): string {
  return `https://www.sunday.de/${locale}/${slug}.html`;
}
