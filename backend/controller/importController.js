import Prestataire from '../models/prestataireModel.js';

import Utilisateur from '../models/utilisateurModel.js';

import {

  loadProfileSampleForUser,

  resolveProfileAttachDecision,

} from '../services/professionalProfileIntegrityService.js';

import {

  createImportStubUtilisateur,

  resolveImportServiceCatalogForRow,

  resolveImportUtilisateurIdentity,

} from '../services/importUserIdentityService.js';



function pushConflict(results, lineNumber, decision) {

  results.conflicts.push({

    row: lineNumber,

    lineNumber,

    code: decision.code,

    message: decision.message,

  });

}



// ✅ IMPORT CSV PRESTATAIRES

export const importPrestatairesCSV = async (req, res) => {

  try {

    const { csvData, clearExisting } = req.body;



    if (clearExisting) {

      return res.status(400).json({

        success: false,

        code: 'IMPORT_CLEAR_FORBIDDEN',

        error: 'La suppression en masse via clearExisting est désactivée (DASH-8E.3A).',

      });

    }



    const existingCount = await Prestataire.countDocuments();

    console.log(`📊 Prestataires existants en base: ${existingCount}`);



    if (!csvData || !Array.isArray(csvData)) {

      return res.status(400).json({

        error: 'Données CSV invalides',

      });

    }



    const results = {

      success: 0,

      errors: [],

      duplicates: [],

      conflicts: [],

      skipped: 0,

      total: csvData.length,

      processed: 0,

    };



    const actorIsAdmin = String(req.utilisateur?.role || '').toUpperCase() === 'ADMIN';



    const batchSize = 50;

    const batches = [];

    for (let i = 0; i < csvData.length; i += batchSize) {

      batches.push(csvData.slice(i, i + batchSize));

    }



    console.log(`📦 Nombre de lots à traiter: ${batches.length}`);

    console.log(`📊 Total prestataires à importer: ${csvData.length}`);



    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {

      const batch = batches[batchIndex];

      console.log(

        `🔄 Traitement du lot ${batchIndex + 1}/${batches.length} (${batch.length} prestataires)`,

      );



      for (let rowIndex = 0; rowIndex < batch.length; rowIndex++) {

        const row = batch[rowIndex];

        const lineNumber = batchIndex * batchSize + rowIndex + 2;



        try {

          const validationErrors = validatePrestataireData(row, lineNumber);

          if (validationErrors.length > 0) {

            results.errors.push(...validationErrors);

            results.processed++;

            continue;

          }



          const catalog = await resolveImportServiceCatalogForRow(row);

          if (!catalog.ok) {

            results.errors.push({

              row: lineNumber,

              lineNumber,

              code: catalog.code,

              message: catalog.message,

            });

            results.processed++;

            continue;

          }



          const identity = await resolveImportUtilisateurIdentity({

            telephone: row.telephone,

            utilisateurId: row.utilisateurId,

            actorIsAdmin,

          });



          if (identity.action === 'reject') {

            pushConflict(results, lineNumber, identity);

            results.processed++;

            continue;

          }



          let utilisateur;

          if (identity.action === 'attach') {

            utilisateur = await Utilisateur.findById(identity.utilisateurId);

            if (!utilisateur) {

              pushConflict(results, lineNumber, {

                code: 'IMPORT_IDENTITY_REVIEW_REQUIRED',

                message: 'Compte cible introuvable.',

              });

              results.processed++;

              continue;

            }

            const sample = await loadProfileSampleForUser(utilisateur._id, 'prestataire');

            const decision = resolveProfileAttachDecision(sample, {});

            if (decision.action === 'reject') {

              results.conflicts.push({

                row: lineNumber,

                lineNumber,

                code: decision.code,

                message: decision.message,

              });

              results.processed++;

              continue;

            }

          } else {

            utilisateur = await createImportStubUtilisateur({

              nom: row.nom,

              telephone: identity.telephone,

            });

          }



          const prestataire = new Prestataire({

            utilisateur: utilisateur._id,

            service: catalog.service._id,

            prixprestataire: 0,

            localisation: `${row.ville}, ${row.quartier}`,

            localisationmaps: {

              latitude: parseFloat(row.latitude),

              longitude: parseFloat(row.longitude),

            },

            note: 0,

            verifier: false,

            status: 'incomplete',

            source: 'dashboard',

            specialite: [row.metier],

            anneeExperience: '0',

            description: `Prestataire ${row.metier} à ${row.ville}`,

            rayonIntervention: 10,

            zoneIntervention: [row.ville, row.quartier],

            tarifHoraireMin: 0,

            tarifHoraireMax: 0,

            nbMission: 0,

            revenus: 0,

            clients: [],

          });



          prestataire.syncFinalizationFromDocuments();

          const savedPrestataire = await prestataire.save();

          if (savedPrestataire._id) {

            console.log(`✅ Prestataire sauvegardé: ${row.nom} (ID: ${savedPrestataire._id})`);

            results.success++;

          } else {

            results.errors.push(`Ligne ${lineNumber}: Échec sauvegarde`);

          }

        } catch (error) {

          console.error(`❌ Erreur ligne ${lineNumber}:`, error);

          results.errors.push(`Ligne ${lineNumber}: ${error.message}`);

        }



        results.processed++;

      }



      console.log(

        `✅ Lot ${batchIndex + 1}/${batches.length} terminé: ${results.success} succès jusqu'à présent`,

      );

    }



    console.log(`📊 Import CSV terminé: ${results.success}/${results.total} succès`);

    console.log(`❌ Erreurs: ${results.errors.length}`);

    console.log(`⚠️ Doublons: ${results.duplicates.length}`);



    const totalPrestataires = await Prestataire.countDocuments();

    console.log(`📊 Total prestataires en base: ${totalPrestataires}`);



    res.json({

      message: 'Import CSV terminé',

      results: {

        success: results.success,

        errors: results.errors,

        duplicates: results.duplicates,

        conflicts: results.conflicts,

        skipped: results.skipped,

        total: results.total,

        processed: results.processed,

        successRate: `${Math.round((results.success / results.total) * 100)}%`,

      },

    });

  } catch (error) {

    console.error('Erreur import CSV:', error);

    res.status(500).json({

      error: 'Erreur lors de l\'import CSV',

      details: error.message,

    });

  }

};



const validatePrestataireData = (row, lineNumber) => {

  const errors = [];



  if (!row.nom || !row.nom.trim()) {

    row.nom = `Prestataire ${lineNumber}`;

  }



  if (!row.telephone || !row.telephone.trim()) {

    row.telephone = `Non renseigné`;

  }



  if (!row.metier || !row.metier.trim()) {

    row.metier = `Service général`;

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



export const getImportStats = async (req, res) => {

  try {

    const stats = {

      totalPrestataires: await Prestataire.countDocuments(),

      totalUtilisateurs: await Utilisateur.countDocuments(),

      prestatairesParVille: await Prestataire.aggregate([

        { $group: { _id: '$localisation', count: { $sum: 1 } } },

        { $sort: { count: -1 } },

        { $limit: 10 },

      ]),

      prestatairesParMetier: await Prestataire.aggregate([

        { $group: { _id: '$specialite', count: { $sum: 1 } } },

        { $sort: { count: -1 } },

        { $limit: 10 },

      ]),

      statutsPrestataires: await Prestataire.aggregate([

        { $group: { _id: '$verifier', count: { $sum: 1 } } },

      ]),

    };



    res.json(stats);

  } catch (error) {

    console.error('Erreur stats import:', error);

    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });

  }

};



export const clearImportCache = async (req, res) => {

  try {

    res.json({ message: 'Cache d\'import vidé avec succès' });

  } catch (error) {

    console.error('Erreur vidage cache:', error);

    res.status(500).json({ error: 'Erreur lors du vidage du cache' });

  }

};


