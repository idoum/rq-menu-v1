import { NextRequest, NextResponse } from 'next/server';
import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { userCreateSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput, validatePassword, hashPassword, isUnauthorizedError } from '@/lib/security';
import { ZodError } from 'zod';

// GET /api/app/team
export async function GET(request: NextRequest) {
  try {
    const auth = await requireOwner();

    const users = await prisma.user.findMany({
      where: { tenantId: auth.tenant.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ users }, { status: 200, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Get team error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}

// POST /api/app/team
export async function POST(request: NextRequest) {
  try {
    const auth = await requireOwner();
    const body = await request.json();

    const validatedData = userCreateSchema.parse({
      email: sanitizeInput(body.email || '').toLowerCase(),
      name: body.name ? sanitizeInput(body.name) : null,
      password: body.password || '',
      role: body.role || 'STAFF',
    });

    // Validate password strength
    const passwordValidation = validatePassword(validatedData.password);
    if (!passwordValidation.valid) {
      return errorResponse(passwordValidation.message || 'Mot de passe invalide', 400);
    }

    // Check if email already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: { email: validatedData.email, tenantId: auth.tenant.id },
    });

    if (existingUser) {
      return errorResponse('Cet email est déjà utilisé', 400);
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        passwordHash,
        role: validatedData.role as 'OWNER' | 'STAFF',
        tenantId: auth.tenant.id,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user }, { status: 201, headers: securityHeaders });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }
    console.error('Create team member error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
