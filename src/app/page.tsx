import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Utensils, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">SaaS Resto</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/app/login">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/app">
              <Button>Tableau de bord</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Votre menu digital
          <br />
          <span className="text-primary">en quelques clics</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Créez et gérez votre menu QR code. Vos clients scannent, consultent et commandent.
          Simple, moderne, efficace.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/app">
            <Button size="lg" className="gap-2">
              <Utensils className="h-5 w-5" />
              Commencer maintenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <QrCode className="h-12 w-12 text-primary mb-4" />
              <CardTitle>QR Codes personnalisés</CardTitle>
              <CardDescription>
                Générez des QR codes pour chaque table ou zone de votre restaurant
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Créez des zones (terrasse, salle, bar) et attribuez des QR codes uniques
                à chaque table pour une expérience personnalisée.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Utensils className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Menu dynamique</CardTitle>
              <CardDescription>
                Modifiez votre menu en temps réel, gérez la disponibilité
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Plus besoin de réimprimer vos menus. Changez les prix, ajoutez des plats
                ou marquez un article comme indisponible instantanément.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mb-4" />
              <CardTitle>Multi-tenant sécurisé</CardTitle>
              <CardDescription>
                Chaque restaurant a son propre sous-domaine et ses données isolées
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Vos données sont strictement isolées. Accédez à votre espace via votre
                propre URL personnalisée.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <QrCode className="h-6 w-6 text-primary" />
              <span className="font-semibold">SaaS Resto</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 SaaS Resto. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
