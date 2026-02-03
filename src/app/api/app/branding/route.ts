import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateBrandingSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// =============================================================================
// GET /api/app/branding - Get current tenant branding
// =============================================================================

export async function GET() {
  try {
    const auth = await requireOwner();

    // Get or create branding for this tenant
    let branding = await prisma.tenantBranding.findUnique({
      where: { tenantId: auth.tenant.id },
    });

    // Create default branding if none exists
    if (!branding) {
      branding = await prisma.tenantBranding.create({
        data: {
          tenantId: auth.tenant.id,
        },
      });
    }

    return NextResponse.json(
      {
        branding: {
          id: branding.id,
          logoUrl: branding.logoUrl,
          heroImageUrl: branding.heroImageUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
          fontFamily: branding.fontFamily,
          tagline: branding.tagline,
        },
        tenant: {
          id: auth.tenant.id,
          name: auth.tenant.name,
          slug: auth.tenant.slug,
        },
      },
      { status: 200, headers: securityHeaders }
    );
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get branding error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// =============================================================================
// PUT /api/app/branding - Update tenant branding
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireOwner();
    const body = await request.json();

    const validatedData = updateBrandingSchema.parse(body);

    // Upsert branding
    const branding = await prisma.tenantBranding.upsert({
      where: { tenantId: auth.tenant.id },
      create: {
        tenantId: auth.tenant.id,
        ...validatedData,
      },
      update: validatedData,
    });

    return NextResponse.json(
      {
        branding: {
          id: branding.id,
          logoUrl: branding.logoUrl,
          heroImageUrl: branding.heroImageUrl,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
          fontFamily: branding.fontFamily,
          tagline: branding.tagline,
        },
      },
      { status: 200, headers: securityHeaders }
    );
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Update branding error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
