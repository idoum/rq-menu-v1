'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/components/ui/use-toast';
import type { Menu } from '@prisma/client';

interface EditMenuFormProps {
  menu: Menu;
}

export function EditMenuForm({ menu }: EditMenuFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
      isActive: formData.get('isActive') === 'on',
    };

    try {
      const res = await fetch(`/api/app/menus/${menu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Menu modifié',
        description: 'Les modifications ont été enregistrées',
        variant: 'success',
      });

      router.push('/app/menus');
      router.refresh();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
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
          <Link href="/app/menus">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modifier le menu</h1>
          <p className="text-muted-foreground">
            Modifiez les informations du menu
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du menu</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" required>
                Nom du menu
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={menu.name}
                placeholder="Ex: Menu principal, Menu du jour..."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={menu.description || ''}
                placeholder="Description optionnelle du menu..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Activer le menu</Label>
                <p className="text-sm text-muted-foreground">
                  Le menu sera visible sur votre page publique
                </p>
              </div>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={menu.isActive}
                disabled={loading}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/menus">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
