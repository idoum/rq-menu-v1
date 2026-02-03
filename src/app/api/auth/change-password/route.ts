import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hashPassword, verifyPassword } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { 
  checkRateLimit, 
  rateLimitedResponse,
  securityHeaders,
  errorResponse,
  isUnauthorizedError,
} from '@/lib/security';
import { strongPasswordSchema } from '@/lib/validations';
import { z } from 'zod';
import { ZodError } from 'zod';

const changePasswordApiSchema = z.object({
  currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
  newPassword: strongPasswordSchema,
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 * 
 * SECURITY:
 * - Requires authentication
 * - Verifies current password
 * - Rate limited
 * - Optionally revokes other sessions
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

  try {
    // Rate limit by IP
    if (!checkRateLimit('change-password', ip, 5, 60000)) {
      return rateLimitedResponse();
    }

    // Require authentication
    const auth = await requireAuth();

    // Parse and validate input
    const body: unknown = await request.json();
    const { currentPassword, newPassword } = changePasswordApiSchema.parse(body);

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
    });

    if (!user) {
      return errorResponse('Utilisateur non trouvé', 404);
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse('Le mot de passe actuel est incorrect', 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Get current session token to preserve it
    const currentSessionId = auth.session.id;

    // Update password and revoke other sessions
    await prisma.$transaction([
      // Update password
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // Revoke other sessions (not the current one)
      prisma.session.deleteMany({
        where: {
          userId: user.id,
          tenantId: auth.tenant.id,
          id: { not: currentSessionId },
        },
      }),
    ]);

    return NextResponse.json(
      { message: 'Votre mot de passe a été modifié avec succès.' },
      { status: 200, headers: securityHeaders }
    );

  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400, headers: securityHeaders }
      );
    }

    console.error('[change-password] Error:', error);
    return errorResponse('Une erreur est survenue. Veuillez réessayer.', 500);
  }
}
