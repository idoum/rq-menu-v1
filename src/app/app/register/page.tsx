'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/empty-state';
import { QrCode, UserPlus, Check, X, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getTenantDisplayUrl } from '@/lib/urls';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    restaurantName: '',
    slug: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Slug availability state
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const debouncedSlug = useDebounce(formData.slug, 500);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate slug from restaurant name
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30);
  }, []);

  // Handle restaurant name change - auto-generate slug
  const handleRestaurantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    const newSlug = generateSlug(name);
    setFormData((prev) => ({
      ...prev,
      restaurantName: name,
      slug: newSlug,
    }));
  };

  // Check slug availability
  useEffect(() => {
    async function checkSlug() {
      if (!debouncedSlug || debouncedSlug.length < 3) {
        setSlugStatus('idle');
        return;
      }

      // Basic format validation
      const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
      if (!slugRegex.test(debouncedSlug)) {
        setSlugStatus('unavailable');
        return;
      }

      setSlugStatus('checking');

      try {
        const res = await fetch(`/api/auth/slug-availability?slug=${encodeURIComponent(debouncedSlug)}`);
        const data = await res.json();
        setSlugStatus(data.available ? 'available' : 'unavailable');
      } catch {
        setSlugStatus('unavailable');
      }
    }

    checkSlug();
  }, [debouncedSlug]);

  // Validate form fields
  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (formData.restaurantName && formData.restaurantName.length < 2) {
      newErrors.restaurantName = 'Le nom doit contenir au moins 2 caractères';
    }

    if (formData.slug && formData.slug.length < 3) {
      newErrors.slug = 'Le slug doit contenir au moins 3 caractères';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (formData.password) {
      if (formData.password.length < 10) {
        newErrors.password = 'Le mot de passe doit contenir au moins 10 caractères';
      } else if (!/[A-Za-z]/.test(formData.password)) {
        newErrors.password = 'Le mot de passe doit contenir au moins une lettre';
      } else if (!/[0-9]/.test(formData.password)) {
        newErrors.password = 'Le mot de passe doit contenir au moins un chiffre';
      }
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
  }, [formData]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (Object.keys(errors).length > 0 || slugStatus !== 'available') {
      toast({
        title: 'Erreur',
        description: 'Veuillez corriger les erreurs avant de continuer',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue');
        return;
      }

      toast({
        title: 'Bienvenue !',
        description: 'Votre restaurant a été créé avec succès',
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <QrCode className="h-10 w-10 text-primary" />
            <span className="text-2xl font-bold">SaaS Resto</span>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Créer votre restaurant</CardTitle>
            <CardDescription>
              Commencez gratuitement et créez votre menu digital en quelques minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="error" className="mb-4">
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Restaurant Name */}
              <div className="space-y-2">
                <Label htmlFor="restaurantName" required>
                  Nom du restaurant
                </Label>
                <Input
                  id="restaurantName"
                  name="restaurantName"
                  value={formData.restaurantName}
                  onChange={handleRestaurantNameChange}
                  placeholder="La Belle Assiette"
                  required
                  disabled={loading}
                  error={errors.restaurantName}
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug" required>
                  Adresse de votre menu
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="slug"
                      name="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                      placeholder="la-belle-assiette"
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugStatus === 'checking' && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      {slugStatus === 'available' && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                      {slugStatus === 'unavailable' && (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.slug ? (
                    <>
                      Votre menu sera accessible à{' '}
                      <span className="font-mono text-foreground">
                        {getTenantDisplayUrl(formData.slug)}
                      </span>
                    </>
                  ) : (
                    'Lettres minuscules, chiffres et tirets uniquement'
                  )}
                </p>
                {slugStatus === 'unavailable' && formData.slug.length >= 3 && (
                  <p className="text-xs text-destructive">
                    Ce nom n&apos;est pas disponible
                  </p>
                )}
                {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" required>
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  error={errors.email}
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password" required>
                  Mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                <p className="text-xs text-muted-foreground">
                  Minimum 10 caractères, au moins une lettre et un chiffre
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" required>
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || Object.keys(errors).length > 0 || slugStatus !== 'available'}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer mon restaurant
                  </>
                )}
              </Button>
            </form>

            {/* Login link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Déjà un compte ?{' '}
                <Link href="/app/login" className="text-primary hover:underline font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
