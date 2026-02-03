import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { zoneCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

/**
 * Generate a slug from a name
 * - Lowercase
 * - Replace spaces and special chars with hyphens
 * - Remove consecutive hyphens
 * - Trim hyphens from start/end
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .replace(/^-|-$/g, '') // Trim hyphens
    .slice(0, 30); // Max 30 chars
}

// GET /api/app/zones
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const zones = await prisma.zone.findMany({
      where: { tenantId: auth.tenant.id },
      include: {
        _count: { select: { qrCodes: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ zones }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get zones error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/zones
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await request.json();

    const validatedData = zoneCreateSchema.parse({
      name: sanitizeInput(body.name || ''),
      slug: body.slug ? sanitizeInput(body.slug) : undefined,
      description: body.description ? sanitizeInput(body.description) : null,
    });

    // Generate slug from name if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check for uniqueness within tenant
    const existingZone = await prisma.zone.findUnique({
      where: {
        tenantId_slug: {
          tenantId: auth.tenant.id,
          slug,
        },
      },
    });

    if (existingZone) {
      return errorResponse('Une zone avec ce slug existe déjà', 400);
    }

    const zone = await prisma.zone.create({
      data: {
        name: validatedData.name,
        slug,
        description: validatedData.description,
        tenantId: auth.tenant.id,
      },
    });

    return NextResponse.json({ zone }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create zone error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
