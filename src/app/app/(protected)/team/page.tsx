import { requireOwner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { TeamMemberActions } from './team-member-actions';

export default async function TeamPage() {
  const auth = await requireOwner();

  const users = await prisma.user.findMany({
    where: { tenantId: auth.tenant.id },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Équipe</h1>
          <p className="text-muted-foreground">
            Gérez les membres de votre équipe et leurs accès
          </p>
        </div>
        <Button asChild>
          <Link href="/app/team/new">
            <Plus className="h-4 w-4 mr-2" />
            Inviter un membre
          </Link>
        </Button>
      </div>

      {/* Content */}
      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Aucun membre"
          description="Invitez des membres pour les aider à gérer votre établissement."
          action={{
            label: 'Inviter un membre',
            href: '/app/team/new',
          }}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || '—'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'OWNER' ? 'default' : 'secondary'}>
                      {user.role === 'OWNER' ? 'Propriétaire' : 'Staff'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell>
                    {user.id !== auth.user.id && (
                      <TeamMemberActions user={user} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
