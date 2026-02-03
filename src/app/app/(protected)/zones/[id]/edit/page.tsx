import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EditZoneForm } from './edit-zone-form';

interface EditZonePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditZonePage({ params }: EditZonePageProps) {
  const { id } = await params;
  const auth = await requireAuth();

  const zone = await prisma.zone.findUnique({
    where: { id, tenantId: auth.tenant.id },
  });

  if (!zone) {
    notFound();
  }

  return <EditZoneForm zone={zone} />;
}
