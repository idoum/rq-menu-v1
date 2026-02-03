import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getTenantBySlug } from '@/lib/tenant';
import { prisma } from '@/lib/db';
import {
  MenuClient,
  MenuSkeleton,
  MenuEmptyState,
  type CategoryData,
} from '@/components/public/MenuClient';

interface TenantPageProps {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ zone?: string; table?: string }>;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getMenuData(tenantId: string): Promise<CategoryData[] | null> {
  // Fetch active menu with categories and items
  const menu = await prisma.menu.findFirst({
    where: {
      tenantId,
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
    include: {
      categories: {
        where: { isVisible: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              imageUrl: true,
              isAvailable: true,
              isVegetarian: true,
              isVegan: true,
              isGlutenFree: true,
            },
          },
        },
      },
    },
  });

  if (!menu) return null;

  // Transform data for client component
  return menu.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    items: cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: Number(item.price),
      imageUrl: item.imageUrl,
      isAvailable: item.isAvailable,
      isVegetarian: item.isVegetarian,
      isVegan: item.isVegan,
      isGlutenFree: item.isGlutenFree,
    })),
  }));
}

// =============================================================================
// MENU CONTENT (SERVER COMPONENT)
// =============================================================================

async function MenuContent({ tenantSlug, zone }: { tenantSlug: string; zone?: string }) {
  const tenant = await getTenantBySlug(tenantSlug);

  if (!tenant) {
    notFound();
  }

  const categories = await getMenuData(tenant.id);

  // No menu created yet
  if (!categories) {
    return (
      <MenuEmptyState
        title="Menu en préparation"
        description="Notre carte sera bientôt disponible. Revenez nous voir très bientôt !"
      />
    );
  }

  // Menu exists but no visible categories with items
  const hasItems = categories.some((cat) => cat.items.length > 0);
  if (!hasItems) {
    return (
      <MenuEmptyState
        title="Menu vide"
        description="Aucun plat n&apos;a encore été ajouté au menu. Revenez bientôt !"
      />
    );
  }

  return (
    <>
      {/* Zone indicator (from QR code) */}
      {zone && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            📍 <span className="font-medium text-foreground">{zone}</span>
          </p>
        </div>
      )}

      {/* Interactive menu (client component) */}
      <MenuClient categories={categories} currency="CAD" />
    </>
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function TenantMenuPage({ params, searchParams }: TenantPageProps) {
  const { tenant: tenantSlug } = await params;
  const { zone } = await searchParams;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Suspense fallback={<MenuSkeleton />}>
        <MenuContent tenantSlug={tenantSlug} zone={zone} />
      </Suspense>
    </div>
  );
}
