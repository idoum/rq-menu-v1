import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EditItemForm } from './edit-item-form';

interface EditItemPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditItemPage({ params }: EditItemPageProps) {
  const { id } = await params;
  const auth = await requireAuth();

  const [item, categories] = await Promise.all([
    prisma.item.findUnique({
      where: { id, tenantId: auth.tenant.id },
    }),
    prisma.category.findMany({
      where: { tenantId: auth.tenant.id },
      select: { 
        id: true, 
        name: true,
        menu: { select: { name: true } },
      },
      orderBy: [{ menuId: 'asc' }, { sortOrder: 'asc' }],
    }),
  ]);

  if (!item) {
    notFound();
  }

  return <EditItemForm item={item} categories={categories} />;
}
