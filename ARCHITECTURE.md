# Architecture - SaaS Resto (QR Menu Multi-tenant)

## Vue d'ensemble

SaaS Resto est une application multi-tenant de menu QR pour restaurants. Chaque restaurant est accessible via un sous-domaine unique:
- `https://{tenantSlug}.saasresto.localhost` (développement)
- `https://{tenantSlug}.saasresto.isprojets.cloud` (production)

## Principes architecturaux

### 1. Isolation Multi-tenant

Chaque tenant (restaurant) dispose de:
- Son propre sous-domaine
- Ses propres données (isolées via `tenantId` sur toutes les tables)
- Son propre backoffice d'administration

**CRITIQUE**: Le `tenantId` est **obligatoire** sur toutes les requêtes de base de données. Il n'existe aucune requête sans filtre tenant.

### 2. Séparation Middleware / Base de données

```
┌─────────────────────────────────────────────────────────────────┐
│                        MIDDLEWARE                                │
│  ✓ Parse Host header                                            │
│  ✓ Extract tenant slug                                          │
│  ✓ Set x-tenant-slug header                                     │
│  ✓ Rewrite /path → /_t/{slug}/path                             │
│  ✗ JAMAIS d'accès Prisma/DB                                     │
│  ✗ JAMAIS d'import Prisma                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 SERVER COMPONENTS / API ROUTES                   │
│  ✓ Accès base de données via Prisma                             │
│  ✓ Résolution tenant depuis slug                                │
│  ✓ Validation session                                           │
│  ✓ Enforcement RBAC                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Pourquoi?**
- Le middleware Next.js peut s'exécuter en Edge Runtime
- Edge Runtime n'a pas accès aux drivers natifs PostgreSQL
- Prisma nécessite le Node.js Runtime pour les connexions DB

### 3. Structure des routes

```
/src/app
├── /_t/[tenant]/              # Routes publiques (menu client)
│   ├── page.tsx               # Page menu principal
│   └── layout.tsx             # Layout public
├── /app/                      # Backoffice (admin)
│   ├── layout.tsx             # Layout admin avec sidebar
│   ├── page.tsx               # Dashboard
│   ├── login/                 # Authentification
│   ├── menus/                 # CRUD menus
│   ├── categories/            # CRUD catégories
│   ├── items/                 # CRUD articles
│   ├── zones/                 # CRUD zones
│   ├── qrcodes/               # CRUD QR codes
│   ├── team/                  # Gestion équipe (OWNER only)
│   └── settings/              # Paramètres
└── /api/                      # Route handlers
    ├── /auth/                 # Login, logout, session
    └── /app/                  # API backoffice
```

### 4. Flow de résolution tenant

```
1. Client accède: https://demo.saasresto.localhost/menu

2. Middleware:
   - Lit Host: "demo.saasresto.localhost"
   - Extrait slug: "demo"
   - Vérifie allowlist (www, app exclus)
   - Set header: x-tenant-slug: demo
   - Rewrite: /menu → /_t/demo/menu

3. Server Component /_t/[tenant]/page.tsx:
   - Lit params.tenant (= "demo")
   - Appelle getTenantBySlug("demo")
   - Si tenant inexistant → 404
   - Charge données avec tenantId

4. Rendu page avec données tenant
```

### 5. Authentification & Sessions

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Login Form    │────▶│  API /auth/login │────▶│   Vérification  │
│                 │     │                 │     │   credentials   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Set Cookie    │◀────│  Créer Session  │◀────│  Hash password  │
│  (httpOnly)     │     │   (tokenHash)   │     │    bcrypt       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Sécurité:**
- Token aléatoire (crypto.randomUUID)
- Seul le hash SHA-256 stocké en DB
- Cookie httpOnly, Secure (en HTTPS), SameSite=Lax
- Expiration configurable (SESSION_TTL_DAYS)
- Rate limiting sur login

### 6. RBAC (Role-Based Access Control)

| Rôle  | Dashboard | Menus | Items | Zones | QR | Team | Settings |
|-------|-----------|-------|-------|-------|-----|------|----------|
| OWNER | ✓         | ✓     | ✓     | ✓     | ✓   | ✓    | ✓        |
| STAFF | ✓         | ✓     | ✓     | ✓     | ✓   | ✗    | ✗        |

### 7. Configuration environnement

**Variables critiques:**
```
APP_BASE_DOMAIN     # Domaine de base (sans protocol)
COOKIE_SECURE       # true en HTTPS (dev-like/prod)
AUTH_SECRET         # Secret pour signatures
DATABASE_URL        # Connexion PostgreSQL
```

**Modes d'exécution:**

| Mode        | Commande          | URL                              | HTTPS | Cookies |
|-------------|-------------------|----------------------------------|-------|---------|
| Dev simple  | `npm run dev`     | http://localhost:3000            | ✗     | Normal  |
| Dev-like    | `npm run dev:prodlike` | https://demo.saasresto.localhost | ✓     | Secure  |
| Production  | `npm run start`   | https://demo.saasresto.cloud     | ✓     | Secure  |

### 8. Reverse Proxy (Caddy)

```
┌──────────────────────────────────────────────────────────────┐
│                         CADDY                                 │
│  - Terminaison TLS                                           │
│  - Wildcard *.saasresto.localhost                            │
│  - Headers sécurité (CSP, X-Content-Type-Options, etc.)      │
│  - Reverse proxy → localhost:3000                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│                       NEXT.JS                                 │
│  - App Router                                                │
│  - Server Components                                         │
│  - API Routes                                                │
└──────────────────────────────────────────────────────────────┘
```

### 9. Philosophie Prod-Like

Le développement utilise la **même configuration** que la production:
- Même structure de variables d'environnement
- Même logique de parsing de domaine
- Même headers de sécurité (sauf HSTS)
- Même cookies sécurisés (en dev-like)
- Même reverse proxy (Caddy)

**Déploiement = copier-coller** (presque):
1. Mettre à jour `.env` avec vraies valeurs
2. Configurer DNS
3. Démarrer les services

## Structure des dossiers

```
/
├── prisma/
│   ├── schema.prisma      # Modèle de données
│   └── seed.ts            # Données de développement
├── src/
│   ├── app/               # Next.js App Router
│   ├── components/        # Composants React
│   │   └── ui/            # Composants UI réutilisables
│   └── lib/               # Bibliothèques partagées
│       ├── db.ts          # Client Prisma
│       ├── auth.ts        # Authentification
│       ├── tenant.ts      # Résolution tenant
│       ├── security.ts    # Utilitaires sécurité
│       └── validations/   # Schémas Zod
├── infra/
│   ├── proxy/             # Configurations Caddy
│   ├── scripts/           # Scripts DB backup/restore
│   ├── systemd/           # Services systemd
│   └── docs/              # Documentation opérationnelle
└── uploads/               # Fichiers uploadés (gitignored)
```

## Standards de code

### Composants UI

Tous les composants UI suivent le pattern:
- Props typées avec TypeScript
- Variants via class-variance-authority
- Styling via Tailwind CSS
- Accessibilité (ARIA, focus visible)

### Validation

- Zod pour validation côté serveur ET client
- Messages d'erreur utilisateur-friendly
- Pas d'exposition d'erreurs système

### Gestion d'erreurs

- Try/catch sur toutes les opérations DB
- Errors structurées { error: string, code?: string }
- Logging approprié (pas de secrets)
- Pages d'erreur gracieuses

## Sécurité

### Headers (via Caddy)

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; ...
```

### Cookies

```
Name: session_token
Value: [random UUID]
HttpOnly: true
Secure: true (en HTTPS)
SameSite: Lax
Path: /
Domain: (optionnel, pour cross-subdomain)
Max-Age: 7 jours (configurable)
```

### Protection CSRF

- SameSite=Lax protège contre CSRF simple
- Mutations via Server Actions ou POST uniquement
- Validation origin pour les API routes sensibles

## Performance

### Caching

- `unstable_cache` pour les données tenant (court TTL)
- Revalidation sur mutations
- Edge caching pour assets statiques (via Caddy)

### Base de données

- Indexes sur toutes les colonnes de recherche
- Indexes composites pour requêtes fréquentes
- Connection pooling via Prisma

## Évolutions futures

1. **S3 pour uploads** - Actuellement stockage local, préparé pour S3
2. **Redis pour sessions** - Actuellement PostgreSQL
3. **Multi-langue** - Structure prête pour i18n
4. **Analytics** - Événements préparés
5. **Paiements** - Intégration Stripe prévue
