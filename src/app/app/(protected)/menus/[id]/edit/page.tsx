import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EditMenuForm } from './edit-menu-form';

interface EditMenuPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMenuPage({ params }: EditMenuPageProps) {
  const { id } = await params;
  const auth = await requireAuth();

  const menu = await prisma.menu.findUnique({
    where: { id, tenantId: auth.tenant.id },
  });

  if (!menu) {
    notFound();
  }

  return <EditMenuForm menu={menu} />;
}
