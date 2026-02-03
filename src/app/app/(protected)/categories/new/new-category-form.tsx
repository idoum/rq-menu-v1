'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface NewCategoryFormProps {
  menus: { id: string; name: string }[];
}

export function NewCategoryForm({ menus }: NewCategoryFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      menuId: selectedMenuId,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      isVisible: formData.get('isVisible') === 'on',
    };

    if (!data.menuId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un menu',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/app/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Catégorie créée',
        description: 'La catégorie a été créée avec succès',
        variant: 'success',
      });

      router.push('/app/categories');
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
          <Link href="/app/categories">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvelle catégorie</h1>
          <p className="text-muted-foreground">
            Créez une catégorie pour regrouper vos articles
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la catégorie</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="menuId" required>
                Menu
              </Label>
              <Select value={selectedMenuId} onValueChange={setSelectedMenuId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un menu" />
                </SelectTrigger>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {menus.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucun menu disponible.{' '}
                  <Link href="/app/menus/new" className="text-primary underline">
                    Créer un menu
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" required>
                Nom de la catégorie
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Entrées, Plats, Desserts..."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Description optionnelle de la catégorie..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Ordre d'affichage</Label>
              <Input
                id="sortOrder"
                name="sortOrder"
                type="number"
                min="0"
                defaultValue="0"
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Les catégories sont triées par ordre croissant
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isVisible">Visible</Label>
                <p className="text-sm text-muted-foreground">
                  La catégorie sera visible sur le menu public
                </p>
              </div>
              <Switch id="isVisible" name="isVisible" defaultChecked disabled={loading} />
            </div>

            <div className="flex gap-4">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-2" />
                Créer la catégorie
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/categories">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
