import { requireAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SecurityForm } from './security-form';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default async function SecuritySettingsPage() {
  await requireAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/app/settings"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sécurité</h1>
          <p className="text-muted-foreground">
            Gérez les paramètres de sécurité de votre compte
          </p>
        </div>
      </div>

      {/* Change password */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Changer le mot de passe</CardTitle>
              <CardDescription>
                Mettez à jour votre mot de passe pour renforcer la sécurité de votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SecurityForm />
        </CardContent>
      </Card>

      {/* Security tips */}
      <Card>
        <CardHeader>
          <CardTitle>Conseils de sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Utilisez un mot de passe unique que vous n&apos;utilisez pas sur d&apos;autres sites</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Combinez lettres majuscules, minuscules, chiffres et caractères spéciaux</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Évitez les informations personnelles facilement devinables</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>Changez régulièrement votre mot de passe</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
