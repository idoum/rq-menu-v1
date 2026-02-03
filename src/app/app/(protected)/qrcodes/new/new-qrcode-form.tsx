'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';

interface NewQrCodeFormProps {
  zones: { id: string; name: string }[];
}

export function NewQrCodeForm({ zones }: NewQrCodeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      label: formData.get('label') as string,
      zoneId: selectedZoneId,
      tableNumber: (formData.get('tableNumber') as string) || null,
      isActive: formData.get('isActive') === 'on',
    };

    if (!data.zoneId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une zone',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/app/qrcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'QR code créé',
        description: 'Le QR code a été créé avec succès',
        variant: 'success',
      });

      router.push('/app/qrcodes');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/qrcodes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau QR code</h1>
          <p className="text-muted-foreground">
            Créez un QR code pour une table ou zone
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du QR code</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zoneId" required>
                Zone
              </Label>
              <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {zones.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune zone disponible.{' '}
                  <Link href="/app/zones/new" className="text-primary underline">
                    Créer une zone
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="label" required>
                Label
              </Label>
              <Input
                id="label"
                name="label"
                placeholder="Ex: Table 1, Terrasse - Table 5..."
                required
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Un nom descriptif pour identifier ce QR code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tableNumber">Numéro de table</Label>
              <Input
                id="tableNumber"
                name="tableNumber"
                placeholder="Ex: 1, 2, A1..."
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Optionnel - affiché aux clients sur le menu
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Actif</Label>
                <p className="text-sm text-muted-foreground">
                  Le QR code redirigera vers votre menu
                </p>
              </div>
              <Switch id="isActive" name="isActive" defaultChecked disabled={loading} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-2" />
                Créer le QR code
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/qrcodes">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
