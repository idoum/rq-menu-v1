import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, FolderOpen, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { CategoryActions } from './category-actions';

export default async function CategoriesPage() {
  const auth = await requireAuth();

  const categories = await prisma.category.findMany({
    where: { tenantId: auth.tenant.id },
    include: {
      menu: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ menuId: 'asc' }, { sortOrder: 'asc' }],
  });

  const menus = await prisma.menu.findMany({
    where: { tenantId: auth.tenant.id },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground">
            Organisez vos articles en catégories
          </p>
        </div>
        <Button asChild>
          <Link href="/app/categories/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle catégorie
          </Link>
        </Button>
      </div>

      {/* Content */}
      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="Aucune catégorie"
          description="Créez des catégories pour organiser vos articles de menu."
          action={{
            label: 'Créer une catégorie',
            href: '/app/categories/new',
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Menu</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-center">Ordre</TableHead>
                <TableHead className="text-center">Statut</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      {category.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{category.menu.name}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {category._count.items}
                  </TableCell>
                  <TableCell className="text-center">
                    {category.sortOrder}
                  </TableCell>
                  <TableCell className="text-center">
                    {category.isVisible ? (
                      <Badge variant="success">
                        <Eye className="h-3 w-3 mr-1" />
                        Visible
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Masqué
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <CategoryActions category={category} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
