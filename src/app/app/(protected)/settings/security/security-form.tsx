'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react';

export function SecurityForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate password as user types
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    
    if (formData.newPassword && formData.newPassword.length < 10) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 10 caractères';
    } else if (formData.newPassword && !/[A-Za-z]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins une lettre';
    } else if (formData.newPassword && !/[0-9]/.test(formData.newPassword)) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins un chiffre';
    }

    if (formData.confirmPassword && formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
  }, [formData]);

  // Reset success state after showing
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if (Object.keys(errors).length > 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez corriger les erreurs avant de continuer',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.currentPassword) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer votre mot de passe actuel',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Une erreur est survenue');
      }

      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été modifié',
        variant: 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      toast({
        title: 'Erreur',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Mot de passe actuel</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? 'text' : 'password'}
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
            required
            disabled={loading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nouveau mot de passe</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
            required
            disabled={loading}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.newPassword && (
          <p className="text-sm text-destructive">{errors.newPassword}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Minimum 10 caractères, au moins une lettre et un chiffre
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            disabled={loading}
            autoComplete="new-password"
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
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </div>

      <Button 
        type="submit" 
        disabled={loading || Object.keys(errors).length > 0}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Modification...
          </>
        ) : success ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Mot de passe modifié
          </>
        ) : (
          'Changer le mot de passe'
        )}
      </Button>
    </form>
  );
}
