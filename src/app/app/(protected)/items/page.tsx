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
import { Plus, Tags, Check, X, Leaf, Wheat } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { ItemActions } from './item-actions';

export default async function ItemsPage() {
  const auth = await requireAuth();

  const items = await prisma.item.findMany({
    where: { tenantId: auth.tenant.id },
    include: {
      category: { 
        select: { 
          name: true,
          menu: { select: { name: true } },
        },
      },
    },
    orderBy: [{ categoryId: 'asc' }, { sortOrder: 'asc' }],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Gérez vos plats, boissons et autres articles
          </p>
        </div>
        <Button asChild>
          <Link href="/app/items/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel article
          </Link>
        </Button>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-12 w-12" />}
          title="Aucun article"
          description="Ajoutez vos premiers plats, boissons ou autres articles."
          action={{
            label: 'Ajouter un article',
            href: '/app/items/new',
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Article</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-center">Régimes</TableHead>
                <TableHead className="text-center">Disponible</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Tags className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{item.category.name}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {item.category.menu.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.price))}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      {item.isVegetarian && (
                        <Badge variant="success" title="Végétarien">
                          <Leaf className="h-3 w-3" />
                        </Badge>
                      )}
                      {item.isVegan && (
                        <Badge variant="success" title="Végan">
                          V
                        </Badge>
                      )}
                      {item.isGlutenFree && (
                        <Badge variant="outline" title="Sans gluten">
                          <Wheat className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.isAvailable ? (
                      <Badge variant="success">
                        <Check className="h-3 w-3 mr-1" />
                        Oui
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="h-3 w-3 mr-1" />
                        Non
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <ItemActions item={{ id: item.id, name: item.name, isAvailable: item.isAvailable }} />
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
