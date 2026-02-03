import { NextRequest, NextResponse } from 'next/server';
import { login, setSessionCookie } from '@/lib/auth';
import { resolveTenantSlugFromRequest } from '@/lib/tenant';
import { loginSchema } from '@/lib/validations';
import { securityHeaders, errorResponse, sanitizeInput } from '@/lib/security';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get tenant slug from hostname
    const tenantSlug = resolveTenantSlugFromRequest(request.headers);

    if (!tenantSlug) {
      return errorResponse('Tenant non trouvé', 404);
    }

    // Validate input
    const validatedData = loginSchema.parse({
      email: sanitizeInput(body.email || ''),
      password: body.password || '',
    });

    // Attempt login
    const result = await login({
      email: validatedData.email,
      password: validatedData.password,
      tenantSlug,
    });

    if (!result.success) {
      return errorResponse(result.error || 'Identifiants invalides', 401);
    }

    // Set session cookie (using the lib function)
    if (result.token) {
      await setSessionCookie(result.token);
    }

    // Create response
    const response = NextResponse.json(
      {
        success: true,
      },
      { status: 200, headers: securityHeaders }
    );

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.issues[0];
      return errorResponse(firstError.message, 400);
    }

    console.error('Login error:', error);
    return errorResponse('Une erreur est survenue', 500);
  }
}
