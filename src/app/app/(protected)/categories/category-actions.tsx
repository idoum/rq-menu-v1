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
import type { Category } from '@prisma/client';

interface CategoryActionsProps {
  category: Category;
}

export function CategoryActions({ category }: CategoryActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleVisibility = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !category.isVisible }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: category.isVisible ? 'Catégorie masquée' : 'Catégorie visible',
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
      const res = await fetch(`/api/app/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error();

      toast({
        title: 'Catégorie supprimée',
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
            <a href={`/app/categories/${category.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleVisibility} disabled={loading}>
            {category.isVisible ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Masquer
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Afficher
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
            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La catégorie "{category.name}" et tous ses articles
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
