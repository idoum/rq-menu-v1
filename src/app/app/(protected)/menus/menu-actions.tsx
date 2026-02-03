'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { Menu } from '@prisma/client';

interface MenuActionsProps {
  menu: Menu;
}

export function MenuActions({ menu }: MenuActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/menus/${menu.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !menu.isActive }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: menu.isActive ? 'Menu désactivé' : 'Menu activé',
        variant: 'success',
      });
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
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/menus/${menu.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error();

      toast({
        title: 'Menu supprimé',
        variant: 'success',
      });
      setDeleteDialogOpen(false);
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
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <a href={`/app/menus/${menu.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive} disabled={loading}>
            {menu.isActive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Désactiver
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Activer
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le menu ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le menu "{menu.name}" et toutes ses catégories
              seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
