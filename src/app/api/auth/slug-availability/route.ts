import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RESERVED_SLUGS } from '@/lib/validations';

/**
 * GET /api/auth/slug-availability?slug=...
 * Check if a tenant slug is available for registration
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim();

    // No slug provided
    if (!slug) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Check format: 3-30 chars, lowercase alphanumeric and hyphens, no start/end hyphen
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (slug.length < 3 || slug.length > 30 || !slugRegex.test(slug)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Check reserved slugs
    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ available: false }, { status: 200 });
    }

    // Check database
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true },
    });

    return NextResponse.json(
      { available: !existingTenant },
      { status: 200 }
    );
  } catch {
    // On error, assume not available (safe default)
    return NextResponse.json({ available: false }, { status: 200 });
  }
}
