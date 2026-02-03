import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { securityHeaders, errorResponse } from '@/lib/security';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuth();

    if (!auth) {
      return errorResponse('Non authentifié', 401);
    }

    return NextResponse.json(
      {
        user: {
          id: auth.user.id,
          email: auth.user.email,
          name: auth.user.name,
          role: auth.user.role,
        },
        tenant: {
          id: auth.tenant.id,
          name: auth.tenant.name,
          slug: auth.tenant.slug,
        },
      },
      { status: 200, headers: securityHeaders }
    );
  } catch (error) {
    console.error('Auth check error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
