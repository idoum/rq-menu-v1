import { requireAuth } from '@/lib/auth';
import { getTenantDisplayUrl } from '@/lib/urls';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsForm } from './settings-form';
import Link from 'next/link';
import { ChevronRight, Shield } from 'lucide-react';

export default async function SettingsPage() {
  const auth = await requireAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Gérez les paramètres de votre compte et de votre établissement
        </p>
      </div>

      {/* Profile settings */}
      <Card>
        <CardHeader>
          <CardTitle>Mon profil</CardTitle>
          <CardDescription>
            Modifiez vos informations personnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm user={auth.user} />
        </CardContent>
      </Card>

      {/* Security settings link */}
      <Link href="/app/settings/security" className="block">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Sécurité</p>
                <p className="text-sm text-muted-foreground">Changer votre mot de passe</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* Tenant info */}
      <Card>
        <CardHeader>
          <CardTitle>Établissement</CardTitle>
          <CardDescription>
            Informations sur votre établissement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <p className="text-sm font-medium">Nom</p>
            <p className="text-sm text-muted-foreground">{auth.tenant.name}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">Identifiant (slug)</p>
            <p className="text-sm text-muted-foreground">{auth.tenant.slug}</p>
          </div>
          <div className="grid gap-2">
            <p className="text-sm font-medium">URL du menu</p>
            <p className="text-sm font-mono text-muted-foreground">
              {getTenantDisplayUrl(auth.tenant.slug)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
