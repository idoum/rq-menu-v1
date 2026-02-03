import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations';
import { 
  sha256, 
  generateSecureToken, 
  normalizeEmail, 
  checkRateLimit, 
  rateLimitedResponse,
  securityHeaders,
} from '@/lib/security';
import { resolveTenantSlugFromRequest } from '@/lib/tenant';
import { sendMail, generatePasswordResetEmail, MailError } from '@/lib/mailer';
import { ZodError } from 'zod';

const PASSWORD_RESET_TTL_MIN = parseInt(process.env.PASSWORD_RESET_TTL_MIN || '60', 10);

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 * 
 * SECURITY:
 * - Always returns 200 with generic message (no email enumeration)
 * - Rate limited by IP + action
 * - Token stored hashed, expires after TTL
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Rate limit by IP
    if (!checkRateLimit('forgot-password', ip, 5, 60000)) {
      return rateLimitedResponse();
    }

    // Resolve tenant from request
    const tenantSlug = resolveTenantSlugFromRequest(request.headers);
    if (!tenantSlug) {
      // Generic response even if tenant not found
      return NextResponse.json(
        { message: 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions.' },
        { status: 200, headers: securityHeaders }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions.' },
        { status: 200, headers: securityHeaders }
      );
    }

    // Parse and validate input
    const body: unknown = await request.json();
    const { email } = forgotPasswordSchema.parse(body);
    const normalizedEmail = normalizeEmail(email);

    // Find user (silently, no error if not found)
    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: normalizedEmail,
      },
    });

    if (user) {
      // Generate token
      const rawToken = generateSecureToken(32);
      const tokenHash = sha256(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MIN * 60 * 1000);

      // Store hashed token
      await prisma.passwordResetToken.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Build reset URL
      const baseUrl = process.env.APP_BASE_URL || `https://app.${process.env.APP_BASE_DOMAIN || 'saasresto.localhost'}`;
      const resetUrl = `${baseUrl}/app/reset-password?token=${encodeURIComponent(rawToken)}`;

      // Send email (fire and forget in terms of response)
      try {
        const emailContent = generatePasswordResetEmail(resetUrl, PASSWORD_RESET_TTL_MIN);
        await sendMail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch (mailError) {
        // Log the error but still return success to avoid email enumeration
        if (mailError instanceof MailError) {
          console.error(`[forgot-password] Failed to send email to ${user.email}:`, mailError.message);
        } else {
          console.error('[forgot-password] Unexpected mail error:', mailError);
        }
      }
    }

    // Always return success (no email enumeration)
    return NextResponse.json(
      { message: 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions.' },
      { status: 200, headers: securityHeaders }
    );

  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400, headers: securityHeaders }
      );
    }

    console.error('[forgot-password] Error:', error);
    // Still return generic success to not leak information
    return NextResponse.json(
      { message: 'Si un compte existe avec cette adresse, vous recevrez un email avec les instructions.' },
      { status: 200, headers: securityHeaders }
    );
  }
}
