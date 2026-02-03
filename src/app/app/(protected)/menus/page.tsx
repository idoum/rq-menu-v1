import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Utensils, MoreHorizontal, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { MenuActions } from './menu-actions';

export default async function MenusPage() {
  const auth = await requireAuth();

  const menus = await prisma.menu.findMany({
    where: { tenantId: auth.tenant.id },
    include: {
      _count: {
        select: { categories: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menus</h1>
          <p className="text-muted-foreground">
            Gérez vos menus et leur visibilité
          </p>
        </div>
        <Button asChild>
          <Link href="/app/menus/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau menu
          </Link>
        </Button>
      </div>

      {/* Content */}
      {menus.length === 0 ? (
        <EmptyState
          icon={<Utensils className="h-12 w-12" />}
          title="Aucun menu"
          description="Créez votre premier menu pour organiser vos catégories et articles."
          action={{
            label: 'Créer un menu',
            href: '/app/menus/new',
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menus.map((menu) => (
            <Card key={menu.id} className="relative group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {menu.name}
                      {menu.isActive ? (
                        <Badge variant="success">
                          <Eye className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {menu.description || 'Aucune description'}
                    </CardDescription>
                  </div>
                  <MenuActions menu={menu} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Catégories</span>
                    <span className="font-medium">{menu._count.categories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Créé le</span>
                    <span className="font-medium">{formatDate(menu.createdAt)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
