# Catalogue Métiers — lot de finalisation (Atlas non appliqué)

**Verdict : plan prêt à être soumis pour application.** Atlas n’a pas été modifié. Les cas `A_REVOIR` sont exclus du script automatique.

Tableaux détaillés : `catalog/metiers-decisions-200.json`, `catalog/metiers-proposals-50.json`.

---

## 1. Corrections de code et de plan

- Décorateur : nom et ID conservés, classé `A_REVOIR` (pas de renommage événementiel).
- CCTV : pas de renommage automatique.
- Professeur particulier / coach sportif : `A_REVOIR`, pas de bascule Freelance (coachs existants = B2B/carrière).
- Élagueur : spécialisation distincte dans **Jardinage & Espaces verts** (catégorie Métiers à créer). Jardinier / Paysagiste non déplacé.
- DJ / sono / MC / organisateur : **Événementiel & Animation** (pas un dump Artisanat). Musicien inchangé.
- Maître-nageur : `A_REVOIR`, catégorie **Sport & Loisirs** proposée, non créée. Pas Services à domicile.
- Dépanneur-remorqueur : `A_REVOIR` (chevauchement avec Depanneur).
- Moteur `runMetiersCatalogMigration.js` : match nom actuel **ou** proposé **ou** alias ; écriture seulement si changement ; merge unique aliases/needs ; pas d’unset global des rangs ; `catalogKey` pour les créations.
- Journal v2 : `applied` / `dryRuns` séparés ; un dry-run n’écrase pas un apply ; reprise par `runId`.
- `--rollback` = **retour arrière partiel** (créations conservées). Conflit si la valeur courante ≠ valeur appliquée.
- Flutter : injection API, ignore des réponses périmées, `shortcutsError` distinct d’une liste vide, raccourcis 500 ≠ écran bloqué.

## 2. Décisions 200 services et 50 propositions

**200 Métiers** (`metiers-decisions-200.json`) :

| Action | n |
|---|---|
| CONSERVER | 147 |
| RENOMMER | 28 |
| RENOMMER+RACCOURCI | 4 |
| ENRICHIR | 5 |
| ENRICHIR+RACCOURCI | 2 |
| A_REVOIR | 14 |

Les 147 CONSERVER n’ont pas d’alias inventés : statut explicite « inchangés ». Les fusions restent des propositions, sans transfert.

**50 propositions** : **44 créations** prévues (plus 2 catégories). 6 hors auto : 28, 31, 32, 46, 47, 48.

Points de recoupement :

| Proposition | Correspondance | Décision |
|---|---|---|
| Photographe événementiel | Freelance `Photographe Evenementiel` `#69d6894cddb4b1fd93b729f4` | AUTRE_UNIVERS_JUSTIFIE |
| Vidéaste événementiel | Freelance Videaste de Mariage | AUTRE_UNIVERS_JUSTIFIE |
| Menuisier aluminium | Menuisier `#69618414bff072a8b1695dcb` ; orphelin Menuiserie / Allure non rattaché | SPECIALISATION_DISTINCTE |
| Maintenance informatique | orphelin `#68d6a871…` + Freelance Informatique ; Métiers a Réparateur Ordinateur | pas d’ajout ; orphelin A_REVOIR |
| Ébénisterie / ferronnerie | orphelins distincts de Menuisier / Forgeron / Métallier | pas d’ajout, pas de fusion |
| Laveur de vitres | Laveur Auto = autre métier | AJOUTER |
| Vulgarisateur | **distinct** de Vulganisateur Métiers ; **interdit** de le renommer Vulcanisateur | A_REVOIR orphelin |

## 3. 19 services non résolus

Tous partagent `categorie` brut `68d6a41c40b8a717973dd3fd` **non nulle**. Le document Catégorie **n’existe pas**. Groupe inexistant. `GET /api/service` peuple `categorie: null`. **Hors** filtre Services généraux (`excludedByFilter: false`). Cause unique : **référence non nulle cassée**.

Aucune suppression ni réaffectation.

| serviceId | nom | refs (P/FS/Presta/Rec) | décision |
|---|---|---|---|
| 68d6a41c40b8a717973dd400 | Service général | 0/0/2/0 | A_REVOIR |
| 68d6a42040b8a717973dd417 | Boulangé | 1/0/0/0 | A_REVOIR |
| 68d6a74a8d705907be738abf | Vulgarisateur | 0/0/0/0 | A_REVOIR |
| 68d6a74b8d705907be738ac9 | TÔLIER | 0/0/0/0 | A_REVOIR |
| 68d6a74f8d705907be738ae3 | FRIGORISTE | 1/0/0/0 | A_REVOIR |
| 68d6a7528d705907be738af5 | Soudure | 0/0/0/0 | A_REVOIR |
| 68d6a7548d705907be738aff | ELEVEUR DE POULETS | 0/0/0/0 | A_REVOIR |
| 68d6a75b8d705907be738b2a | Freinage-auto | 0/0/0/0 | A_REVOIR |
| 68d6a7748d705907be738bc4 | Confection des bracelets | 0/0/0/0 | A_REVOIR |
| 68d6a7768d705907be738bce | Photographe | 1/0/0/0 | A_REVOIR |
| 68d6a77b8d705907be738bf0 | Restauration | 1/0/0/0 | A_REVOIR |
| 68d6a77c8d705907be738bfa | Boulangerie | 1/0/0/0 | A_REVOIR |
| 68d6a852490b63f4b89feec0 | Cordonnerie | 0/0/0/0 | A_REVOIR |
| 68d6a85e490b63f4b89fef0a | Ferronnerie | 0/0/0/0 | A_REVOIR |
| 68d6a862490b63f4b89fef24 | Ébénisterie | 0/0/0/0 | A_REVOIR |
| 68d6a868490b63f4b89fef46 | Menuiserie / Allure | 0/0/0/0 | A_REVOIR |
| 68d6a86b490b63f4b89fef6c | Coiffure homme | 0/0/0/0 | A_REVOIR |
| 68d6a871490b63f4b89fefb5 | MAINTENANCE INFORMATIQUE | 0/0/0/0 | A_REVOIR |
| 68d6a876490b63f4b89fefe2 | Ferronnier | 0/0/0/0 | A_REVOIR |

P = prestataires, FS = offres freelance, Presta = prestations, Rec = recensements. Aucune donnée personnelle.

Reproduit sur Mongo isolé : document brut avec ObjectId dangling → populate `null` → présent dans `GET /api/service`.

## 4. Compteurs du dry-run (plan actuel)

Sur **fixtures isolées** (pas Atlas) : créations services 44 + 2 catégories, renommages/vocab/raccourcis seulement pour les fiches seedées. Sur Atlas réel, le dry-run porterait sur les 32 renommages + 7 enrichissements + 6 raccourcis + 44 ajouts + 2 catégories + 1 trim « Beauté & Soins », orphelins inchangés.

## 5. Double application isolée

MongoMemoryServer : dry-run → apply → dry-run → apply.

- 2ᵉ apply : **0** création, **0** renommage répété, **0** alias/besoin dupliqué, rangs 1–6 stables.
- Équivalent sans `catalogKey` : pas de duplicata.
- Ambigu (deux Électricien) : skip, documents intacts.
- Échec unique `shortcutRank` : journalisé, autres ops poursuivent.
- Reprise après renommage : vocab/raccourcis matchent le nom proposé.

## 6. Retour arrière partiel

Restaure noms, alias, besoins, rangs, trim de catégorie. **Les créations (services + catégories) restent.** Conflit si un champ a été modifié après la migration (démontré sur Électricien). Distingue champ absent vs vide (`$unset` vs `$set`).

## 7. Tests exécutés

| Suite | Résultat |
|---|---|
| `metiers_catalog_plan.test.js` | 5 pass |
| `catalogText.test.js` | 7 pass |
| `catalog_metiers.integration.test.js` | 14 pass (filtre avant pagination, recherche scoped, raccourci, orphelin dangling) |
| `metiers_catalog_migration.isolated.test.js` | 8 pass |
| `flutter test test/metiers_catalog_mobile_test.dart` | 12 pass |

Parcours Flutter **sur réponses simulées** (pas une validation sur appareil) : raccourci→serviceId, catégorie→categorieId, charger plus, course de requêtes, retour/sélection conservée, Liste/Carte même état, scope Métiers, expand conserve la saisie, zéro raccourci utilisable, erreur ≠ liste vide. Query params `service` / `categorie` alignés sur le backend.

GPS : distance **indicative** ; l’UI ne promet pas un filtrage exhaustif par rayon.

## 8. Resté `A_REVOIR` (hors auto)

Services Métiers : Depanneur, Mécanique, Controlleur Technique, Installateur Reseau, Reparateur Engins, Constructeur Bassins, Location Materiel, Spécialiste Gazon, Maçon Traditionnaliste, Ferrailleur, Eleveur Ruminants, Chauffeur de véhicule électrique, **Decorateur**, **Technicien CCTV**.

Propositions : 28, 46, 47, 48.

19 orphelins (dont Vulgarisateur).

Fusions candidates : aucune appliquée.

Catégorie proposée non créée : Sport & Loisirs.

## 9. Fonctionnement avant / après migration

| | Catalogue actuel (Atlas non migré) | Après migration | Fixtures seulement |
|---|---|---|---|
| App mobile | aliases/needs/shortcutRank absents → listes vides, pas de crash | raccourcis 1–6, recherche par besoins | navigation BLoC |
| API raccourcis | tableau vide, hub utilisable | 6 raccourcis | — |
| Nouveaux métiers | absents | 44 + 2 catégories | double apply |

**Pas de données fictives** pour remplacer un catalogue incomplet.

---

Application Atlas : uniquement après revue, `SDEALS_ALLOW_CATALOG_MIGRATE=1` et `--apply`. Cette tâche n’a pas écrit sur Atlas.
