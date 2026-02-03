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

interface NewItemFormProps {
  categories: { id: string; name: string; menu: { name: string } }[];
}

export function NewItemForm({ categories }: NewItemFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      price: parseFloat(formData.get('price') as string),
      categoryId: selectedCategoryId,
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
      imageUrl: (formData.get('imageUrl') as string) || null,
      allergens: (formData.get('allergens') as string) || null,
      isAvailable: formData.get('isAvailable') === 'on',
      isVegetarian: formData.get('isVegetarian') === 'on',
      isVegan: formData.get('isVegan') === 'on',
      isGlutenFree: formData.get('isGlutenFree') === 'on',
    };

    if (!data.categoryId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une catégorie',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/app/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Article créé',
        description: 'L&apos;article a été créé avec succès',
        variant: 'success',
      });

      router.push('/app/items');
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
          <Link href="/app/items">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouvel article</h1>
          <p className="text-muted-foreground">
            Ajoutez un plat, boisson ou autre article à votre menu
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="categoryId" required>
                Catégorie
              </Label>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name} ({cat.menu.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Aucune catégorie disponible.{' '}
                  <Link href="/app/categories/new" className="text-primary underline">
                    Créer une catégorie
                  </Link>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" required>
                Nom de l'article
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ex: Pizza Margherita, Coca-Cola..."
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Description de l'article, ingrédients..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price" required>
                  Prix (€)
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="12.50"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Ordre</Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  min="0"
                  defaultValue="0"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL de l'image</Label>
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://..."
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergens">Allergènes</Label>
              <Input
                id="allergens"
                name="allergens"
                placeholder="Ex: Gluten, Lait, Œufs..."
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isAvailable">Disponible</Label>
                <p className="text-sm text-muted-foreground">
                  L'article peut être commandé
                </p>
              </div>
              <Switch id="isAvailable" name="isAvailable" defaultChecked disabled={loading} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isVegetarian">Végétarien</Label>
                <p className="text-sm text-muted-foreground">
                  Convient aux végétariens
                </p>
              </div>
              <Switch id="isVegetarian" name="isVegetarian" disabled={loading} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isVegan">Végan</Label>
                <p className="text-sm text-muted-foreground">
                  Convient aux végans
                </p>
              </div>
              <Switch id="isVegan" name="isVegan" disabled={loading} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isGlutenFree">Sans gluten</Label>
                <p className="text-sm text-muted-foreground">
                  Ne contient pas de gluten
                </p>
              </div>
              <Switch id="isGlutenFree" name="isGlutenFree" disabled={loading} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" loading={loading}>
            <Save className="h-4 w-4 mr-2" />
            Créer l'article
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/items">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
