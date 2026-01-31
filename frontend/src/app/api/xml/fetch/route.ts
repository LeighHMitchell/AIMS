import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dns from 'dns';
import { promisify } from 'util';

// Force dynamic rendering - critical for production
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for fetching from slow external URLs

const dnsLookup = promisify(dns.lookup);

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
 */
function isBlockedIPv4(ip: string): boolean {
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
 */
function isBlockedIPv6(ip: string): boolean {
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
 * SECURITY: Validate that a URL points to a safe, public destination
 * Returns an error message if blocked, null if safe
 */
async function validateUrlSafety(urlString: string): Promise<string | null> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(urlString);
  } catch {
    return 'Invalid URL format';
  }

  // SECURITY: Only allow HTTPS (not HTTP) for production security
  if (parsedUrl.protocol !== 'https:') {
    return 'Only HTTPS URLs are allowed for security';
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // SECURITY: Block known dangerous hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    console.warn(`[XML Fetch] SSRF BLOCKED: Attempted access to blocked hostname: ${hostname}`);
    return 'Access to this hostname is not allowed';
  }

  // SECURITY: Block if hostname looks like an IP address and is in blocked range
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^[\da-fA-F:]+$/;

  if (ipv4Regex.test(hostname)) {
    if (isBlockedIPv4(hostname)) {
      console.warn(`[XML Fetch] SSRF BLOCKED: Attempted access to blocked IPv4: ${hostname}`);
      return 'Access to private or internal IP addresses is not allowed';
    }
  } else if (ipv6Regex.test(hostname) || hostname.startsWith('[')) {
    const cleanIp = hostname.replace(/^\[|\]$/g, '');
    if (isBlockedIPv6(cleanIp)) {
      console.warn(`[XML Fetch] SSRF BLOCKED: Attempted access to blocked IPv6: ${hostname}`);
      return 'Access to private or internal IP addresses is not allowed';
    }
  }

  // SECURITY: DNS resolution check to prevent DNS rebinding attacks
  // Resolve the hostname and verify the IP is not internal
  try {
    const { address, family } = await dnsLookup(hostname);

    if (family === 4) {
      if (isBlockedIPv4(address)) {
        console.warn(`[XML Fetch] SSRF BLOCKED: Hostname ${hostname} resolved to blocked IP: ${address}`);
        return 'This URL resolves to a private or internal IP address';
      }
    } else if (family === 6) {
      if (isBlockedIPv6(address)) {
        console.warn(`[XML Fetch] SSRF BLOCKED: Hostname ${hostname} resolved to blocked IPv6: ${address}`);
        return 'This URL resolves to a private or internal IP address';
      }
    }
  } catch (dnsError) {
    console.error(`[XML Fetch] DNS lookup failed for ${hostname}:`, dnsError);
    return 'Unable to resolve hostname';
  }

  return null; // URL is safe
}

export async function POST(request: NextRequest) {
  // SECURITY: Require authentication before any operations
  const { user, response: authResponse } = await requireAuth();
  if (authResponse) {
    return authResponse;
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate URL is safe before fetching
    const validationError = await validateUrlSafety(url);
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 403 }
      );
    }

    console.log(`[XML Fetch API] User ${user?.id} fetching XML from URL:`, url);

    // Fetch the XML content with appropriate headers
    // SECURITY: Using AbortController for timeout and redirect: 'error' to prevent SSRF via redirects
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60 seconds

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'AIMS-XML-Importer/1.0',
        },
        signal: controller.signal,
        // SECURITY: Disable redirects to prevent redirect-based SSRF bypass
        redirect: 'error',
      });

      clearTimeout(timeout);
    } catch (fetchError) {
      clearTimeout(timeout);

      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          return NextResponse.json(
            { error: 'Request timeout - URL took too long to respond (>60s)' },
            { status: 408 }
          );
        }

        // SECURITY: Handle redirect errors gracefully
        if (fetchError.message.includes('redirect')) {
          console.warn(`[XML Fetch] Redirect blocked for URL: ${url}`);
          return NextResponse.json(
            { error: 'URL redirects are not allowed for security reasons' },
            { status: 403 }
          );
        }
      }

      throw fetchError;
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch XML: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    console.log('[XML Fetch API] Content-Type:', contentType);

    // Get the content
    const content = await response.text();

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Empty XML content received from URL' },
        { status: 400 }
      );
    }

    // Basic XML validation - check if it looks like XML
    if (!content.trim().startsWith('<')) {
      return NextResponse.json(
        { error: 'Content does not appear to be XML' },
        { status: 400 }
      );
    }

    console.log(`[XML Fetch API] Successfully fetched XML for user ${user?.id}, length:`, content.length);

    return NextResponse.json({
      content,
      contentType,
      size: content.length
    });

  } catch (error) {
    console.error('[XML Fetch API] Error:', error);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - URL took too long to respond' },
          { status: 408 }
        );
      }

      // Don't leak internal error details
      console.error('[XML Fetch API] Internal error:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch XML from the provided URL' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Unknown error occurred while fetching XML' },
      { status: 500 }
    );
  }
}
