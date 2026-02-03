import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NewCategoryForm } from './new-category-form';

export default async function NewCategoryPage() {
  const auth = await requireAuth();

  const menus = await prisma.menu.findMany({
    where: { tenantId: auth.tenant.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return <NewCategoryForm menus={menus} />;
}
