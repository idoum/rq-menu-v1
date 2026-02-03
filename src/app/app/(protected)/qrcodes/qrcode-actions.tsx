'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, Eye, EyeOff, QrCode, Download, FileImage, FileCode } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getQrCodeUrl } from '@/lib/urls';
import type { QrCode as QrCodeType, Zone } from '@prisma/client';

interface QrCodeActionsProps {
  qrCode: QrCodeType & { zone: Pick<Zone, 'name' | 'slug'> | null };
  tenantSlug: string;
}

export function QrCodeActions({ qrCode, tenantSlug }: QrCodeActionsProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingSvg, setDownloadingSvg] = useState(false);

  const zoneSlug = qrCode.zone?.slug;
  const url = getQrCodeUrl(tenantSlug, {
    zone: zoneSlug,
    table: qrCode.tableNumber || undefined,
  });

  // API endpoint for QR code image
  const getImageUrl = (format: 'png' | 'svg', size = 400) => 
    `/api/app/qrcodes/${qrCode.id}/image?format=${format}&size=${size}`;

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/qrcodes/${qrCode.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !qrCode.isActive }),
      });

      if (!res.ok) throw new Error();

      toast({
        title: qrCode.isActive ? 'QR code désactivé' : 'QR code activé',
        variant: 'success',
      });
      router.refresh();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/app/qrcodes/${qrCode.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error();

      toast({
        title: 'QR code supprimé',
        variant: 'success',
      });
      setDeleteDialogOpen(false);
      router.refresh();
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQrCode = async (format: 'png' | 'svg') => {
    const setDownloading = format === 'png' ? setDownloadingPng : setDownloadingSvg;
    setDownloading(true);
    
    try {
      const response = await fetch(getImageUrl(format, 400));
      
      if (!response.ok) {
        throw new Error('Erreur lors du téléchargement');
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      // Create a temporary link to download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `qr-${qrCode.label.replace(/[^a-z0-9]/gi, '-')}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: `QR code téléchargé (${format.toUpperCase()})`,
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le QR code',
        variant: 'destructive',
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setQrDialogOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />
            Voir le QR code
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadQrCode('png')} disabled={downloadingPng}>
            <FileImage className="h-4 w-4 mr-2" />
            {downloadingPng ? 'Téléchargement...' : 'Télécharger PNG'}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => downloadQrCode('svg')} disabled={downloadingSvg}>
            <FileCode className="h-4 w-4 mr-2" />
            {downloadingSvg ? 'Téléchargement...' : 'Télécharger SVG'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={`/app/qrcodes/${qrCode.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActive} disabled={loading}>
            {qrCode.isActive ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Désactiver
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Activer
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Preview Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{qrCode.label}</DialogTitle>
            <DialogDescription>
              {qrCode.zone?.name || 'Aucune zone'}
              {qrCode.tableNumber && ` - Table ${qrCode.tableNumber}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getImageUrl('png', 300)}
              alt="QR Code"
              className="rounded-lg bg-white p-2"
              width={300}
              height={300}
            />
            <p className="text-xs text-muted-foreground text-center break-all">{url}</p>
            <div className="flex gap-2 w-full">
              <Button 
                onClick={() => downloadQrCode('png')} 
                className="flex-1"
                disabled={downloadingPng}
              >
                <FileImage className="h-4 w-4 mr-2" />
                {downloadingPng ? 'Téléchargement...' : 'PNG'}
              </Button>
              <Button 
                onClick={() => downloadQrCode('svg')} 
                variant="outline"
                className="flex-1"
                disabled={downloadingSvg}
              >
                <FileCode className="h-4 w-4 mr-2" />
                {downloadingSvg ? 'Téléchargement...' : 'SVG'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le QR code ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le QR code &quot;{qrCode.label}&quot; sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
