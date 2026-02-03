'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Upload, Trash2, ImageIcon, Palette } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// =============================================================================
// TYPES
// =============================================================================

type FontFamily = 'system' | 'inter' | 'poppins' | 'playfair';

interface BrandingData {
  id: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: FontFamily;
  tagline: string | null;
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
}

interface BrandingFormProps {
  branding: BrandingData;
  tenant: TenantData;
}

// =============================================================================
// FONT CONFIGURATION
// =============================================================================

const FONT_OPTIONS: { value: FontFamily; label: string; css: string }[] = [
  { value: 'system', label: 'Système (par défaut)', css: 'system-ui, -apple-system, sans-serif' },
  { value: 'inter', label: 'Inter (moderne)', css: '"Inter", system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins (arrondi)', css: '"Poppins", system-ui, sans-serif' },
  { value: 'playfair', label: 'Playfair Display (élégant)', css: '"Playfair Display", Georgia, serif' },
];

function getFontCss(fontFamily: FontFamily): string {
  return FONT_OPTIONS.find((f) => f.value === fontFamily)?.css || FONT_OPTIONS[0].css;
}

// =============================================================================
// IMAGE UPLOAD COMPONENT
// =============================================================================

interface ImageUploadProps {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string | null) => void;
  aspectRatio?: 'square' | 'banner';
  disabled?: boolean;
}

function ImageUpload({
  label,
  description,
  value,
  onChange,
  aspectRatio = 'square',
  disabled = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/app/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Erreur');
        }

        const data = await res.json();
        onChange(data.url);
        toast({
          title: 'Image téléchargée',
          description: 'L\'image a été téléchargée avec succès',
          variant: 'success',
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur de téléchargement';
        toast({
          title: 'Erreur',
          description: message,
          variant: 'destructive',
        });
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleUpload(file);
    }
  };

  const sizeClasses = aspectRatio === 'banner' ? 'h-32' : 'h-28 w-28';

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-sm text-muted-foreground mb-2">{description}</p>

      <div className="flex items-start gap-4">
        {/* Preview / Drop zone */}
        <div
          className={`relative ${sizeClasses} ${aspectRatio === 'banner' ? 'w-full max-w-md' : ''} 
            rounded-lg border-2 border-dashed transition-colors overflow-hidden
            ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
        >
          {value ? (
            <Image
              src={value}
              alt={label}
              fill
              className="object-cover"
              unoptimized // External URL
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              {uploading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-current border-t-transparent" />
              ) : (
                <>
                  <ImageIcon className="h-6 w-6 mb-1" />
                  <span className="text-xs">Glisser ou cliquer</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {value ? 'Changer' : 'Télécharger'}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              disabled={disabled || uploading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
}

// =============================================================================
// COLOR INPUT COMPONENT
// =============================================================================

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ColorInput({ label, value, onChange, disabled = false }: ColorInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-14 h-10 p-1 cursor-pointer"
          disabled={disabled}
        />
        <Input
          type="text"
          value={value.toUpperCase()}
          onChange={(e) => {
            const hex = e.target.value;
            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
              onChange(hex);
            }
          }}
          placeholder="#000000"
          className="flex-1 font-mono uppercase"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// =============================================================================
// LIVE PREVIEW COMPONENT
// =============================================================================

interface LivePreviewProps {
  tenant: TenantData;
  branding: {
    logoUrl: string | null;
    heroImageUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: FontFamily;
    tagline: string | null;
  };
}

function LivePreview({ tenant, branding }: LivePreviewProps) {
  const fontCss = getFontCss(branding.fontFamily);

  const previewStyle: React.CSSProperties & Record<`--brand-${string}`, string> = {
    '--brand-primary': branding.primaryColor,
    '--brand-secondary': branding.secondaryColor,
    '--brand-accent': branding.accentColor,
    '--brand-font': fontCss,
    fontFamily: fontCss,
  };

  return (
    <div className="rounded-lg border overflow-hidden bg-background" style={previewStyle}>
      {/* Hero Section */}
      <div
        className="h-24 relative flex items-end"
        style={{
          backgroundColor: branding.heroImageUrl ? undefined : branding.primaryColor,
        }}
      >
        {branding.heroImageUrl && (
          <Image
            src={branding.heroImageUrl}
            alt="Bannière"
            fill
            className="object-cover"
            unoptimized
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Header with logo */}
      <div className="px-4 pb-4 -mt-8 relative">
        <div className="flex items-end gap-3">
          {branding.logoUrl ? (
            <div className="relative h-16 w-16 rounded-xl overflow-hidden border-4 border-background shadow-lg">
              <Image
                src={branding.logoUrl}
                alt={tenant.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-xl 
                border-4 border-background shadow-lg"
              style={{ backgroundColor: branding.primaryColor }}
            >
              {tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="pb-1">
            <h3 className="font-bold text-lg" style={{ color: branding.primaryColor }}>
              {tenant.name}
            </h3>
            {branding.tagline && (
              <p className="text-sm" style={{ color: branding.secondaryColor }}>
                {branding.tagline}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Sample category tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-2 overflow-x-auto">
          <Badge
            className="whitespace-nowrap"
            style={{ backgroundColor: branding.accentColor, color: '#fff' }}
          >
            Entrées
          </Badge>
          <Badge variant="outline" className="whitespace-nowrap">
            Plats
          </Badge>
          <Badge variant="outline" className="whitespace-nowrap">
            Desserts
          </Badge>
        </div>
      </div>

      {/* Sample item card */}
      <div className="px-4 pb-4">
        <div className="rounded-lg border p-3 flex gap-3">
          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-2">
              <h4 className="font-semibold text-sm">Salade César</h4>
              <span
                className="font-bold text-sm whitespace-nowrap"
                style={{ color: branding.accentColor }}
              >
                12,50 $
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              Laitue romaine, parmesan, croûtons, sauce César maison
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN FORM COMPONENT
// =============================================================================

export function BrandingForm({ branding: initialBranding, tenant }: BrandingFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState<string | null>(initialBranding.logoUrl);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(initialBranding.heroImageUrl);
  const [primaryColor, setPrimaryColor] = useState(initialBranding.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(initialBranding.secondaryColor);
  const [accentColor, setAccentColor] = useState(initialBranding.accentColor);
  const [fontFamily, setFontFamily] = useState<FontFamily>(initialBranding.fontFamily);
  const [tagline, setTagline] = useState(initialBranding.tagline || '');

  // Current preview state
  const previewBranding = {
    logoUrl,
    heroImageUrl,
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily,
    tagline: tagline || null,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/app/branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl,
          heroImageUrl,
          primaryColor,
          secondaryColor,
          accentColor,
          fontFamily,
          tagline: tagline || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }

      toast({
        title: 'Branding enregistré',
        description: 'Vos modifications ont été appliquées au menu public',
        variant: 'success',
      });

      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLogoUrl(initialBranding.logoUrl);
    setHeroImageUrl(initialBranding.heroImageUrl);
    setPrimaryColor(initialBranding.primaryColor);
    setSecondaryColor(initialBranding.secondaryColor);
    setAccentColor(initialBranding.accentColor);
    setFontFamily(initialBranding.fontFamily);
    setTagline(initialBranding.tagline || '');
  };

  const hasChanges =
    logoUrl !== initialBranding.logoUrl ||
    heroImageUrl !== initialBranding.heroImageUrl ||
    primaryColor !== initialBranding.primaryColor ||
    secondaryColor !== initialBranding.secondaryColor ||
    accentColor !== initialBranding.accentColor ||
    fontFamily !== initialBranding.fontFamily ||
    (tagline || null) !== initialBranding.tagline;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid lg:grid-cols-[1fr,380px] gap-6">
        {/* Left column: Form */}
        <div className="space-y-6">
          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Images
              </CardTitle>
              <CardDescription>
                Téléchargez votre logo et une image de bannière
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload
                label="Logo"
                description="Image carrée recommandée (200x200px minimum)"
                value={logoUrl}
                onChange={setLogoUrl}
                aspectRatio="square"
                disabled={saving}
              />

              <ImageUpload
                label="Image de bannière"
                description="Image horizontale (1200x400px recommandé)"
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                aspectRatio="banner"
                disabled={saving}
              />
            </CardContent>
          </Card>

          {/* Colors Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Couleurs
              </CardTitle>
              <CardDescription>Définissez votre palette de couleurs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <ColorInput
                  label="Couleur primaire"
                  value={primaryColor}
                  onChange={setPrimaryColor}
                  disabled={saving}
                />
                <ColorInput
                  label="Couleur secondaire"
                  value={secondaryColor}
                  onChange={setSecondaryColor}
                  disabled={saving}
                />
                <ColorInput
                  label="Couleur d'accent"
                  value={accentColor}
                  onChange={setAccentColor}
                  disabled={saving}
                />
              </div>
            </CardContent>
          </Card>

          {/* Typography & Tagline Section */}
          <Card>
            <CardHeader>
              <CardTitle>Typographie & Slogan</CardTitle>
              <CardDescription>
                Choisissez la police et ajoutez un slogan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fontFamily">Police de caractères</Label>
                <Select
                  value={fontFamily}
                  onValueChange={(v) => setFontFamily(v as FontFamily)}
                  disabled={saving}
                >
                  <SelectTrigger id="fontFamily">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.css }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline">Slogan</Label>
                <Textarea
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Votre slogan ou phrase d'accroche..."
                  maxLength={120}
                  rows={2}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {tagline.length}/120 caractères
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            {hasChanges && (
              <Button type="button" variant="ghost" onClick={handleReset} disabled={saving}>
                Annuler les modifications
              </Button>
            )}
          </div>
        </div>

        {/* Right column: Live Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Aperçu en direct</CardTitle>
              <CardDescription>
                Visualisez les changements en temps réel
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <LivePreview tenant={tenant} branding={previewBranding} />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
