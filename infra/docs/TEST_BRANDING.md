# Test Branding - Phase 6

Ce document décrit les étapes de test pour la fonctionnalité de branding/theming par tenant.

## Prérequis

1. Serveur de développement démarré: `npm run dev`
2. Compte utilisateur OWNER connecté
3. Au moins un menu avec des catégories et items créés

## Tests Backoffice

### 1. Accéder à la page Branding

1. Aller sur `/app/branding`
2. **Attendu**: Page avec formulaire et aperçu en direct à droite

### 2. Test Upload Logo

1. Dans la section "Images", cliquer sur "Télécharger" pour le logo
2. Sélectionner une image carrée (JPEG, PNG, WebP ou GIF, max 5MB)
3. **Attendu**: 
   - Upload réussi avec toast de confirmation
   - Image affichée dans la zone de prévisualisation
   - Aperçu en direct mis à jour immédiatement

### 3. Test Upload Bannière

1. Dans la section "Images", cliquer sur "Télécharger" pour l'image de bannière
2. Sélectionner une image horizontale (1200x400px recommandé)
3. **Attendu**: 
   - Upload réussi
   - Aperçu montre la bannière au-dessus du logo

### 4. Test Changement de Couleurs

1. Dans la section "Couleurs", modifier:
   - Couleur primaire (ex: #1E40AF bleu foncé)
   - Couleur secondaire (ex: #64748B gris)
   - Couleur d'accent (ex: #DC2626 rouge)
2. **Attendu**: 
   - Sélecteur de couleur fonctionne (picker + champ hex)
   - Aperçu en direct reflète les changements immédiatement

### 5. Test Police de caractères

1. Dans la section "Typographie & Slogan", changer la police:
   - Système (par défaut)
   - Inter (moderne)
   - Poppins (arrondi)
   - Playfair Display (élégant)
2. **Attendu**: 
   - Aperçu en direct change de police

### 6. Test Slogan

1. Dans le champ "Slogan", entrer un texte (max 120 caractères)
   - Ex: "Les meilleures pizzas de Montréal depuis 1995"
2. **Attendu**: 
   - Compteur de caractères mis à jour
   - Slogan visible dans l'aperçu

### 7. Test Sauvegarde

1. Cliquer sur "Enregistrer"
2. **Attendu**: 
   - Toast de succès "Branding enregistré"
   - Modifications persistées (recharger la page pour vérifier)

### 8. Test Annulation

1. Modifier une valeur
2. Cliquer sur "Annuler les modifications"
3. **Attendu**: 
   - Toutes les valeurs reviennent à l'état initial

## Tests Menu Public

### 9. Vérifier le branding sur le menu public

1. Ouvrir le menu public: `http://{tenant-slug}.saasresto.localhost:3000/`
   (ou via le proxy `/t/{tenant-slug}`)
2. **Attendu**:
   - Logo affiché dans le header
   - Si bannière configurée, elle s'affiche en haut
   - Nom du restaurant avec couleur primaire
   - Slogan visible sous le nom
   - Police de caractères appliquée
   - Couleur d'accent utilisée pour:
     - Les chips de catégorie actifs
     - Les prix des items

### 10. Test sans branding (défauts)

1. Pour un nouveau tenant sans branding configuré
2. **Attendu**:
   - Couleurs par défaut utilisées:
     - Primaire: #111827 (slate-900)
     - Secondaire: #6B7280 (gray-500)
     - Accent: #2563EB (blue-600)
   - Police système par défaut

## Tests API

### GET /api/app/branding

```bash
curl -X GET http://localhost:3000/api/app/branding \
  -H "Cookie: session_token=YOUR_TOKEN"
```

**Attendu**: 200 avec branding et tenant data

### PUT /api/app/branding

```bash
curl -X PUT http://localhost:3000/api/app/branding \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{
    "primaryColor": "#1E40AF",
    "secondaryColor": "#64748B",
    "accentColor": "#DC2626",
    "fontFamily": "inter",
    "tagline": "Test slogan"
  }'
```

**Attendu**: 200 avec branding mis à jour

### POST /api/app/uploads

```bash
curl -X POST http://localhost:3000/api/app/uploads \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

**Attendu**: 201 avec `{ "url": "/uploads/{tenantId}/{filename}" }`

## Validation des erreurs

### Couleur invalide

```bash
curl -X PUT http://localhost:3000/api/app/branding \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{"primaryColor": "red"}'
```

**Attendu**: 400 avec message "Couleur invalide (format: #RRGGBB)"

### Police non supportée

```bash
curl -X PUT http://localhost:3000/api/app/branding \
  -H "Content-Type: application/json" \
  -H "Cookie: session_token=YOUR_TOKEN" \
  -d '{"fontFamily": "comic-sans"}'
```

**Attendu**: 400 avec message "Police non supportée"

### Slogan trop long

**Attendu**: 400 si slogan > 120 caractères

## Sécurité

### Test RBAC

1. Se connecter en tant que STAFF (non OWNER)
2. Accéder à `/app/branding`
3. **Attendu**: Redirection ou erreur 403

### Test tenant isolation

1. Modifier le branding du tenant A
2. Vérifier que le tenant B n'est pas affecté
3. **Attendu**: Chaque tenant a son propre branding isolé

## Résumé des fichiers

| Fichier | Description |
|---------|-------------|
| `prisma/schema.prisma` | Modèle TenantBranding |
| `src/lib/validations/index.ts` | Schema Zod updateBrandingSchema |
| `src/app/api/app/branding/route.ts` | API GET/PUT branding |
| `src/app/api/app/uploads/route.ts` | API upload images |
| `src/app/app/(protected)/branding/page.tsx` | Page backoffice |
| `src/app/app/(protected)/branding/branding-form.tsx` | Formulaire avec aperçu |
| `src/app/t/[tenant]/layout.tsx` | Layout public avec variables CSS |
| `src/components/public/MenuClient.tsx` | Menu utilisant --brand-accent |
