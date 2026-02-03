'use client';

import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, User, ExternalLink, Settings } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getTenantPublicUrl } from '@/lib/urls';
import type { Tenant, User as UserType } from '@prisma/client';

interface AdminHeaderProps {
  user: Pick<UserType, 'id' | 'email' | 'name' | 'role'>;
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'>;
}

export function AdminHeader({ user, tenant }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt !',
      });
      router.push('/app/login');
      router.refresh();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
  };

  const publicUrl = getTenantPublicUrl(tenant.slug);

  return (
    <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b">
      <div className="h-full flex items-center justify-between px-6">
        {/* Left side - breadcrumb/title could go here */}
        <div className="lg:pl-0 pl-12">{/* Space for mobile menu button */}</div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* View public menu */}
          <Button variant="outline" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir le menu
            </a>
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/app/settings" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Mon profil
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/app/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
