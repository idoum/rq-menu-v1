import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, MapPin, QrCode } from 'lucide-react';
import Link from 'next/link';
import { ZoneActions } from './zone-actions';

export default async function ZonesPage() {
  const auth = await requireAuth();

  const zones = await prisma.zone.findMany({
    where: { tenantId: auth.tenant.id },
    include: {
      _count: { select: { qrCodes: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Zones</h1>
          <p className="text-muted-foreground">
            Organisez votre établissement en zones (salle, terrasse, bar...)
          </p>
        </div>
        <Button asChild>
          <Link href="/app/zones/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle zone
          </Link>
        </Button>
      </div>

      {/* Content */}
      {zones.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-12 w-12" />}
          title="Aucune zone"
          description="Créez des zones pour organiser votre établissement et générer des QR codes par zone."
          action={{
            label: 'Créer une zone',
            href: '/app/zones/new',
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((zone) => (
            <Card key={zone.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {zone.name}
                    </CardTitle>
                    {zone.description && (
                      <CardDescription>{zone.description}</CardDescription>
                    )}
                  </div>
                  <ZoneActions zone={zone} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {zone._count.qrCodes} QR code{zone._count.qrCodes !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
