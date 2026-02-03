import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { itemUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/items/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const item = await prisma.item.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        category: { 
          select: { 
            name: true,
            menu: { select: { name: true } },
          },
        },
      },
    });

    if (!item) {
      return errorResponse('Article non trouvé', 404);
    }

    return NextResponse.json({ item }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get item error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/items/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    const body = await request.json();

    const existingItem = await prisma.item.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingItem) {
      return errorResponse('Article non trouvé', 404);
    }

    const validatedData = itemUpdateSchema.parse({
      name: body.name !== undefined ? sanitizeInput(body.name) : undefined,
      description:
        body.description !== undefined
          ? body.description
            ? sanitizeInput(body.description)
            : null
          : undefined,
      price: body.price,
      categoryId: body.categoryId,
      sortOrder: body.sortOrder,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl || null : undefined,
      allergens:
        body.allergens !== undefined
          ? body.allergens
            ? sanitizeInput(body.allergens)
            : null
          : undefined,
      isAvailable: body.isAvailable,
      isVegetarian: body.isVegetarian,
      isVegan: body.isVegan,
      isGlutenFree: body.isGlutenFree,
    });

    // If categoryId is changing, verify it belongs to tenant
    if (validatedData.categoryId && validatedData.categoryId !== existingItem.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId, tenantId: auth.tenant.id },
      });

      if (!category) {
        return errorResponse('Catégorie non trouvée', 404);
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, v]) => v !== undefined)
    );

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ item }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update item error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/items/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const existingItem = await prisma.item.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingItem) {
      return errorResponse('Article non trouvé', 404);
    }

    await prisma.item.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete item error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
