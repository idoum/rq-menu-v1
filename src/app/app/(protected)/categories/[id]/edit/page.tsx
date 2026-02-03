import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EditCategoryForm } from './edit-category-form';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const auth = await requireAuth();

  const [category, menus] = await Promise.all([
    prisma.category.findUnique({
      where: { id, tenantId: auth.tenant.id },
    }),
    prisma.menu.findMany({
      where: { tenantId: auth.tenant.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!category) {
    notFound();
  }

  return <EditCategoryForm category={category} menus={menus} />;
}
