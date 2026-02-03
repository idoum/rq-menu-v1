import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { registerSchema, RESERVED_SLUGS } from '@/lib/validations';
import { checkRateLimit, rateLimitedResponse } from '@/lib/security';

/**
 * POST /api/auth/register
 * Register a new restaurant (tenant + owner user)
 */
export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    
    if (!checkRateLimit('register', ip, 5, 60000)) {
      return rateLimitedResponse();
    }

    // Parse and validate input
    const body = await request.json();
    const result = registerSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.flatten();
      return NextResponse.json(
        { error: 'Données invalides', details: errors.fieldErrors },
        { status: 400 }
      );
    }

    const { restaurantName, slug, email, password } = result.data;

    // Double-check reserved slugs
    if (RESERVED_SLUGS.includes(slug.toLowerCase())) {
      return NextResponse.json(
        { error: 'Ce nom de domaine est réservé' },
        { status: 409 }
      );
    }

    // Check slug availability
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: slug.toLowerCase() },
      select: { id: true },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: 'Ce nom de domaine est déjà utilisé' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create tenant + owner + session in a transaction
    const { tenant, user } = await prisma.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name: restaurantName,
          slug: slug.toLowerCase(),
        },
      });

      // Create owner user
      const newUser = await tx.user.create({
        data: {
          tenantId: newTenant.id,
          email: email.toLowerCase(),
          passwordHash,
          role: 'OWNER',
          name: restaurantName, // Default name to restaurant name
        },
      });

      return { tenant: newTenant, user: newUser };
    });

    // Create session
    const userAgent = headersList.get('user-agent') || undefined;
    const token = await createSession(user, tenant, { userAgent, ipAddress: ip });
    
    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json(
      { 
        success: true,
        message: 'Restaurant créé avec succès',
        tenantSlug: tenant.slug,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    
    // Generic error to prevent information leakage
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création du compte' },
      { status: 500 }
    );
  }
}
