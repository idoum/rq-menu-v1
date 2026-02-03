import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getQrCodeUrl } from '@/lib/urls';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, QrCode, ExternalLink, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { QrCodeActions } from './qrcode-actions';

export default async function QrCodesPage() {
  const auth = await requireAuth();

  const qrCodes = await prisma.qrCode.findMany({
    where: { tenantId: auth.tenant.id },
    include: {
      zone: { select: { name: true, slug: true } },
    },
    orderBy: [{ zoneId: 'asc' }, { label: 'asc' }],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">QR Codes</h1>
          <p className="text-muted-foreground">
            Générez et gérez vos QR codes pour les tables et zones
          </p>
        </div>
        <Button asChild>
          <Link href="/app/qrcodes/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau QR code
          </Link>
        </Button>
      </div>

      {/* Content */}
      {qrCodes.length === 0 ? (
        <EmptyState
          icon={<QrCode className="h-12 w-12" />}
          title="Aucun QR code"
          description="Générez des QR codes pour permettre à vos clients d'accéder au menu depuis leur table."
          action={{
            label: 'Créer un QR code',
            href: '/app/qrcodes/new',
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead>Lien</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrCodes.map((qr) => {
                const zoneSlug = qr.zone?.slug;
                const url = getQrCodeUrl(auth.tenant.slug, {
                  zone: zoneSlug,
                  table: qr.tableNumber || undefined,
                });
                return (
                  <TableRow key={qr.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{qr.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{qr.zone?.name || 'Aucune zone'}</Badge>
                    </TableCell>
                    <TableCell>
                      {qr.tableNumber || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      {qr.isActive ? (
                        <Badge variant="success">
                          <Eye className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Ouvrir
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <QrCodeActions qrCode={qr} tenantSlug={auth.tenant.slug} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
