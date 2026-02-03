import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { itemCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// GET /api/app/items - List all items
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    const items = await prisma.item.findMany({
      where: {
        tenantId: auth.tenant.id,
        ...(categoryId && { categoryId }),
      },
      include: {
        category: { 
          select: { 
            name: true,
            menu: { select: { name: true } },
          },
        },
      },
      orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
    });

    return NextResponse.json({ items }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get items error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/items - Create an item
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const validatedData = itemCreateSchema.parse({
      name: sanitizeInput(body.name || ''),
      description: body.description ? sanitizeInput(body.description) : null,
      price: body.price,
      categoryId: body.categoryId,
      sortOrder: body.sortOrder ?? 0,
      imageUrl: body.imageUrl || null,
      allergens: body.allergens ? sanitizeInput(body.allergens) : null,
      isAvailable: body.isAvailable ?? true,
      isVegetarian: body.isVegetarian ?? false,
      isVegan: body.isVegan ?? false,
      isGlutenFree: body.isGlutenFree ?? false,
    });

    // Check category belongs to tenant
    const category = await prisma.category.findUnique({
      where: { id: validatedData.categoryId, tenantId: auth.tenant.id },
    });

    if (!category) {
      return errorResponse('Catégorie non trouvée', 404);
    }

    const item = await prisma.item.create({
      data: {
        ...validatedData,
        tenantId: auth.tenant.id,
      },
    });

    return NextResponse.json({ item }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create item error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
