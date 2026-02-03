import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { securityHeaders, errorResponse, isUnauthorizedError } from '@/lib/security';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const UPLOAD_URL_PREFIX = process.env.UPLOAD_URL_PREFIX || '/uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10); // 5MB
const ALLOWED_FILE_TYPES = (
  process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif'
).split(',');

// =============================================================================
// POST /api/app/uploads - Upload image file
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('Aucun fichier fourni', 400);
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return errorResponse(
        `Type de fichier non autorisé. Types acceptés: ${ALLOWED_FILE_TYPES.join(', ')}`,
        400
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / 1024 / 1024);
      return errorResponse(`Le fichier doit faire moins de ${maxSizeMB}MB`, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const extension = getExtensionFromMimeType(file.type);
    const filename = `${timestamp}-${randomId}.${extension}`;

    // Create tenant-specific directory
    const tenantDir = path.join(UPLOAD_DIR, auth.tenant.id);
    if (!existsSync(tenantDir)) {
      await mkdir(tenantDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(tenantDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, new Uint8Array(bytes));

    // Return public URL
    const publicUrl = `${UPLOAD_URL_PREFIX}/${auth.tenant.id}/${filename}`;

    return NextResponse.json(
      { url: publicUrl },
      { status: 201, headers: securityHeaders }
    );
  } catch (error: unknown) {
    if (isUnauthorizedError(error)) {
      return errorResponse('Non autorisé', 401);
    }
    console.error('Upload error:', error);
    return errorResponse('Une erreur est survenue lors du téléchargement', 500);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'bin';
}
