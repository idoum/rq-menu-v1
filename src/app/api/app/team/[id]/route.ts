import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { userUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, validatePassword, hashPassword, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/team/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireOwner();

    const user = await prisma.user.findUnique({
      where: { id, tenantId: auth.tenant.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse('Membre non trouvé', 404);
    }

    return NextResponse.json({ user }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get team member error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/team/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireOwner();
    const body = (await request.json()) as { name?: string; role?: string; password?: string };

    const existingUser = await prisma.user.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingUser) {
      return errorResponse('Membre non trouvé', 404);
    }

    // Can't change own role
    if (id === auth.user.id && body.role && body.role !== auth.user.role) {
      return errorResponse('Vous ne pouvez pas modifier votre propre rôle', 400);
    }

    const validatedData = userUpdateSchema.parse({
      name: body.name !== undefined ? (body.name ? sanitizeInput(body.name) : null) : undefined,
      role: body.role,
    });

    const updateData: Record<string, unknown> = {};

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.role !== undefined) {
      updateData.role = validatedData.role;
    }

    // Handle password separately (not in update schema)
    if (body.password) {
      const passwordValidation = validatePassword(body.password);
      if (!passwordValidation.valid) {
        return errorResponse(passwordValidation.message || 'Mot de passe invalide', 400);
      }
      updateData.passwordHash = await hashPassword(body.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update team member error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/team/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireOwner();

    // Can't delete yourself
    if (id === auth.user.id) {
      return errorResponse('Vous ne pouvez pas vous supprimer', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingUser) {
      return errorResponse('Membre non trouvé', 404);
    }

    // Delete user sessions first
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete team member error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
