'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

interface EditTeamMemberFormProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  isSelf: boolean;
}

export function EditTeamMemberForm({ user, isSelf }: EditTeamMemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(user.role);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: { name: string | null; role: string; password?: string } = {
      name: (formData.get('name') as string) || null,
      role,
    };

    const newPassword = formData.get('newPassword') as string;
    if (newPassword) {
      data.password = newPassword;
    }

    try {
      const res = await fetch(`/api/app/team/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Membre mis à jour',
        description: 'Les informations ont été enregistrées',
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
          L&apos;email ne peut pas être modifié
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nom</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user.name || ''}
          placeholder="Nom du membre"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rôle</Label>
        {isSelf ? (
          <>
            <Select value={role} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Propriétaire</SelectItem>
                <SelectItem value="STAFF">Personnel</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Vous ne pouvez pas modifier votre propre rôle
            </p>
          </>
        ) : (
          <Select value={role} onValueChange={setRole} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OWNER">Propriétaire</SelectItem>
              <SelectItem value="STAFF">Personnel</SelectItem>
            </SelectContent>
          </Select>
        )}
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
          Laissez vide pour ne pas changer le mot de passe.
          {!isSelf && ' Minimum 8 caractères avec majuscule, minuscule et chiffre.'}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={loading}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
        <Link href="/app/team">
          <Button type="button" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
      </div>
    </form>
  );
}
