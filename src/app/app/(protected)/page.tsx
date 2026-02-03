import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTenantDisplayUrl } from '@/lib/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Utensils, FolderOpen, QrCode, Users, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const auth = await requireAuth();
  const tenantId = auth.tenant.id;

  // Fetch dashboard stats
  const [menusCount, categoriesCount, itemsCount, qrCodesCount, usersCount] = await Promise.all([
    prisma.menu.count({ where: { tenantId } }),
    prisma.category.count({ where: { tenantId } }),
    prisma.item.count({ where: { tenantId } }),
    prisma.qrCode.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
  ]);

  const availableItems = await prisma.item.count({
    where: { tenantId, isAvailable: true },
  });

  // Check if this is a new tenant (no menu yet)
  const isNewTenant = menusCount === 0;

  const stats = [
    {
      title: 'Menus',
      value: menusCount,
      icon: Utensils,
      href: '/app/menus',
      description: 'Menus actifs',
    },
    {
      title: 'Catégories',
      value: categoriesCount,
      icon: FolderOpen,
      href: '/app/categories',
      description: 'Catégories de menu',
    },
    {
      title: 'Articles',
      value: itemsCount,
      icon: Utensils,
      href: '/app/items',
      description: `${availableItems} disponibles`,
    },
    {
      title: 'QR Codes',
      value: qrCodesCount,
      icon: QrCode,
      href: '/app/qrcodes',
      description: 'Codes générés',
    },
    {
      title: 'Équipe',
      value: usersCount,
      icon: Users,
      href: '/app/team',
      description: 'Membres',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour, {auth.user.name || auth.user.email.split('@')[0]}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bienvenue sur le tableau de bord de {auth.tenant.name}
        </p>
      </div>

      {/* Onboarding card for new tenants */}
      {isNewTenant && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Bienvenue sur RQ Menu ! 🎉</CardTitle>
                <CardDescription>
                  Commencez par créer votre premier menu pour que vos clients puissent découvrir vos plats
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Votre menu digital sera accessible à l&apos;adresse :
                </p>
                <p className="text-sm font-mono text-foreground">
                  {getTenantDisplayUrl(auth.tenant.slug)}
                </p>
              </div>
              <Button asChild size="lg" className="gap-2">
                <Link href="/app/menus/new">
                  Créer mon premier menu
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Actions rapides
            </CardTitle>
            <CardDescription>Accédez rapidement aux fonctionnalités principales</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link
              href="/app/items/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ajouter un article</p>
                <p className="text-sm text-muted-foreground">Créer un nouveau plat ou boisson</p>
              </div>
            </Link>
            <Link
              href="/app/qrcodes/new"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Générer un QR code</p>
                <p className="text-sm text-muted-foreground">Pour une table ou une zone</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Votre menu public</CardTitle>
            <CardDescription>Lien vers votre menu visible par les clients</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono break-all">
                {getTenantDisplayUrl(auth.tenant.slug)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Partagez ce lien ou générez des QR codes pour permettre à vos clients d'accéder
              à votre menu digital.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
