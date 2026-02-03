import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categoryUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/categories/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const category = await prisma.category.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        menu: { select: { name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!category) {
      return errorResponse('Catégorie non trouvée', 404);
    }

    return NextResponse.json({ category }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get category error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/categories/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    const body = await request.json();

    const existingCategory = await prisma.category.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingCategory) {
      return errorResponse('Catégorie non trouvée', 404);
    }

    const validatedData = categoryUpdateSchema.parse({
      name: body.name !== undefined ? sanitizeInput(body.name) : undefined,
      description:
        body.description !== undefined
          ? body.description
            ? sanitizeInput(body.description)
            : null
          : undefined,
      menuId: body.menuId,
      sortOrder: body.sortOrder,
      isVisible: body.isVisible,
    });

    // If menuId is changing, verify it belongs to tenant
    if (validatedData.menuId && validatedData.menuId !== existingCategory.menuId) {
      const menu = await prisma.menu.findUnique({
        where: { id: validatedData.menuId, tenantId: auth.tenant.id },
      });

      if (!menu) {
        return errorResponse('Menu non trouvé', 404);
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, v]) => v !== undefined)
    );

    const category = await prisma.category.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ category }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update category error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/categories/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const existingCategory = await prisma.category.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingCategory) {
      return errorResponse('Catégorie non trouvée', 404);
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete category error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
