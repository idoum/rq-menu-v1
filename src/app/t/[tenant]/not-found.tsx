import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';

export default function TenantNotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-3">Restaurant introuvable</h2>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          Le restaurant que vous recherchez n&apos;existe pas ou n&apos;est plus disponible.
          Vérifiez l&apos;adresse et réessayez.
        </p>

        {/* CTA */}
        <Link href="/">
          <Button size="lg" className="rounded-full px-8">
            Retour à l&apos;accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
