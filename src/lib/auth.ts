import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createHash, randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { resolveTenantSlugFromRequest, getTenantBySlug } from './tenant';
import type { User, Session, Tenant, UserRole } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenantId: string;
}

export interface AuthSession {
  user: AuthUser;
  tenant: Tenant;
  session: Session;
}

export interface LoginCredentials {
  email: string;
  password: string;
  tenantSlug: string;
}

export interface LoginResult {
  success: boolean;
  error?: string;
  token?: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const SESSION_TTL_DAYS = parseInt(process.env.SESSION_TTL_DAYS || '7', 10);
const COOKIE_NAME = 'session_token';
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// =============================================================================
// RATE LIMITING (In-memory for MVP)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10);
const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || '60000', 10);

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  entry.count++;
  
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  
  return false;
}

function clearRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) {
      loginAttempts.delete(key);
    }
  }
}, 60000);

// =============================================================================
// TOKEN UTILITIES
// =============================================================================

/**
 * Generate a random session token
 */
function generateToken(): string {
  return randomUUID();
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate session expiration date
 */
function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_TTL_DAYS);
  return date;
}

// =============================================================================
// PASSWORD UTILITIES
// =============================================================================

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Create a new session for a user
 */
export async function createSession(
  user: User,
  tenant: Tenant,
  request?: { userAgent?: string; ipAddress?: string }
): Promise<string> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = getExpirationDate();
  
  await prisma.session.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: request?.userAgent,
      ipAddress: request?.ipAddress,
    },
  });
  
  return token;
}

/**
 * Validate a session token and return session data
 */
export async function validateSession(token: string): Promise<AuthSession | null> {
  const tokenHash = hashToken(token);
  
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: true,
      tenant: true,
    },
  });
  
  if (!session) {
    return null;
  }
  
  // Check expiration
  if (new Date() > session.expiresAt) {
    // Clean up expired session
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      tenantId: session.user.tenantId,
    },
    tenant: session.tenant,
    session,
  };
}

/**
 * Delete a session (logout)
 */
export async function deleteSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  
  try {
    await prisma.session.delete({ where: { tokenHash } });
  } catch {
    // Session may already be deleted, ignore
  }
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

// =============================================================================
// COOKIE MANAGEMENT
// =============================================================================

/**
 * Set session cookie
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    domain: COOKIE_DOMAIN,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

/**
 * Get session token from cookie
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || null;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// =============================================================================
// LOGIN / LOGOUT
// =============================================================================

/**
 * Login a user with email and password
 */
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  const { email, password, tenantSlug } = credentials;
  
  // Rate limiting key (combine tenant and email)
  const rateLimitKey = `${tenantSlug}:${email.toLowerCase()}`;
  
  if (isRateLimited(rateLimitKey)) {
    return {
      success: false,
      error: 'Trop de tentatives. Veuillez réessayer dans quelques minutes.',
    };
  }
  
  try {
    // Get tenant
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) {
      return {
        success: false,
        error: 'Identifiants invalides.',
      };
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: email.toLowerCase(),
        },
      },
    });
    
    if (!user) {
      return {
        success: false,
        error: 'Identifiants invalides.',
      };
    }
    
    // Verify password
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return {
        success: false,
        error: 'Identifiants invalides.',
      };
    }
    
    // Clear rate limit on success
    clearRateLimit(rateLimitKey);
    
    // Create session
    const token = await createSession(user, tenant);
    
    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    };
  }
}

/**
 * Logout the current user
 */
export async function logout(): Promise<void> {
  const token = await getSessionToken();
  
  if (token) {
    await deleteSession(token);
    await clearSessionCookie();
  }
}

// =============================================================================
// AUTH CONTEXT (for Server Components)
// =============================================================================

/**
 * Get current auth session (cached per request)
 * Returns null if not authenticated
 */
export const getAuth = cache(async (): Promise<AuthSession | null> => {
  const token = await getSessionToken();
  
  if (!token) {
    return null;
  }
  
  return validateSession(token);
});

/**
 * Require authentication - redirects to login if not authenticated
 * For use in Server Components and Server Actions
 */
export async function requireAuth(): Promise<AuthSession> {
  const auth = await getAuth();
  
  if (!auth) {
    redirect('/app/login');
  }
  
  return auth;
}

/**
 * Require specific role(s)
 * Redirects to dashboard if user doesn't have required role
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthSession> {
  const auth = await requireAuth();
  
  if (!allowedRoles.includes(auth.user.role)) {
    redirect('/app');
  }
  
  return auth;
}

/**
 * Require OWNER role
 */
export async function requireOwner(): Promise<AuthSession> {
  return requireRole(['OWNER']);
}

// =============================================================================
// TENANT CONTEXT FOR AUTH
// =============================================================================

/**
 * Get tenant slug from current request for auth pages
 * This is used in login page to know which tenant to authenticate against
 */
export async function getAuthTenantSlug(): Promise<string | null> {
  const headerStore = await headers();
  return resolveTenantSlugFromRequest(headerStore);
}
