import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NewQrCodeForm } from './new-qrcode-form';

export default async function NewQrCodePage() {
  const auth = await requireAuth();

  const zones = await prisma.zone.findMany({
    where: { tenantId: auth.tenant.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return <NewQrCodeForm zones={zones} />;
}
