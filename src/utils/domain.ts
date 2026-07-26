// ============================================================
// Domain Utilities
// ============================================================

/**
 * Extracts a trackable domain from a URL.
 * Handles localhost with port, regular domains, and subdomains.
 */
export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    // Skip internal chrome pages
    if (parsed.protocol === 'chrome:' || parsed.protocol === 'chrome-extension:' || parsed.protocol === 'about:') {
      return null;
    }
    // For localhost, include port
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
    }
    return parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL's domain matches a tracked site domain.
 * Supports exact match and subdomain matching.
 */
export function matchesDomain(url: string, trackedDomain: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  // Exact match
  if (domain === trackedDomain) return true;

  // Subdomain match: "www.github.com" matches "github.com"
  if (domain.endsWith(`.${trackedDomain}`)) return true;

  return false;
}

/**
 * Finds which tracked site matches the given URL.
 */
export function findMatchingSite<T extends { domain: string; enabled: boolean }>(
  url: string,
  sites: T[]
): T | null {
  for (const site of sites) {
    if (site.enabled && matchesDomain(url, site.domain)) {
      return site;
    }
  }
  return null;
}

/**
 * Validates a domain string entered by the user.
 */
export function isValidDomain(input: string): boolean {
  // Allow localhost:port
  if (/^localhost(:\d+)?$/.test(input)) return true;
  if (/^127\.0\.0\.1(:\d+)?$/.test(input)) return true;
  // Standard domain validation
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(input);
}
