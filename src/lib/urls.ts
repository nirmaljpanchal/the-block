const PLACEHOLDER_IMAGE = '/placeholder-vehicle.png';

/**
 * Sanitize image URLs - only allow http(s) URLs and same-origin relative paths.
 * Falls back to placeholder for any other URL.
 */
export function sanitizeImageUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return PLACEHOLDER_IMAGE;
  }

  const trimmed = url.trim();

  // Allow https URLs
  if (trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Allow http URLs
  if (trimmed.startsWith('http://')) {
    return trimmed;
  }

  // Allow relative paths (same-origin)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Default to placeholder for anything else (javascript:, data:, etc.)
  return PLACEHOLDER_IMAGE;
}
