# Test Plan: Public Menu (Phase 4)

Ce document décrit les tests manuels pour valider le menu public premium.

## Prérequis

1. **Serveur de dev démarré** : `npm run dev`
2. **Tenant existant** avec slug (ex: `demo`)
3. **Menu actif** avec catégories et items créés via le backoffice

## Configuration hosts (dev local)

Pour tester les sous-domaines en local, ajouter dans `C:\Windows\System32\drivers\etc\hosts` :

```
127.0.0.1 demo.localhost
127.0.0.1 test.localhost
```

Accès: `http://demo.localhost:3000/`

---

## Tests Fonctionnels

### 1. Affichage du menu public

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 1.1 | Accéder à `http://{tenant}.localhost:3000/` | Page menu public affichée |
| 1.2 | Vérifier le header | Logo/initiale + nom du restaurant centré |
| 1.3 | Vérifier le footer | "Menu propulsé par RQ Menu" |
| 1.4 | Vérifier les catégories | Sections avec titres et descriptions |
| 1.5 | Vérifier les items | Cards avec nom, description, prix, image |

### 2. Navigation par catégories

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 2.1 | Observer les chips de catégories | Barre horizontale scrollable sous la recherche |
| 2.2 | Scroller vers le bas | La barre de catégories reste sticky (collée en haut) |
| 2.3 | Cliquer sur une catégorie | Scroll fluide vers la section correspondante |
| 2.4 | Scroller manuellement | La catégorie active se met à jour automatiquement |
| 2.5 | Vérifier le style actif | Chip actif en couleur primary, autres en muted |

### 3. Recherche

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 3.1 | Taper dans la barre de recherche | Filtrage instantané des items |
| 3.2 | Rechercher un nom d'item existant | Seuls les items correspondants sont affichés |
| 3.3 | Rechercher dans la description | Items avec description correspondante affichés |
| 3.4 | Rechercher terme inexistant | Message "Aucun résultat" + bouton effacer |
| 3.5 | Cliquer sur X ou "Effacer" | Recherche vidée, menu complet restauré |
| 3.6 | Vérifier le compteur | "X résultat(s)" affiché sous la barre |

### 4. Disponibilité des items

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 4.1 | Créer un item avec `isAvailable: false` | - |
| 4.2 | Voir l'item sur le menu public | Opacité réduite (60%) + badge "Indisponible" |
| 4.3 | Vérifier que l'item reste visible | Il ne disparaît pas, juste grisé |

### 5. Badges diététiques

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 5.1 | Item végétarien | Badge vert "Végétarien" avec icône feuille |
| 5.2 | Item végan | Badge vert "Végan" avec icône feuille |
| 5.3 | Item sans gluten | Badge outline "Sans gluten" avec icône blé |
| 5.4 | Mobile (< 640px) | Badges abrégés : "Végé", "SG" |

### 6. Images

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 6.1 | Item avec imageUrl valide | Image affichée avec lazy loading |
| 6.2 | Item sans imageUrl | Placeholder avec icône "image off" |
| 6.3 | Item avec imageUrl cassée | Fallback vers placeholder |

### 7. États vides

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 7.1 | Tenant sans menu actif | Message "Menu en préparation" |
| 7.2 | Menu sans catégories visibles | Message "Menu vide" |
| 7.3 | Tenant inexistant | Page 404 avec message et bouton retour |

### 8. Responsive (Mobile-first)

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 8.1 | Tester sur viewport 375px | Layout adapté, cards empilées |
| 8.2 | Tester sur viewport 768px | Layout toujours single-column (max-w-2xl) |
| 8.3 | Vérifier touch scroll | Navigation catégories scrollable au doigt |
| 8.4 | Vérifier les tailles de police | Texte lisible sur mobile |

### 9. Accessibilité

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 9.1 | Navigation clavier | Focus visible sur chips et boutons |
| 9.2 | Labels ARIA | `aria-label` sur recherche, `aria-current` sur chip actif |
| 9.3 | Structure headings | h1 dans header, h2 pour catégories, h3 pour items |
| 9.4 | Contraste couleurs | Texte lisible sur tous les fonds |

### 10. Performance

| # | Étape | Résultat attendu |
|---|-------|------------------|
| 10.1 | Vérifier SSR | Contenu visible sans JS (view-source) |
| 10.2 | Vérifier Suspense | Skeleton affiché pendant chargement |
| 10.3 | Vérifier lazy loading images | Images chargées au scroll |
| 10.4 | Pas de re-fetch client | Données passées du serveur au client |

---

## Scénario de test complet

### Setup (Backoffice)

1. Se connecter au backoffice : `http://localhost:3000/app/login`
2. Créer un menu "Menu Principal" (actif)
3. Créer des catégories :
   - "Entrées" (visible)
   - "Plats" (visible)
   - "Desserts" (visible)
4. Créer des items dans chaque catégorie :
   - Entrée 1 : "Salade César" - 12.50$ - disponible - végétarien
   - Entrée 2 : "Soupe du jour" - 8.00$ - indisponible
   - Plat 1 : "Burger Maison" - 18.00$ - disponible
   - Plat 2 : "Pâtes Bolognaise" - 16.50$ - disponible - sans gluten
   - Dessert 1 : "Tiramisu" - 9.00$ - disponible - végétarien
   - Dessert 2 : "Fruits frais" - 7.00$ - disponible - végan

### Validation (Menu public)

1. Accéder à `http://{tenant}.localhost:3000/`
2. Vérifier que toutes les catégories apparaissent
3. Vérifier que les items sont correctement formatés
4. Tester la recherche "salade" → 1 résultat
5. Tester la navigation sticky en scrollant
6. Vérifier que "Soupe du jour" est grisée
7. Vérifier les badges végétarien/végan

---

## Checklist finale

- [ ] Menu public accessible via sous-domaine
- [ ] Header avec nom du restaurant
- [ ] Barre de recherche fonctionnelle
- [ ] Navigation sticky par catégories
- [ ] Scroll fluide vers les sections
- [ ] Items indisponibles grisés avec badge
- [ ] Badges diététiques affichés
- [ ] Images avec lazy loading et fallback
- [ ] États vides premium
- [ ] Page 404 pour tenant inexistant
- [ ] Responsive mobile-first
- [ ] Pas d'erreurs dans la console
- [ ] Build sans erreurs lint
