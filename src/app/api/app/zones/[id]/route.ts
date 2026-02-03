import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { zoneUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/zones/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const zone = await prisma.zone.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        qrCodes: { orderBy: { label: 'asc' } },
      },
    });

    if (!zone) {
      return errorResponse('Zone non trouvée', 404);
    }

    return NextResponse.json({ zone }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get zone error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/zones/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    const body = await request.json();

    const existingZone = await prisma.zone.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingZone) {
      return errorResponse('Zone non trouvée', 404);
    }

    const validatedData = zoneUpdateSchema.parse({
      name: body.name !== undefined ? sanitizeInput(body.name) : undefined,
      description:
        body.description !== undefined
          ? body.description
            ? sanitizeInput(body.description)
            : null
          : undefined,
    });

    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, v]) => v !== undefined)
    );

    const zone = await prisma.zone.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ zone }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update zone error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/zones/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const existingZone = await prisma.zone.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingZone) {
      return errorResponse('Zone non trouvée', 404);
    }

    await prisma.zone.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete zone error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
