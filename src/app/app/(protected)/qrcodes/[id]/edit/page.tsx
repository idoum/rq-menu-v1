import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { EditQrCodeForm } from './edit-qrcode-form';

interface EditQrCodePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditQrCodePage({ params }: EditQrCodePageProps) {
  const { id } = await params;
  const auth = await requireAuth();

  const [qrCode, zones] = await Promise.all([
    prisma.qrCode.findUnique({
      where: { id, tenantId: auth.tenant.id },
    }),
    prisma.zone.findMany({
      where: { tenantId: auth.tenant.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!qrCode) {
    notFound();
  }

  return <EditQrCodeForm qrCode={qrCode} zones={zones} />;
}
