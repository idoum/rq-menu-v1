import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditTeamMemberForm } from './edit-team-member-form';

interface EditTeamMemberPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTeamMemberPage({ params }: EditTeamMemberPageProps) {
  const { id } = await params;
  const auth = await requireOwner();

  const user = await prisma.user.findFirst({
    where: {
      id,
      tenantId: auth.tenant.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!user) {
    notFound();
  }

  const isSelf = user.id === auth.user.id;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Modifier un membre</h1>
        <p className="text-muted-foreground">
          Modifiez les informations de {user.name || user.email}
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du membre</CardTitle>
        </CardHeader>
        <CardContent>
          <EditTeamMemberForm user={user} isSelf={isSelf} />
        </CardContent>
      </Card>
    </div>
  );
}
