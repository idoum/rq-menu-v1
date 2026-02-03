import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { BrandingForm } from './branding-form';
import type { TenantBranding } from '@prisma/client';

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getBranding(tenantId: string): Promise<TenantBranding> {
  let branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
  });

  // Create default branding if none exists
  if (!branding) {
    branding = await prisma.tenantBranding.create({
      data: { tenantId },
    });
  }

  return branding;
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function BrandingPage() {
  const auth = await requireOwner();
  const branding = await getBranding(auth.tenant.id);

  // Serialize data for client component (no functions, only plain objects)
  const brandingData = {
    id: branding.id,
    logoUrl: branding.logoUrl,
    heroImageUrl: branding.heroImageUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    fontFamily: branding.fontFamily as 'system' | 'inter' | 'poppins' | 'playfair',
    tagline: branding.tagline,
  };

  const tenantData = {
    id: auth.tenant.id,
    name: auth.tenant.name,
    slug: auth.tenant.slug,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Design & Branding</h1>
        <p className="text-muted-foreground">
          Personnalisez l&apos;apparence de votre menu public avec votre identité visuelle
        </p>
      </div>

      {/* Form with live preview */}
      <BrandingForm branding={brandingData} tenant={tenantData} />
    </div>
  );
}
