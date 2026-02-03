import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NewItemForm } from './new-item-form';

export default async function NewItemPage() {
  const auth = await requireAuth();

  const categories = await prisma.category.findMany({
    where: { tenantId: auth.tenant.id },
    select: { 
      id: true, 
      name: true,
      menu: { select: { name: true } },
    },
    orderBy: [{ menuId: 'asc' }, { sortOrder: 'asc' }],
  });

  return <NewItemForm categories={categories} />;
}
