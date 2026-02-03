import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { menuUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/menus/[id] - Get single menu
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const menu = await prisma.menu.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            _count: { select: { items: true } },
          },
        },
      },
    });

    if (!menu) {
      return errorResponse('Menu non trouvé', 404);
    }

    return NextResponse.json({ menu }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get menu error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/menus/[id] - Update menu
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    const body = await request.json();

    // Check menu exists and belongs to tenant
    const existingMenu = await prisma.menu.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingMenu) {
      return errorResponse('Menu non trouvé', 404);
    }

    const validatedData = menuUpdateSchema.parse({
      name: body.name !== undefined ? sanitizeInput(body.name) : undefined,
      description: body.description !== undefined 
        ? (body.description ? sanitizeInput(body.description) : null) 
        : undefined,
      isActive: body.isActive,
    });

    // Remove undefined values
    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([, v]) => v !== undefined)
    );

    const menu = await prisma.menu.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ menu }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update menu error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/menus/[id] - Delete menu
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    // Check menu exists and belongs to tenant
    const existingMenu = await prisma.menu.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingMenu) {
      return errorResponse('Menu non trouvé', 404);
    }

    // Delete menu (cascade deletes categories)
    await prisma.menu.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete menu error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
