import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuth();

  if (!auth) {
    redirect('/app/login');
  }

  // Fetch branding for sidebar
  const branding = await prisma.tenantBranding.findUnique({
    where: { tenantId: auth.tenant.id },
    select: { logoUrl: true, primaryColor: true },
  });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar */}
      <AdminSidebar user={auth.user} tenant={auth.tenant} branding={branding} />

      {/* Main content */}
      <div className="lg:pl-64">
        <AdminHeader user={auth.user} tenant={auth.tenant} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
