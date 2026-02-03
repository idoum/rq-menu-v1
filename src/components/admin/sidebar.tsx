'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Utensils,
  FolderOpen,
  Tags,
  QrCode,
  MapPin,
  Users,
  Settings,
  Palette,
  ChevronDown,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import type { Tenant, User, TenantBranding } from '@prisma/client';

interface AdminSidebarProps {
  user: Pick<User, 'id' | 'email' | 'name' | 'role'>;
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'>;
  branding?: Pick<TenantBranding, 'logoUrl' | 'primaryColor'> | null;
}

const menuItems = [
  {
    title: 'Tableau de bord',
    href: '/app',
    icon: LayoutDashboard,
  },
  {
    title: 'Menu',
    icon: Utensils,
    children: [
      { title: 'Menus', href: '/app/menus', icon: Utensils },
      { title: 'Catégories', href: '/app/categories', icon: FolderOpen },
      { title: 'Articles', href: '/app/items', icon: Tags },
    ],
  },
  {
    title: 'Salles & QR',
    icon: QrCode,
    children: [
      { title: 'Zones', href: '/app/zones', icon: MapPin },
      { title: 'QR Codes', href: '/app/qrcodes', icon: QrCode },
    ],
  },
  {
    title: 'Design',
    href: '/app/branding',
    icon: Palette,
  },
  {
    title: 'Équipe',
    href: '/app/team',
    icon: Users,
  },
  {
    title: 'Paramètres',
    href: '/app/settings',
    icon: Settings,
  },
];

export function AdminSidebar({ user, tenant, branding }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(['Menu', 'Salles & QR']);

  const logoUrl = branding?.logoUrl || null;
  const primaryColor = branding?.primaryColor || '#111827';

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: (typeof menuItems)[0]) => {
    const Icon = item.icon;

    if ('children' in item && item.children) {
      const isOpen = openGroups.includes(item.title);
      const hasActiveChild = item.children.some((child) => isActive(child.href));

      return (
        <div key={item.title} className="space-y-1">
          <button
            onClick={() => toggleGroup(item.title)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              hasActiveChild
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4" />
              {item.title}
            </div>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
            />
          </button>
          {isOpen && (
            <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
              {item.children.map((child) => {
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive(child.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                    onClick={() => setMobileOpen(false)}
                  >
                    <ChildIcon className="h-4 w-4" />
                    {child.title}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.title}
        href={item.href!}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive(item.href!)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        onClick={() => setMobileOpen(false)}
      >
        <Icon className="h-4 w-4" />
        {item.title}
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / Tenant */}
      <div className="p-4 border-b">
        <Link href="/app" className="flex items-center gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenant.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primaryColor }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{tenant.name}</p>
            <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">{menuItems.map(renderNavItem)}</nav>

      {/* User info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name || user.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-background shadow-md border"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-background border-r transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
