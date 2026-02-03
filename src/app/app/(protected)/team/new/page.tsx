'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function NewTeamMemberPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>('STAFF');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get('email') as string,
      name: (formData.get('name') as string) || null,
      password: formData.get('password') as string,
      role,
    };

    try {
      const res = await fetch('/api/app/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Membre ajouté',
        description: 'Le membre a été ajouté avec succès',
        variant: 'success',
      });

      router.push('/app/team');
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
          <Link href="/app/team">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inviter un membre</h1>
          <p className="text-muted-foreground">
            Ajoutez un nouveau membre à votre équipe
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du membre</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="membre@exemple.com"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                name="name"
                placeholder="Jean Dupont"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" required>
                Mot de passe
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                Minimum 8 caractères, avec majuscule, minuscule et chiffre
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" required>
                Rôle
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Staff</SelectItem>
                  <SelectItem value="OWNER">Propriétaire</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Les propriétaires peuvent gérer l'équipe et les paramètres
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" loading={loading}>
                <Save className="h-4 w-4 mr-2" />
                Ajouter le membre
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/team">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
