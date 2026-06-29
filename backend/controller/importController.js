import Prestataire from '../models/prestataireModel.js';
import Utilisateur from '../models/utilisateurModel.js';
import Service from '../models/serviceModel.js';
import Categorie from '../models/categorieModel.js';
import Groupe from '../models/groupeModel.js';
import { validationResult } from 'express-validator';

// ✅ IMPORT CSV PRESTATAIRES
export const importPrestatairesCSV = async (req, res) => {
  try {
    const { csvData, clearExisting } = req.body;
    
    // Option pour nettoyer les données existantes
    if (clearExisting) {
      console.log('🧹 Nettoyage des données existantes...');
      await Prestataire.deleteMany({});
      await Utilisateur.deleteMany({ role: 'Prestataire' });
      console.log('✅ Nettoyage terminé');
    }
    
    // Log du nombre de prestataires existants
    const existingCount = await Prestataire.countDocuments();
    console.log(`📊 Prestataires existants en base: ${existingCount}`);
    
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ 
        error: 'Données CSV invalides' 
      });
    }

    const results = {
      success: 0,
      errors: [],
      duplicates: [],
      total: csvData.length,
      processed: 0
    };

    // Traitement par lots de 50
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < csvData.length; i += batchSize) {
      batches.push(csvData.slice(i, i + batchSize));
    }

    console.log(`📦 Nombre de lots à traiter: ${batches.length}`);
    console.log(`📊 Total prestataires à importer: ${csvData.length}`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Traitement du lot ${batchIndex + 1}/${batches.length} (${batch.length} prestataires)`);
      
      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {
        const row = batch[rowIndex];
        const lineNumber = (batchIndex * batchSize) + rowIndex + 2; // +2 car index 0 = ligne 2
        
        try {
          // Validation des données
          const validationErrors = validatePrestataireData(row, lineNumber);
          if (validationErrors.length > 0) {
            results.errors.push(...validationErrors);
            continue;
          }

          // ✅ Vérification des doublons CORRIGÉE
          // D'abord vérifier avec le téléphone original
          if (row.telephone && row.telephone !== 'Non renseigné') {
            const existingUser = await Utilisateur.findOne({ telephone: row.telephone });
            if (existingUser) {
              results.duplicates.push({
                ...row,
                lineNumber,
                reason: 'Téléphone déjà utilisé'
              });
              continue;
            }
          }
          
          // Générer le téléphone unique APRÈS la vérification
          const telephoneUnique = row.telephone === 'Non renseigné' || !row.telephone 
            ? `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` 
            : row.telephone;

          // Création de l'utilisateur (telephoneUnique déjà défini plus haut)
            
          const utilisateur = new Utilisateur({
            nom: row.nom,
            prenom: '', // Pas de prénom dans le CSV
            telephone: telephoneUnique,
            email: `prestataire.${telephoneUnique.toString().replace(/[^a-zA-Z0-9]/g, '')}@soutralideals.com`, // Email généré automatiquement
            password: 'temp_password_' + Date.now(), // Mot de passe temporaire
            role: 'Prestataire',
            verifie: false,
            statut: 'En attente de validation'
          });

          await utilisateur.save();

          // Rattacher les imports au groupe Métiers (plus de « Services Généraux »)
          const groupe = await Groupe.findOne({ nomgroupe: 'Métiers' });
          if (!groupe) {
            results.errors.push(`Ligne ${lineNumber}: groupe « Métiers » introuvable — créez-le avant l'import.`);
            continue;
          }

          const IMPORT_CAT_NAME = 'Import CSV';
          let categorie = await Categorie.findOne({
            nomcategorie: IMPORT_CAT_NAME,
            groupe: groupe._id,
          });
          if (!categorie) {
            categorie = new Categorie({
              nomcategorie: IMPORT_CAT_NAME,
              imagecategorie: 'https://via.placeholder.com/300x200?text=Import+CSV',
              groupe: groupe._id,
            });
            await categorie.save();
          }

          let service = await Service.findOne({
            nomservice: row.metier,
            categorie: categorie._id,
          });
          if (!service) {
            service = new Service({
              nomservice: row.metier,
              imageservice: 'https://via.placeholder.com/300x200?text=Service',
              prixmoyen: '0',
              categorie: categorie._id,
            });
            await service.save();
          }

          // Création du prestataire avec le modèle existant
          const prestataire = new Prestataire({
            utilisateur: utilisateur._id,
<<<<<<< HEAD
<<<<<<< HEAD
            service: service._id,
            prixprestataire: 0,
=======
            service: service._id, // ✅ Service valide
            prixprestataire: 0, // À définir par l'utilisateur
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            service: service._id,
            prixprestataire: 0,
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
            localisation: `${row.ville}, ${row.quartier}`,
            localisationmaps: {
              latitude: parseFloat(row.latitude),
              longitude: parseFloat(row.longitude)
            },
<<<<<<< HEAD
<<<<<<< HEAD
            note: 0,
            verifier: false,
            status: 'incomplete',
            source: 'dashboard',
            specialite: [row.metier],
            anneeExperience: '0',
            description: `Prestataire ${row.metier} à ${row.ville}`,
            rayonIntervention: 10,
=======
            note: `Prestataire ${row.metier} importé via CSV`,
=======
            note: 0,
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
            verifier: false,
            status: 'incomplete',
            source: 'dashboard',
            specialite: [row.metier],
            anneeExperience: '0',
            description: `Prestataire ${row.metier} à ${row.ville}`,
<<<<<<< HEAD
            rayonIntervention: 10, // 10km par défaut
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            rayonIntervention: 10,
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
            zoneIntervention: [row.ville, row.quartier],
            tarifHoraireMin: 0,
            tarifHoraireMax: 0,
            nbMission: 0,
            revenus: 0,
            clients: []
          });

<<<<<<< HEAD
<<<<<<< HEAD
          prestataire.syncFinalizationFromDocuments();
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
          prestataire.syncFinalizationFromDocuments();
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
          const savedPrestataire = await prestataire.save();
          if (savedPrestataire._id) {
            console.log(`✅ Prestataire sauvegardé: ${row.nom} (ID: ${savedPrestataire._id})`);
            results.success++;
          } else {
            console.error(`❌ Échec sauvegarde: ${row.nom}`);
            results.errors.push(`Ligne ${lineNumber}: Échec sauvegarde`);
          }
          
        } catch (error) {
          console.error(`❌ Erreur ligne ${lineNumber}:`, error);
          results.errors.push(`Ligne ${lineNumber}: ${error.message}`);
        }
        
        results.processed++;
      }
      
      // Log de fin de lot
      console.log(`✅ Lot ${batchIndex + 1}/${batches.length} terminé: ${results.success} succès jusqu'à présent`);
    }

    // Log des résultats
    console.log(`📊 Import CSV terminé: ${results.success}/${results.total} succès`);
    console.log(`❌ Erreurs: ${results.errors.length}`);
    console.log(`⚠️ Doublons: ${results.duplicates.length}`);
    
    // Vérification en base de données
    const totalPrestataires = await Prestataire.countDocuments();
    console.log(`📊 Total prestataires en base: ${totalPrestataires}`);

    res.json({
      message: 'Import CSV terminé',
      results: {
        success: results.success,
        errors: results.errors,
        duplicates: results.duplicates,
        total: results.total,
        processed: results.processed,
        successRate: `${Math.round((results.success / results.total) * 100)}%`
      }
    });

  } catch (error) {
    console.error('Erreur import CSV:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'import CSV',
      details: error.message 
    });
  }
};

// ✅ VALIDATION DES DONNÉES PRESTATAIRE (ADOUCIE)
const validatePrestataireData = (row, lineNumber) => {
  const errors = [];
  
  // ✅ Validation adoucie - champs optionnels
  if (!row.nom || !row.nom.trim()) {
    row.nom = `Prestataire ${lineNumber}`; // Valeur par défaut
  }
  
  if (!row.telephone || !row.telephone.trim()) {
    row.telephone = `Non renseigné`; // Valeur par défaut
  }
  
  if (!row.metier || !row.metier.trim()) {
    row.metier = `Service général`; // Valeur par défaut
  }
  
  if (!row.latitude || isNaN(parseFloat(row.latitude))) {
    errors.push(`Ligne ${lineNumber}: Latitude invalide`);
  }
  
  if (!row.longitude || isNaN(parseFloat(row.longitude))) {
    errors.push(`Ligne ${lineNumber}: Longitude invalide`);
  }
  
  if (!row.ville || !row.ville.trim()) {
    errors.push(`Ligne ${lineNumber}: Ville manquante`);
  }
  
  // Validation des coordonnées GPS
  const lat = parseFloat(row.latitude);
  const lng = parseFloat(row.longitude);
  
  if (lat < -90 || lat > 90) {
    errors.push(`Ligne ${lineNumber}: Latitude hors limites (-90 à 90)`);
  }
  
  if (lng < -180 || lng > 180) {
    errors.push(`Ligne ${lineNumber}: Longitude hors limites (-180 à 180)`);
  }
  
  return errors;
};

// ✅ STATISTIQUES D'IMPORT
export const getImportStats = async (req, res) => {
  try {
    const stats = {
      totalPrestataires: await Prestataire.countDocuments(),
      totalUtilisateurs: await Utilisateur.countDocuments(),
      prestatairesParVille: await Prestataire.aggregate([
        { $group: { _id: '$localisation', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      prestatairesParMetier: await Prestataire.aggregate([
        { $group: { _id: '$specialite', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      statutsPrestataires: await Prestataire.aggregate([
        { $group: { _id: '$verifier', count: { $sum: 1 } } }
      ])
    };

    res.json(stats);
  } catch (error) {
    console.error('Erreur stats import:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
};

// ✅ VIDER LE CACHE D'IMPORT
export const clearImportCache = async (req, res) => {
  try {
    // Ici on pourrait vider un cache Redis si on en avait un
    // Pour l'instant, on retourne juste un succès
    res.json({ message: 'Cache d\'import vidé avec succès' });
  } catch (error) {
    console.error('Erreur vidage cache:', error);
    res.status(500).json({ error: 'Erreur lors du vidage du cache' });
  }
};