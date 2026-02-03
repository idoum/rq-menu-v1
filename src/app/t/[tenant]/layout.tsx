import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getTenantBySlug } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import type { Metadata } from 'next';

// =============================================================================
// TYPES & CONFIGURATION
// =============================================================================

interface TenantLayoutProps {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}

type FontFamily = 'system' | 'inter' | 'poppins' | 'playfair';

interface BrandingData {
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: FontFamily;
  tagline: string | null;
}

const FONT_CSS_MAP: Record<FontFamily, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  poppins: '"Poppins", system-ui, sans-serif',
  playfair: '"Playfair Display", Georgia, serif',
};

const DEFAULT_BRANDING: BrandingData = {
  logoUrl: null,
  heroImageUrl: null,
  primaryColor: '#111827',
  secondaryColor: '#6B7280',
  accentColor: '#2563EB',
  fontFamily: 'system',
  tagline: null,
};

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getTenantBranding(tenantId: string): Promise<BrandingData> {
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId },
  });

  if (!branding) {
    return DEFAULT_BRANDING;
  }

  return {
    logoUrl: branding.logoUrl,
    heroImageUrl: branding.heroImageUrl,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    accentColor: branding.accentColor,
    fontFamily: branding.fontFamily as FontFamily,
    tagline: branding.tagline,
  };
}

// =============================================================================
// METADATA
// =============================================================================

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata({ params }: TenantLayoutProps): Promise<Metadata> {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    return {
      title: 'Restaurant non trouvé',
    };
  }

  const branding = await getTenantBranding(tenant.id);

  return {
    title: `${tenant.name} - Menu`,
    description: branding.tagline || `Découvrez le menu de ${tenant.name}`,
    openGraph: {
      title: `${tenant.name} - Menu`,
      description: branding.tagline || `Découvrez le menu de ${tenant.name}`,
      type: 'website',
    },
  };
}

// =============================================================================
// LAYOUT COMPONENT
// =============================================================================

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  const branding = await getTenantBranding(tenant.id);
  const fontCss = FONT_CSS_MAP[branding.fontFamily] || FONT_CSS_MAP.system;

  // Type-safe CSS variables for branding
  const brandingStyle: React.CSSProperties & Record<`--brand-${string}`, string> = {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
    '--brand-font': fontCss,
  };

  return (
    <div
      className="min-h-screen bg-linear-to-b from-background to-muted/20"
      style={{ ...brandingStyle, fontFamily: fontCss }}
    >
      {/* Hero banner (if configured) */}
      {branding.heroImageUrl && (
        <div className="relative h-32 sm:h-40 w-full overflow-hidden">
          <Image
            src={branding.heroImageUrl}
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        </div>
      )}

      {/* Premium public header */}
      <header
        className={`${branding.heroImageUrl ? '-mt-12 relative z-10' : 'sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'}`}
      >
        <div className="container mx-auto px-4 h-14 flex items-center justify-center max-w-2xl">
          <div className="flex items-center gap-3">
            {branding.logoUrl ? (
              <div
                className={`relative h-12 w-12 rounded-xl overflow-hidden shadow-lg ${branding.heroImageUrl ? 'border-2 border-background' : ''}`}
              >
                <Image
                  src={branding.logoUrl}
                  alt={tenant.name}
                  fill
                  sizes="48px"
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${branding.heroImageUrl ? 'border-2 border-background' : ''}`}
                style={{ backgroundColor: branding.primaryColor }}
                aria-hidden="true"
              >
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1
                className="font-bold text-lg tracking-tight"
                style={{ color: branding.heroImageUrl ? '#fff' : branding.primaryColor }}
              >
                {tenant.name}
              </h1>
              {branding.tagline && (
                <p
                  className="text-sm"
                  style={{ color: branding.heroImageUrl ? 'rgba(255,255,255,0.9)' : branding.secondaryColor }}
                >
                  {branding.tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t py-6 mt-8">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <p className="text-xs text-muted-foreground">
            Menu propulsé par{' '}
            <a 
              href="https://rq-menu.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium hover:text-foreground transition-colors"
            >
              RQ Menu
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
