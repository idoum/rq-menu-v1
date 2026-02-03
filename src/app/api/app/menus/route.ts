import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { menuCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// GET /api/app/menus - List all menus
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const menus = await prisma.menu.findMany({
      where: { tenantId: auth.tenant.id },
      include: {
        _count: {
          select: { categories: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ menus }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get menus error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/menus - Create a menu
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const validatedData = menuCreateSchema.parse({
      name: sanitizeInput(body.name || ''),
      description: body.description ? sanitizeInput(body.description) : null,
      isActive: body.isActive ?? true,
    });

    const menu = await prisma.menu.create({
      data: {
        ...validatedData,
        tenantId: auth.tenant.id,
      },
    });

    return NextResponse.json({ menu }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create menu error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
