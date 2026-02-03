import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { qrCodeCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// GET /api/app/qrcodes
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('zoneId');

    const qrCodes = await prisma.qrCode.findMany({
      where: {
        tenantId: auth.tenant.id,
        ...(zoneId && { zoneId }),
      },
      include: {
        zone: { select: { name: true } },
      },
      orderBy: [{ zoneId: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json({ qrCodes }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get QR codes error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/qrcodes
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const validatedData = qrCodeCreateSchema.parse({
      label: sanitizeInput(body.label || ''),
      zoneId: body.zoneId,
      tableNumber: body.tableNumber ? sanitizeInput(body.tableNumber) : null,
      isActive: body.isActive ?? true,
    });

    // Check zone belongs to tenant (if zoneId is provided)
    if (validatedData.zoneId) {
      const zone = await prisma.zone.findUnique({
        where: { id: validatedData.zoneId, tenantId: auth.tenant.id },
      });

      if (!zone) {
        return errorResponse('Zone non trouvée', 404);
      }
    }

    const qrCode = await prisma.qrCode.create({
      data: {
        ...validatedData,
        tenantId: auth.tenant.id,
      },
    });

    return NextResponse.json({ qrCode }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create QR code error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
