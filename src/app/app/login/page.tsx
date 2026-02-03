'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/empty-state';
import { QrCode, LogIn } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      toast({
        title: 'Connexion réussie',
        description: 'Bienvenue !',
        variant: 'success',
      });

      router.push('/app');
      router.refresh();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <QrCode className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold">SaaS Resto</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Connectez-vous à votre espace d&apos;administration
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="demo@demo.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" required>
                    Mot de passe
                  </Label>
                  <Link
                    href="/app/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link href="/app/register" className="text-primary hover:underline font-medium">
                  Créer un restaurant
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground border-t pt-4">
              <p>
                Démo: <code className="bg-muted px-1 py-0.5 rounded">demo@demo.com</code> /{' '}
                <code className="bg-muted px-1 py-0.5 rounded">Demo12345!</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
