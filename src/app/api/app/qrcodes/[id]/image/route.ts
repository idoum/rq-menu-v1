import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getQrCodeUrl } from '@/lib/urls';
import { isUnauthorizedError } from '@/lib/security';
import QRCode from 'qrcode';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/app/qrcodes/[id]/image
 * 
 * Returns a QR code image in PNG or SVG format
 * Query params:
 * - format: 'png' (default) or 'svg'
 * - size: number (default 400)
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireAuth();
    
    const { searchParams } = request.nextUrl;
    const format = searchParams.get('format') || 'png';
    const size = Math.min(Math.max(parseInt(searchParams.get('size') || '400', 10), 100), 1000);

    // Validate format
    if (format !== 'png' && format !== 'svg') {
      return new NextResponse('Format invalide. Utilisez "png" ou "svg".', { status: 400 });
    }

    // Get QR code from database
    const qrCode = await prisma.qrCode.findUnique({
      where: { id, tenantId: auth.tenant.id },
      include: {
        zone: { select: { slug: true } },
      },
    });

    if (!qrCode) {
      return new NextResponse('QR code non trouvé', { status: 404 });
    }

    // Build the URL for the QR code
    const url = getQrCodeUrl(auth.tenant.slug, {
      zone: qrCode.zone?.slug,
      table: qrCode.tableNumber || undefined,
    });

    // Generate QR code
    if (format === 'svg') {
      const svg = await QRCode.toString(url, {
        type: 'svg',
        width: size,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="qr-${qrCode.label.replace(/[^a-z0-9]/gi, '-')}.svg"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // PNG format
    const pngBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const pngUint8Array = new Uint8Array(pngBuffer);

    return new NextResponse(pngUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="qr-${qrCode.label.replace(/[^a-z0-9]/gi, '-')}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return new NextResponse('Non autorisé', { status: 401 });
    }
    console.error('QR code image error:', error);
    return new NextResponse('Une erreur est survenue', { status: 500 });
  }
}
