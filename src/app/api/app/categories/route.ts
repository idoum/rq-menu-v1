import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { categoryCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// GET /api/app/categories - List all categories
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const { searchParams } = new URL(request.url);
    const menuId = searchParams.get('menuId');

    const categories = await prisma.category.findMany({
      where: {
        tenantId: auth.tenant.id,
        ...(menuId && { menuId }),
      },
      include: {
        menu: { select: { name: true } },
        _count: { select: { items: true } },
      },
      orderBy: [{ menuId: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json({ categories }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get categories error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/categories - Create a category
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const validatedData = categoryCreateSchema.parse({
      name: sanitizeInput(body.name || ''),
      description: body.description ? sanitizeInput(body.description) : null,
      menuId: body.menuId,
      sortOrder: body.sortOrder ?? 0,
      isVisible: body.isVisible ?? true,
    });

    // Check menu belongs to tenant
    const menu = await prisma.menu.findUnique({
      where: { id: validatedData.menuId, tenantId: auth.tenant.id },
    });

    if (!menu) {
      return errorResponse('Menu non trouvé', 404);
    }

    const category = await prisma.category.create({
      data: {
        ...validatedData,
        tenantId: auth.tenant.id,
      },
    });

    return NextResponse.json({ category }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create category error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
