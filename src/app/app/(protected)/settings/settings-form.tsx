'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { User } from '@prisma/client';

interface SettingsFormProps {
  user: Pick<User, 'id' | 'email' | 'name'>;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: { name: string | null; password?: string } = {
      name: (formData.get('name') as string) || null,
    };

    const newPassword = formData.get('newPassword') as string;
    if (newPassword) {
      data.password = newPassword;
    }

    try {
      const res = await fetch('/api/app/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées',
        variant: 'success',
      });

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user.email}
          disabled
          className="bg-muted"
        />
        <p className="text-sm text-muted-foreground">
          L'email ne peut pas être modifié
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name || ''}
          placeholder="Votre nom"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          placeholder="••••••••"
          disabled={loading}
        />
        <p className="text-sm text-muted-foreground">
          Laissez vide pour ne pas changer le mot de passe
        </p>
      </div>

      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4 mr-2" />
        Enregistrer
      </Button>
    </form>
  );
}
