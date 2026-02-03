/**
 * URL utilities for building tenant public URLs
 * Handles dev vs prod environments correctly
 */

/**
 * Get the base domain from environment
 */
function getBaseDomain(): string {
  // Server-side: use APP_BASE_DOMAIN
  // Client-side: use NEXT_PUBLIC_APP_BASE_DOMAIN
  return (
    process.env.APP_BASE_DOMAIN ||
    process.env.NEXT_PUBLIC_APP_BASE_DOMAIN ||
    'saasresto.localhost'
  );
}

/**
 * Get the app URL from environment
 */
function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  );
}

/**
 * Check if we're in development mode
 */
function isDevelopment(): boolean {
  const nodeEnv = process.env.NODE_ENV || 'development';
  return nodeEnv === 'development';
}

/**
 * Build the public URL for a tenant's menu
 * 
 * @param tenantSlug - The tenant's slug (e.g., "pizza", "demo")
 * @returns The full public URL for the tenant's menu
 * 
 * @example
 * // In development (APP_URL=http://localhost:3000):
 * getTenantPublicUrl('pizza') // => 'http://pizza.saasresto.localhost:3000/'
 * 
 * // In production:
 * getTenantPublicUrl('pizza') // => 'https://pizza.saasresto.isprojets.cloud/'
 */
export function getTenantPublicUrl(tenantSlug: string): string {
  const baseDomain = getBaseDomain();
  const appUrl = getAppUrl();
  
  // Extract port from APP_URL if present
  const portMatch = appUrl.match(/:(\d+)/);
  const port = portMatch ? portMatch[1] : null;
  
  // In development with a port, use http and include the port
  if (isDevelopment() && port) {
    return `http://${tenantSlug}.${baseDomain}:${port}/`;
  }
  
  // In production (or dev without explicit port), use https
  return `https://${tenantSlug}.${baseDomain}/`;
}

/**
 * Build the display URL for a tenant (without protocol, for UI display)
 * 
 * @param tenantSlug - The tenant's slug
 * @returns The display URL without protocol
 */
export function getTenantDisplayUrl(tenantSlug: string): string {
  const baseDomain = getBaseDomain();
  return `${tenantSlug}.${baseDomain}`;
}

/**
 * Build a QR code URL for a tenant with optional zone and table parameters
 * 
 * @param tenantSlug - The tenant's slug
 * @param options - Optional zone and table parameters
 * @returns The full URL for the QR code
 */
export function getQrCodeUrl(
  tenantSlug: string,
  options?: { zone?: string; table?: string }
): string {
  const baseUrl = getTenantPublicUrl(tenantSlug);
  
  const params = new URLSearchParams();
  if (options?.zone) params.set('zone', options.zone);
  if (options?.table) params.set('table', options.table);
  
  const queryString = params.toString();
  
  // Remove trailing slash before adding query string, then add back
  const urlWithoutTrailingSlash = baseUrl.endsWith('/') 
    ? baseUrl.slice(0, -1) 
    : baseUrl;
  
  return queryString 
    ? `${urlWithoutTrailingSlash}?${queryString}` 
    : baseUrl;
}
