import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations';
import { hashPassword } from '@/lib/auth';
import { 
  sha256, 
  checkRateLimit, 
  rateLimitedResponse,
  securityHeaders,
  errorResponse,
} from '@/lib/security';
import { ZodError } from 'zod';

/**
 * POST /api/auth/reset-password
 * Complete password reset with token
 * 
 * SECURITY:
 * - Token is hashed before lookup
 * - Token is single-use (marked as used)
 * - All user sessions are revoked after reset
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Rate limit by IP
    if (!checkRateLimit('reset-password', ip, 10, 60000)) {
      return rateLimitedResponse();
    }

    // Parse and validate input
    const body: unknown = await request.json();
    const { token, newPassword } = resetPasswordSchema.parse(body);

    // Hash the token to look up
    const tokenHash = sha256(token);

    // Find valid token (not used, not expired)
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
        tenant: true,
      },
    });

    if (!resetToken) {
      return errorResponse('Lien invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.', 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user password and mark token as used in a transaction
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Mark token as used
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions for this user (security best practice)
      prisma.session.deleteMany({
        where: {
          userId: resetToken.userId,
          tenantId: resetToken.tenantId,
        },
      }),
    ]);

    return NextResponse.json(
      { message: 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.' },
      { status: 200, headers: securityHeaders }
    );

  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400, headers: securityHeaders }
      );
    }

    console.error('[reset-password] Error:', error);
    return errorResponse('Une erreur est survenue. Veuillez réessayer.', 500);
  }
}
