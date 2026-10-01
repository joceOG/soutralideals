# Runbook d'application — Migration catalogue Métiers

> Répertoire de travail : `soutralideals/backend/`  
> Aucune des commandes ci-dessous n'est à exécuter à l'avance.  
> Exécuter dans l'ordre, vérifier le code de sortie à chaque étape.

---

## État de référence (dry-run du 2026-09-30)

| Indicateur | Valeur |
|---|---|
| `runId` | `run_1790799974068` |
| `planned` | **98** |
| `skipped` | **6** (intentionnels : n°28, 31, 32, 46, 47, 48) |
| `failed` | 0 |
| `applied` | 0 (Atlas non modifié) |

Détail des 98 opérations :

| Type | n |
|---|---|
| `category-add` | 2 |
| `category-trim` | 1 |
| `rename` | 32 |
| `vocab` | 13 |
| `shortcut` | 6 |
| `add` | 44 |

Empreintes des fichiers de comportement (calculées après correction du moteur) :

| Fichier | SHA-256 |
|---|---|
| `catalog/metiersCatalogPlan.js` | `78f054321f94368cc7d1cc2268b4a7e4c33c2d5f8865e1cfa1eff7b8a248f4a8` |
| `catalog/runMetiersCatalogMigration.js` | `a443a0fd5807b9fd104122a4a52b7a72b693ec7fbb5353595b734faf7b550ae9` |
| `utils/catalogText.js` | `4edcae3440a43f21e1ae9907c5aa657c9a3cf6b5caf24759ea704a183a97beeb` |

`manifestHash` (contenu déterministe du manifeste) :  
`8f7078c8726ee6e37728556d6c72cdba1aa9b2937b25df04773de6300c80350a`

---

## Étape 0 — Détection de dérive (obligatoire avant apply)

Vérifie que le plan n'a pas changé et que la base est dans l'état attendu.

```powershell
# Depuis soutralideals/backend/

# 0a. Vérifier les empreintes des fichiers de comportement
$hashes = @{
    'catalog/metiersCatalogPlan.js'       = '78f054321f94368cc7d1cc2268b4a7e4c33c2d5f8865e1cfa1eff7b8a248f4a8'
    'catalog/runMetiersCatalogMigration.js' = 'a443a0fd5807b9fd104122a4a52b7a72b693ec7fbb5353595b734faf7b550ae9'
    'utils/catalogText.js'                = '4edcae3440a43f21e1ae9907c5aa657c9a3cf6b5caf24759ea704a183a97beeb'
}
$drift = $false
foreach ($file in $hashes.Keys) {
    $actual = (Get-FileHash $file -Algorithm SHA256).Hash.ToLower()
    if ($actual -ne $hashes[$file]) {
        Write-Error "DÉRIVE : $file`n  attendu : $($hashes[$file])`n  actuel  : $actual"
        $drift = $true
    } else {
        Write-Host "OK : $file"
    }
}
if ($drift) { Write-Error "Arrêt — fichiers de comportement modifiés."; exit 1 }
```

```powershell
# 0b. Générer un nouveau manifeste depuis la base courante
npm run catalog:manifest
if ($LASTEXITCODE -ne 0) { Write-Error "catalog:manifest a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
```

```powershell
# 0c. Vérifier les préconditions (valeurs avant/après dans la base)
npm run catalog:check
if ($LASTEXITCODE -ne 0) { Write-Error "catalog:check a échoué — dérives détectées (code $LASTEXITCODE)"; exit $LASTEXITCODE }
```

```powershell
# 0d. Dry-run de confirmation — comparer planned=98, skipped=6
npm run migrate:metiers-catalog
if ($LASTEXITCODE -ne 0) { Write-Error "Dry-run a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
# Vérifier manuellement dans la sortie JSON : "planned": 98, "skipped": 6, "failed": 0
```

> Si `planned` diffère de 98 ou si `catalog:check` renvoie des dérives, **ne pas continuer**.  
> La base a évolué depuis le dry-run de référence.

---

## Étape 1 — Sauvegarde avant apply

### Option A — mongodump (recommandé)

`mongodump` n'est pas encore installé sur ce poste.  
Installation : <https://www.mongodb.com/try/download/database-tools>

Une fois installé, remplacer `[URI]` par la valeur de `MONGO_URL` depuis `.env`
(**ne pas copier l'URI dans le terminal** : utiliser la variable d'environnement) :

```powershell
# Collections touchées : groupes, categories, services
$ts = Get-Date -Format "yyyyMMdd-HHmm"
$outDir = "catalog\backup-mongodump-$ts"

# L'URI est lue depuis l'environnement — jamais affichée ni journalisée
$env:_BACKUP_URI = (Get-Content .env | Select-String '^MONGO_URL=').ToString().Split('=',2)[1]

mongodump --uri=$env:_BACKUP_URI --collection=groupes    --out=$outDir
mongodump --uri=$env:_BACKUP_URI --collection=categories --out=$outDir
mongodump --uri=$env:_BACKUP_URI --collection=services   --out=$outDir

Remove-Item Env:_BACKUP_URI   # retirer l'URI de l'environnement immédiatement
if ($LASTEXITCODE -ne 0) { Write-Error "mongodump a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
Write-Host "Sauvegarde BSON dans : $outDir"
```

> **Cluster identifié** : MongoDB 8.0.34, ReplicaSet 3 nœuds AWS us-east-1.  
> **Tier Atlas : NON DÉTERMINÉ par connexion database.**  
> Le refus de `serverStatus` retourne `AtlasError`, ce qui indique des restrictions de rôle mais ne détermine pas le tier (M0, M2, M5, Flex et M10+ restreignent tous certaines commandes selon le rôle de l'utilisateur DB). Commandes confirmées disponibles : `buildInfo`, `atlasVersion` (v20260819.0.0.1786753856), `currentOp`, `dbStats`. Commandes bloquées : `serverStatus`, `hostInfo`, `getCmdLineOpts`.  
> **Pour connaître le tier réel** : ouvrir le dashboard Atlas sur console.mongodb.com → votre projet → cluster `cluster0` → onglet Overview.  
> Les snapshots à la demande depuis le dashboard sont disponibles uniquement sur M10+ (dedicated). Sur M0, M2, M5 et Flex, seule la sauvegarde automatique est disponible — sans déclenchement manuel.

### Option B — export JSON (fallback si mongodump non disponible)

```powershell
# ATTENTION : export JSON seulement, sans index ni métadonnées BSON.
# PAS une sauvegarde complète. Utiliser uniquement en attente de mongodump.
npm run catalog:backup
if ($LASTEXITCODE -ne 0) { Write-Error "catalog:backup a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
# Dossier créé : catalog/backup-YYYY-MM-DDTHH-MM/
```

### Vérification de la sauvegarde

```powershell
# Option A — vérifier que les collections BSON sont présentes et non vides
Get-ChildItem $outDir -Recurse -Filter "*.bson" | Select-Object Name, Length

# Option B — restaurer sur une base locale isolée et vérifier les comptages
# Configurer une variable MONGO_URL_LOCAL pointant vers une base locale
# (jamais vers Atlas)
$env:MONGO_URL = "mongodb://localhost:27017/soutralideals_verify"
node catalog/pre-apply-backup.js --restore catalog/backup-YYYY-MM-DDTHH-MM
$env:MONGO_URL = ""   # remettre la variable originale depuis .env après vérification
```

---

## Étape 2 — Application

```powershell
# La variable d'autorisation est limitée à l'exécution immédiate,
# puis retirée qu'il y ait succès ou échec.
$env:SDEALS_ALLOW_CATALOG_MIGRATE = '1'
node scripts/migrate-metiers-catalog.js --apply
$applyExit = $LASTEXITCODE
Remove-Item Env:SDEALS_ALLOW_CATALOG_MIGRATE
if ($applyExit -ne 0) { Write-Error "Apply a échoué (code $applyExit)"; exit $applyExit }
Write-Host "Apply terminé avec succès."
```

> La sortie JSON contient `"applied": 98`, `"failed": []`, `"createdIds"` (46 IDs nouveaux : 2 catégories + 44 services).

---

## Étape 3 — Vérifications post-apply

```powershell
# Vérification complète : catégories, raccourcis, catalogKeys, recherche, idempotence
node catalog/verify-post-apply.js
if ($LASTEXITCODE -ne 0) { Write-Error "verify-post-apply a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
```

```powershell
# Vérification HTTP réelle des deux routes exposées aux clients
node catalog/verify-http-post-apply.js
if ($LASTEXITCODE -ne 0) { Write-Error "verify-http-post-apply a échoué (code $LASTEXITCODE)"; exit $LASTEXITCODE }
```

> Baseline pré-apply confirmée : ces mêmes commandes peuvent être lancées avec `--pre-apply` pour valider la structure des routes avant migration (11 checks structuraux, 7 checks de contenu ignorés).

Ce script vérifie notamment :

| Contrôle | Valeur attendue |
|---|---|
| Catégories Métiers | ≥ 12 (10 + 2 nouvelles) |
| `Jardinage & Espaces verts` présente | oui, rattachée au groupe Métiers |
| `Événementiel & Animation` présente | oui, rattachée au groupe Métiers |
| `Beauté & Soins` sans espace initial | oui |
| Raccourcis `shortcutRank` 1–6 | 6 services aux IDs attendus |
| Services avec `catalogKey` | ≥ 44 |
| `GET /api/search/global?query=fuite+d%27eau&scope=metiers` | Plombier dans `results.services`, `matchKind` = need |
| Dry-run post-apply `planned` | **0 exactement** |
| Dry-run post-apply `noops` | **98 exactement** (2+1+32+13+6+44) |
| Dry-run post-apply `skipped` | **6 exactement** |
| Dry-run post-apply `failed` | 0 |

---

## Étape 4 — Retour arrière partiel (si nécessaire)

> Exécuter **uniquement** si l'Étape 3 révèle un problème non récupérable autrement.  
> Les services et catégories créés (46 documents) sont conservés après rollback.

```powershell
$env:SDEALS_ALLOW_CATALOG_MIGRATE = '1'
node scripts/migrate-metiers-catalog.js --rollback
$rbExit = $LASTEXITCODE
Remove-Item Env:SDEALS_ALLOW_CATALOG_MIGRATE
if ($rbExit -ne 0) { Write-Error "Rollback a échoué (code $rbExit)"; exit $rbExit }
Write-Host "Rollback partiel terminé. Vérifier les conflits dans la sortie JSON."
```

> `--rollback` restaure les champs `before` de chaque opération appliquée.  
> Si un champ a été modifié après la migration (conflit), il est signalé mais non écrasé.  
> Les créations (`type: add`, `type: category-add`) restent en base — suppression manuelle si nécessaire.

---

## Récapitulatif des scripts npm disponibles

```powershell
npm run migrate:metiers-catalog          # dry-run
npm run migrate:metiers-catalog:apply    # NE PAS UTILISER directement — voir Étape 2
npm run catalog:manifest                 # génère le manifeste déterministe
npm run catalog:check                    # vérifie préconditions Atlas
npm run catalog:backup                   # export JSON fallback (non mongodump)
npm run catalog:verify                   # vérifications post-apply (moteur direct)
npm run catalog:verify-http              # vérifications post-apply (HTTP réel)
npm run catalog:verify-http:pre          # baseline pré-apply (structurel uniquement)
```

> `migrate:metiers-catalog:apply` n'est pas utilisé directement dans ce runbook
> car il ne positionne pas `SDEALS_ALLOW_CATALOG_MIGRATE`.
> L'Étape 2 gère la variable explicitement et la retire immédiatement.
