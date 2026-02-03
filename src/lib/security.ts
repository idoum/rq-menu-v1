/**
 * Security utilities and constants
 */

import crypto from 'crypto';

// =============================================================================
// CRYPTO HELPERS
// =============================================================================

/**
 * Generate SHA-256 hash of input
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a cryptographically secure random token (URL-safe)
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Normalize email for comparison (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// =============================================================================
// RATE LIMITING (in-memory, MVP)
// =============================================================================

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limit for an action
 * @param action - Action identifier (e.g., 'forgot-password', 'login')
 * @param key - Unique key (e.g., IP address, email)
 * @param maxAttempts - Maximum attempts allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if within limit, false if rate limited
 */
export function checkRateLimit(
  action: string,
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean {
  const storeKey = `${action}:${key}`;
  const now = Date.now();
  const entry = rateLimitStore.get(storeKey);

  if (!entry) {
    rateLimitStore.set(storeKey, { count: 1, firstAttempt: now });
    return true;
  }

  // Window expired, reset
  if (now - entry.firstAttempt > windowMs) {
    rateLimitStore.set(storeKey, { count: 1, firstAttempt: now });
    return true;
  }

  // Within window
  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Rate limit response helper
 */
export function rateLimitedResponse(): Response {
  return Response.json(
    { error: 'Trop de tentatives. Veuillez réessayer plus tard.' },
    { status: 429 }
  );
}

// =============================================================================
// SECURITY HEADERS
// =============================================================================

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Alias for compatibility
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Get CSP header value
 */
export function getCSPHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs unsafe-eval in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  const reportUri = process.env.CSP_REPORT_URI;
  if (reportUri) {
    directives.push(`report-uri ${reportUri}`);
  }
  
  return directives.join('; ');
}

// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Alias for compatibility
export const sanitizeInput = sanitizeString;

/**
 * Validate and sanitize slug
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Alias for validatePassword (returns simpler format)
export function validatePassword(password: string): { valid: boolean; message?: string } {
  const result = validatePasswordStrength(password);
  return {
    valid: result.valid,
    message: result.errors[0],
  };
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Standard error response
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string
): Response {
  return Response.json(
    { error: message, code },
    { status }
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message: string = 'Non autorisé'): Response {
  return errorResponse(message, 401, 'UNAUTHORIZED');
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message: string = 'Accès refusé'): Response {
  return errorResponse(message, 403, 'FORBIDDEN');
}

/**
 * Not found response
 */
export function notFoundResponse(message: string = 'Ressource non trouvée'): Response {
  return errorResponse(message, 404, 'NOT_FOUND');
}

/**
 * Validation error response
 */
export function validationErrorResponse(errors: Record<string, string[]>): Response {
  return Response.json(
    { error: 'Données invalides', code: 'VALIDATION_ERROR', errors },
    { status: 400 }
  );
}

/**
 * Success response
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

/**
 * Created response
 */
export function createdResponse<T>(data: T): Response {
  return successResponse(data, 201);
}

/**
 * Check if an error is an unauthorized error from requireAuth
 */
export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof Error && error.message === 'Unauthorized';
}

// Re-export hashPassword from auth for convenience
export { hashPassword } from './auth';
