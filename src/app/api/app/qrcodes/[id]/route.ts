import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { qrCodeUpdateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/app/qrcodes/[id]
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const qrCode = await prisma.qrCode.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        zone: { select: { name: true } },
      },
    });

    if (!qrCode) {
      return errorResponse('QR code non trouvé', 404);
    }

    return NextResponse.json({ qrCode }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get QR code error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// PATCH /api/app/qrcodes/[id]
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    const body = await request.json();

    const existingQrCode = await prisma.qrCode.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingQrCode) {
      return errorResponse('QR code non trouvé', 404);
    }

    const validatedData = qrCodeUpdateSchema.parse({
      label: body.label !== undefined ? sanitizeInput(body.label) : undefined,
      zoneId: body.zoneId,
      tableNumber:
        body.tableNumber !== undefined
          ? body.tableNumber
            ? sanitizeInput(body.tableNumber)
            : null
          : undefined,
      isActive: body.isActive,
    });

    // If zoneId is changing, verify it belongs to tenant
    if (validatedData.zoneId && validatedData.zoneId !== existingQrCode.zoneId) {
      const zone = await prisma.zone.findUnique({
        where: { id: validatedData.zoneId, tenantId: auth.tenant.id },
      });

      if (!zone) {
        return errorResponse('Zone non trouvée', 404);
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(validatedData).filter(([_, v]) => v !== undefined)
    );

    const qrCode = await prisma.qrCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ qrCode }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update QR code error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// DELETE /api/app/qrcodes/[id]
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();

    const existingQrCode = await prisma.qrCode.findUnique({
      where: { id, tenantId: auth.tenant.id },
    });

    if (!existingQrCode) {
      return errorResponse('QR code non trouvé', 404);
    }

    await prisma.qrCode.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Delete QR code error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
