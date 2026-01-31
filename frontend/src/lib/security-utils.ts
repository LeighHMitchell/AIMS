/**
 * AIMS Security Utilities
 *
 * Centralized security functions for:
 * - SSRF (Server-Side Request Forgery) protection
 * - SQL ILIKE wildcard injection prevention
 * - Input sanitization
 *
 * @module security-utils
 */

import dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

// ============================================================================
// SSRF Protection
// ============================================================================

// SECURITY: IPv4 private and special-use ranges that must be blocked
const BLOCKED_IPV4_RANGES = [
  // Loopback
  { start: '127.0.0.0', end: '127.255.255.255' },
  // Private networks (RFC 1918)
  { start: '10.0.0.0', end: '10.255.255.255' },
  { start: '172.16.0.0', end: '172.31.255.255' },
  { start: '192.168.0.0', end: '192.168.255.255' },
  // Link-local
  { start: '169.254.0.0', end: '169.254.255.255' },
  // Current network
  { start: '0.0.0.0', end: '0.255.255.255' },
];

// SECURITY: Specific IPs that must always be blocked (cloud metadata services)
const BLOCKED_IPS = [
  '169.254.169.254',  // AWS/GCP/Azure metadata
  'fd00:ec2::254',    // AWS IPv6 metadata
  '127.0.0.1',
  '::1',
  '0.0.0.0',
];

// SECURITY: Hostnames that must be blocked
const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
];

/**
 * Convert IPv4 address to a numeric value for range comparison
 */
function ipv4ToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IPv4 address falls within blocked ranges
 *
 * @param ip - IPv4 address string (e.g., "192.168.1.1")
 * @returns true if the IP is blocked (private/internal), false if safe
 */
export function isBlockedIPv4(ip: string): boolean {
  // Check explicit blocklist first
  if (BLOCKED_IPS.includes(ip)) {
    return true;
  }

  const ipNum = ipv4ToNumber(ip);

  for (const range of BLOCKED_IPV4_RANGES) {
    const startNum = ipv4ToNumber(range.start);
    const endNum = ipv4ToNumber(range.end);
    if (ipNum >= startNum && ipNum <= endNum) {
      return true;
    }
  }

  return false;
}

/**
 * Check if an IPv6 address is blocked (loopback, link-local, private)
 *
 * @param ip - IPv6 address string
 * @returns true if the IP is blocked, false if safe
 */
export function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Check explicit blocklist
  if (BLOCKED_IPS.includes(normalized)) {
    return true;
  }

  // Block loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
    return true;
  }

  // Block link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  // Block unique local addresses (fc00::/7)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // Block IPv4-mapped IPv6 addresses (::ffff:x.x.x.x)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.substring(7);
    // Check if the embedded IPv4 is blocked
    if (ipv4Part.includes('.')) {
      return isBlockedIPv4(ipv4Part);
    }
  }

  return false;
}

/**
 * Options for URL safety validation
 */
export interface ValidateUrlOptions {
  /** Allow HTTP in addition to HTTPS (default: false - HTTPS only) */
  allowHttp?: boolean;
  /** Custom log prefix for warning messages */
  logPrefix?: string;
}

/**
 * SECURITY: Validate that a URL points to a safe, public destination.
 * Prevents SSRF attacks by blocking:
 * - Private IP addresses (10.x, 172.16.x, 192.168.x)
 * - Loopback addresses (127.0.0.1, localhost)
 * - Cloud metadata services (169.254.169.254)
 * - DNS rebinding attacks (validates resolved IP)
 *
 * @param urlString - The URL to validate
 * @param options - Validation options
 * @returns Error message if blocked, null if safe
 *
 * @example
 * const error = await validateUrlSafety('https://example.com/data.xml');
 * if (error) {
 *   return NextResponse.json({ error }, { status: 403 });
 * }
 */
export async function validateUrlSafety(
  urlString: string,
  options: ValidateUrlOptions = {}
): Promise<string | null> {
  const { allowHttp = false, logPrefix = '[Security]' } = options;

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    return 'Invalid URL format';
  }

  // SECURITY: Protocol validation
  if (allowHttp) {
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return 'Only HTTP and HTTPS URLs are allowed';
    }
  } else {
    if (parsedUrl.protocol !== 'https:') {
      return 'Only HTTPS URLs are allowed for security';
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // SECURITY: Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    console.warn(`${logPrefix} SSRF BLOCKED: Attempted access to blocked hostname: ${hostname}`);
    return 'Access to this hostname is not allowed';
  }

  // SECURITY: Block if hostname looks like an IP address and is in blocked range
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[\da-fA-F:]+$/;

  if (ipv4Regex.test(hostname)) {
    if (isBlockedIPv4(hostname)) {
      console.warn(`${logPrefix} SSRF BLOCKED: Attempted access to blocked IPv4: ${hostname}`);
      return 'Access to private or internal IP addresses is not allowed';
    }
  } else if (ipv6Regex.test(hostname) || hostname.startsWith('[')) {
    const cleanIp = hostname.replace(/^\[|\]$/g, '');
    if (isBlockedIPv6(cleanIp)) {
      console.warn(`${logPrefix} SSRF BLOCKED: Attempted access to blocked IPv6: ${hostname}`);
      return 'Access to private or internal IP addresses is not allowed';
    }
  }

  // SECURITY: DNS resolution check to prevent DNS rebinding attacks
  // Resolve the hostname and verify the IP is not internal
  try {
    const { address, family } = await dnsLookup(hostname);

    if (family === 4) {
      if (isBlockedIPv4(address)) {
        console.warn(`${logPrefix} SSRF BLOCKED: Hostname ${hostname} resolved to blocked IP: ${address}`);
        return 'This URL resolves to a private or internal IP address';
      }
    } else if (family === 6) {
      if (isBlockedIPv6(address)) {
        console.warn(`${logPrefix} SSRF BLOCKED: Hostname ${hostname} resolved to blocked IPv6: ${address}`);
        return 'This URL resolves to a private or internal IP address';
      }
    }
  } catch (dnsError) {
    console.error(`${logPrefix} DNS lookup failed for ${hostname}:`, dnsError);
    return 'Unable to resolve hostname';
  }

  return null; // URL is safe
}

// ============================================================================
// SQL ILIKE Injection Protection
// ============================================================================

/**
 * SECURITY: Escape SQL ILIKE wildcard characters to prevent filter injection.
 *
 * In PostgreSQL ILIKE patterns:
 * - `%` matches any sequence of zero or more characters
 * - `_` matches any single character
 * - `\` is the escape character
 *
 * Without escaping, a user searching for "%" would match ALL rows (data enumeration).
 *
 * @param input - Raw user input
 * @returns Escaped string safe for use in ILIKE patterns
 *
 * @example
 * const escaped = escapeIlikeWildcards(userSearch);
 * query.ilike('name', `%${escaped}%`);
 */
export function escapeIlikeWildcards(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first (it's the escape char)
    .replace(/%/g, '\\%')    // Escape percent wildcard
    .replace(/_/g, '\\_');   // Escape underscore wildcard
}

// ============================================================================
// Input Sanitization
// ============================================================================

/** Default maximum search term length */
export const DEFAULT_MAX_SEARCH_LENGTH = 200;

/**
 * Options for search input sanitization
 */
export interface SanitizeSearchOptions {
  /** Maximum allowed length (default: 200) */
  maxLength?: number;
  /** Whether to reject wildcard-only inputs (default: true) */
  rejectWildcardOnly?: boolean;
}

/**
 * SECURITY: Sanitize and validate search input.
 *
 * Performs the following validations:
 * - Trims whitespace
 * - Enforces maximum length (prevents DoS)
 * - Rejects empty strings
 * - Optionally rejects strings that are only wildcards
 *
 * @param query - Raw user input (may be null)
 * @param options - Sanitization options
 * @returns Sanitized string, or null if input is invalid/empty
 *
 * @example
 * const search = sanitizeSearchInput(request.query.q);
 * if (!search) {
 *   return { results: [], total: 0 };
 * }
 */
export function sanitizeSearchInput(
  query: string | null,
  options: SanitizeSearchOptions = {}
): string | null {
  const {
    maxLength = DEFAULT_MAX_SEARCH_LENGTH,
    rejectWildcardOnly = true
  } = options;

  if (!query) return null;

  // Trim whitespace
  let sanitized = query.trim();

  // Enforce maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Reject empty strings
  if (sanitized.length === 0) {
    return null;
  }

  // Reject strings that are ONLY wildcards (would match everything after escaping)
  if (rejectWildcardOnly && /^[%_\\]+$/.test(sanitized)) {
    console.warn('[Security] Search rejected: input consists only of wildcard characters');
    return null;
  }

  return sanitized;
}
