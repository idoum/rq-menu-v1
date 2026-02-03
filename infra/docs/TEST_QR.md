# Test QR Codes & Zones

Ce document décrit comment tester les fonctionnalités de zones et QR codes.

## Prérequis

1. Application lancée en mode dev : `npm run dev`
2. Un tenant existant (ex: "pizza")
3. Être connecté au backoffice

## Test 1: Créer une Zone

### Étapes

1. Naviguer vers `/app/zones`
2. Cliquer sur "Nouvelle zone"
3. Remplir le formulaire :
   - **Nom** : "Terrasse"
   - **Description** (optionnel) : "Zone extérieure"
4. Cliquer sur "Créer"

### Résultat attendu

- Toast de succès "Zone créée"
- Redirection vers `/app/zones`
- La zone "Terrasse" apparaît dans la liste
- Un slug est généré automatiquement : "terrasse"

## Test 2: Créer un QR Code

### Étapes

1. Naviguer vers `/app/qrcodes`
2. Cliquer sur "Nouveau QR code"
3. Remplir le formulaire :
   - **Label** : "Table 12"
   - **Zone** (optionnel) : sélectionner "Terrasse"
   - **Numéro de table** (optionnel) : "12"
4. Cliquer sur "Créer"

### Résultat attendu

- Toast de succès "QR code créé"
- Redirection vers `/app/qrcodes`
- Le QR code "Table 12" apparaît dans le tableau

## Test 3: Télécharger QR Code en PNG

### Étapes

1. Sur la page `/app/qrcodes`
2. Cliquer sur le menu "..." du QR code "Table 12"
3. Cliquer sur "Télécharger PNG"

### Résultat attendu

- Un fichier `qr-Table-12.png` est téléchargé
- Le fichier contient un QR code valide de 400x400 pixels
- Scanner le QR code ouvre l'URL du menu public avec les paramètres zone/table

## Test 4: Télécharger QR Code en SVG

### Étapes

1. Sur la page `/app/qrcodes`
2. Cliquer sur le menu "..." du QR code "Table 12"
3. Cliquer sur "Télécharger SVG"

### Résultat attendu

- Un fichier `qr-Table-12.svg` est téléchargé
- Le fichier est un SVG vectoriel valide
- Le SVG peut être ouvert dans un éditeur d'images pour impression haute qualité

## Test 5: Prévisualiser le QR Code

### Étapes

1. Sur la page `/app/qrcodes`
2. Cliquer sur le menu "..." du QR code
3. Cliquer sur "Voir le QR code"

### Résultat attendu

- Un dialog s'ouvre avec :
  - L'aperçu du QR code
  - L'URL encodée affichée
  - Boutons de téléchargement PNG et SVG

## Test 6: Ouvrir l'URL encodée

### Étapes

1. Scanner le QR code téléchargé OU
2. Copier l'URL affichée dans le dialog de prévisualisation
3. Ouvrir dans un navigateur

### URL attendue (dev)

```
http://pizza.saasresto.localhost:3000/?zone=terrasse&table=12
```

### URL attendue (prod)

```
https://pizza.saasresto.isprojets.cloud/?zone=terrasse&table=12
```

### Résultat attendu

- Le menu public du tenant s'affiche
- Les paramètres `zone` et `table` sont passés à la page
- (Optionnel) Un indicateur de zone peut s'afficher

## Test 7: API directe pour images

### PNG

```bash
curl -H "Cookie: session=xxx" \
  "http://localhost:3000/api/app/qrcodes/{id}/image?format=png&size=400" \
  -o qr.png
```

### SVG

```bash
curl -H "Cookie: session=xxx" \
  "http://localhost:3000/api/app/qrcodes/{id}/image?format=svg&size=400" \
  -o qr.svg
```

### Paramètres

| Param   | Valeurs          | Défaut |
|---------|------------------|--------|
| format  | `png`, `svg`     | `png`  |
| size    | 100-1000 (px)    | 400    |

## Test 8: Modifier/Supprimer une Zone

### Modifier

1. Sur `/app/zones`, cliquer "..." > "Modifier"
2. Changer le nom
3. Sauvegarder

### Supprimer

1. Sur `/app/zones`, cliquer "..." > "Supprimer"
2. Confirmer la suppression

**Note** : Supprimer une zone ne supprime pas les QR codes associés, mais leur zone devient "Aucune zone".

## Test 9: Activer/Désactiver un QR Code

### Étapes

1. Sur `/app/qrcodes`, cliquer "..." > "Désactiver"
2. Le badge passe de "Actif" à "Inactif"
3. Cliquer "..." > "Activer" pour réactiver

**Note** : La désactivation est cosmétique pour le MVP. Le QR code reste scannable.

## Validation complète

| Fonctionnalité | Statut |
|----------------|--------|
| Créer zone | ☐ |
| Modifier zone | ☐ |
| Supprimer zone | ☐ |
| Créer QR code | ☐ |
| Modifier QR code | ☐ |
| Supprimer QR code | ☐ |
| Télécharger PNG | ☐ |
| Télécharger SVG | ☐ |
| Prévisualiser | ☐ |
| URL dev correcte | ☐ |
| Menu public charge | ☐ |
