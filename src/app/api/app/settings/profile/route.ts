import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { securityHeaders, errorResponse, sanitizeInput, validatePassword, hashPassword, isUnauthorizedError } from '@/lib/security';

// PATCH /api/app/settings/profile
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const updateData: Record<string, string | null> = {};

    if (body.name !== undefined) {
      updateData.name = body.name ? sanitizeInput(body.name) : null;
    }

    if (body.password) {
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return errorResponse(passwordValidation.message || 'Mot de passe invalide', 400);
      }
      updateData.passwordHash = await hashPassword(body.password);
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('Aucune donnée à mettre à jour', 400);
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({ user }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Update profile error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
