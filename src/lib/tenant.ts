import { cache } from 'react';
import { prisma } from './db';
import type { Tenant } from '@prisma/client';

/**
 * Get the APP_BASE_DOMAIN from environment
 * This is the base domain for all tenants (e.g., "saasresto.localhost")
 */
export function getBaseDomain(): string {
  const domain = process.env.APP_BASE_DOMAIN;
  if (!domain) {
    throw new Error('APP_BASE_DOMAIN environment variable is not set');
  }
  return domain;
}

/**
 * Normalize Host header by stripping port and lowercasing
 * 
 * @param hostHeader - The raw Host header value (e.g., "pizza.saasresto.localhost:3000")
 * @returns Normalized hostname without port, lowercased (e.g., "pizza.saasresto.localhost")
 * 
 * Examples:
 * - "pizza.saasresto.localhost:3000" → "pizza.saasresto.localhost"
 * - "Pizza.SaasResto.localhost" → "pizza.saasresto.localhost"
 * - "demo.saasresto.isprojets.cloud" → "demo.saasresto.isprojets.cloud" (no port in prod)
 * - null → null
 */
export function normalizeHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  // Split on ":" to remove port, take first part, lowercase
  return hostHeader.split(':')[0].toLowerCase();
}

/**
 * Reserved subdomains that should NOT be treated as tenants
 */
const RESERVED_SUBDOMAINS = ['www', 'app', 'api', 'admin', 'static', 'assets', 'cdn'];

/**
 * Check if a subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase());
}

/**
 * Extract tenant slug from hostname
 * Returns null if hostname doesn't match tenant pattern
 * 
 * Examples:
 * - "demo.saasresto.localhost" → "demo"
 * - "www.saasresto.localhost" → null (reserved)
 * - "saasresto.localhost" → null (no subdomain)
 * - "localhost:3000" → null (no match)
 */
export function extractTenantSlug(hostname: string): string | null {
  const baseDomain = getBaseDomain();
  
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Check if hostname ends with base domain
  if (!hostWithoutPort.endsWith(baseDomain)) {
    return null;
  }
  
  // Extract the part before the base domain
  const prefix = hostWithoutPort.slice(0, -baseDomain.length);
  
  // Remove trailing dot if present
  const subdomain = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
  
  // No subdomain
  if (!subdomain) {
    return null;
  }
  
  // Check if it's a reserved subdomain
  if (isReservedSubdomain(subdomain)) {
    return null;
  }
  
  // Validate slug format (alphanumeric and hyphens, no leading/trailing hyphens)
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(subdomain)) {
    return null;
  }
  
  return subdomain.toLowerCase();
}

/**
 * Resolve tenant slug from request headers
 * First checks x-tenant-slug header (set by middleware)
 * Falls back to parsing Host header
 */
export function resolveTenantSlugFromRequest(headers: Headers): string | null {
  // First, check for header set by middleware
  const tenantHeader = headers.get('x-tenant-slug');
  if (tenantHeader) {
    return tenantHeader;
  }
  
  // Fallback: parse Host header
  const host = headers.get('host');
  if (!host) {
    return null;
  }
  
  return extractTenantSlug(host);
}

/**
 * Get tenant by slug from database
 * Cached for performance within request
 */
export const getTenantBySlug = cache(async (slug: string): Promise<Tenant | null> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
    });
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
});

/**
 * Get tenant by ID from database
 * Cached for performance within request
 */
export const getTenantById = cache(async (id: string): Promise<Tenant | null> => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
    });
    return tenant;
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return null;
  }
});

/**
 * Build tenant URL for a given slug and path
 */
export function buildTenantUrl(slug: string, path: string = '/'): string {
  const baseDomain = getBaseDomain();
  const protocol = process.env.COOKIE_SECURE === 'true' ? 'https' : 'http';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${protocol}://${slug}.${baseDomain}${normalizedPath}`;
}
