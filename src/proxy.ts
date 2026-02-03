import { NextRequest, NextResponse } from 'next/server';

/**
 * CRITICAL: This proxy runs in Edge Runtime
 * - NO Prisma imports
 * - NO database access
 * - Only parse Host, extract tenant slug, rewrite paths, set headers
 * 
 * Host Header Parsing Examples:
 * - Dev:  "pizza.saasresto.localhost:3000" → hostname: "pizza.saasresto.localhost"
 * - Prod: "pizza.saasresto.isprojets.cloud" → hostname: "pizza.saasresto.isprojets.cloud"
 */

// Reserved subdomains that should NOT be treated as tenants
// IMPORTANT: Do NOT add tenant slugs like 'demo', 'pizza' here!
// Only add system/infrastructure subdomains.
const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'static', 'assets', 'cdn', 'support', 'help',
];

/**
 * Normalize Host header by stripping port and lowercasing
 * 
 * @param hostHeader - The raw Host header value (e.g., "pizza.saasresto.localhost:3000")
 * @returns Normalized hostname without port, lowercased (e.g., "pizza.saasresto.localhost")
 * 
 * Examples:
 * - "pizza.saasresto.localhost:3000" → "pizza.saasresto.localhost"
 * - "Pizza.SaasResto.localhost" → "pizza.saasresto.localhost"
 * - null → null
 */
function normalizeHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  // Split on ":" to remove port, take first part, lowercase
  return hostHeader.split(':')[0].toLowerCase();
}

/**
 * Extract tenant slug from hostname
 */
function extractTenantSlug(hostname: string, baseDomain: string): string | null {
  // Normalize: ensure lowercase (already done by normalizeHost, but be safe)
  const normalizedHost = hostname.toLowerCase();
  const normalizedBase = baseDomain.toLowerCase();
  
  // Check if hostname ends with base domain
  if (!normalizedHost.endsWith(normalizedBase)) {
    return null;
  }
  
  // Extract the part before the base domain
  const prefix = normalizedHost.slice(0, -normalizedBase.length);
  
  // Remove trailing dot if present
  const subdomain = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
  
  // No subdomain
  if (!subdomain) {
    return null;
  }
  
  // Check if it's a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }
  
  // Validate slug format (alphanumeric and hyphens)
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
    return null;
  }
  
  return subdomain;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get APP_BASE_DOMAIN from environment
  const baseDomain = process.env.APP_BASE_DOMAIN || 'saasresto.localhost';
  
  // Get and normalize the Host header (strips port, lowercases)
  const hostHeader = request.headers.get('host');
  const hostname = normalizeHost(hostHeader);
  
  // Skip paths that should not be rewritten
  // - /app/** (backoffice)
  // - /api/** (API routes)
  // - /_next/** (Next.js internals)
  // - /t/** (already rewritten tenant routes)
  // - /uploads/** (static files)
  // - Static files (favicon, images, etc.)
  if (
    pathname.startsWith('/app') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/t/') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.') // Static files like favicon.ico, images, etc.
  ) {
    return NextResponse.next();
  }
  
  // If no valid hostname, allow request to proceed
  if (!hostname) {
    return NextResponse.next();
  }
  
  // Extract tenant slug from hostname
  const tenantSlug = extractTenantSlug(hostname, baseDomain);
  
  // If no tenant slug found (e.g., accessing base domain directly)
  // Allow the request to proceed to root page
  if (!tenantSlug) {
    return NextResponse.next();
  }
  
  // Clone the URL and rewrite to tenant route
  // Note: Using /t/ (not /_t/) because Next.js treats _ prefixed folders as private
  const url = request.nextUrl.clone();
  url.pathname = `/t/${tenantSlug}${pathname}`;
  
  // Create response with rewrite
  const response = NextResponse.rewrite(url);
  
  // Set tenant slug header for downstream consumption
  response.headers.set('x-tenant-slug', tenantSlug);
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
