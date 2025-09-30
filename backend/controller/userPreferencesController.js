import UserPreferences from '../models/userPreferencesModel.js';
import mongoose from 'mongoose';

// ✅ CRÉER/METTRE À JOUR LES PRÉFÉRENCES D'UN UTILISATEUR
export const createOrUpdatePreferences = async (req, res) => {
  try {
    const { utilisateur } = req.body;
    
    if (!utilisateur) {
      return res.status(400).json({ 
        error: 'ID utilisateur requis' 
      });
    }

    // Vérifier si l'utilisateur existe
    const existingPreferences = await UserPreferences.findOne({ utilisateur });
    
    if (existingPreferences) {
      // Mettre à jour les préférences existantes
      const updatedPreferences = await UserPreferences.findOneAndUpdate(
        { utilisateur },
        { 
          ...req.body,
          derniereModification: new Date()
        },
        { new: true, runValidators: true }
      );
      
      res.status(200).json({
        message: 'Préférences mises à jour avec succès',
        preferences: updatedPreferences
      });
    } else {
      // Créer de nouvelles préférences
      const newPreferences = new UserPreferences(req.body);
      await newPreferences.save();
      
      res.status(201).json({
        message: 'Préférences créées avec succès',
        preferences: newPreferences
      });
    }
  } catch (err) {
    console.error('Erreur création/mise à jour préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES PRÉFÉRENCES D'UN UTILISATEUR
export const getUserPreferences = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const preferences = await UserPreferences.findOne({ 
      utilisateur: utilisateurId 
    });

    if (!preferences) {
      // Créer des préférences par défaut si elles n'existent pas
      const defaultPreferences = new UserPreferences({
        utilisateur: utilisateurId,
        langue: 'fr',
        devise: 'FCFA',
        pays: 'CI',
        fuseauHoraire: 'Africa/Abidjan',
        formatDate: 'DD/MM/YYYY',
        formatHeure: '24h',
        formatMonetaire: '1 234,56',
        theme: 'light'
      });
      
      await defaultPreferences.save();
      
      return res.status(200).json({
        message: 'Préférences par défaut créées',
        preferences: defaultPreferences
      });
    }

    res.status(200).json({ preferences });
  } catch (err) {
    console.error('Erreur récupération préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ METTRE À JOUR LA LANGUE
export const updateLanguage = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { langue } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const validLanguages = ['fr', 'en', 'es', 'pt', 'ar'];
    if (!validLanguages.includes(langue)) {
      return res.status(400).json({ 
        error: 'Langue non supportée' 
      });
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { utilisateur: utilisateurId },
      { 
        langue,
        'notifications.langue': langue,
        derniereModification: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Langue mise à jour avec succès',
      preferences
    });
  } catch (err) {
    console.error('Erreur mise à jour langue:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ METTRE À JOUR LA DEVISE
export const updateCurrency = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { devise } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const validCurrencies = ['FCFA', 'EUR', 'USD', 'XOF', 'XAF'];
    if (!validCurrencies.includes(devise)) {
      return res.status(400).json({ 
        error: 'Devise non supportée' 
      });
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { utilisateur: utilisateurId },
      { 
        devise,
        derniereModification: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Devise mise à jour avec succès',
      preferences
    });
  } catch (err) {
    console.error('Erreur mise à jour devise:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ METTRE À JOUR LE PAYS
export const updateCountry = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    const { pays } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const validCountries = ['CI', 'FR', 'US', 'SN', 'ML', 'BF', 'NE', 'TG', 'BJ', 'GH', 'NG'];
    if (!validCountries.includes(pays)) {
      return res.status(400).json({ 
        error: 'Pays non supporté' 
      });
    }

    // Mettre à jour la devise selon le pays
    const deviseParPays = {
      'CI': 'FCFA', 'SN': 'FCFA', 'ML': 'FCFA', 'BF': 'FCFA', 
      'NE': 'FCFA', 'TG': 'FCFA', 'BJ': 'FCFA',
      'FR': 'EUR', 'US': 'USD'
    };

    const preferences = await UserPreferences.findOneAndUpdate(
      { utilisateur: utilisateurId },
      { 
        pays,
        devise: deviseParPays[pays] || 'FCFA',
        derniereModification: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Pays mis à jour avec succès',
      preferences
    });
  } catch (err) {
    console.error('Erreur mise à jour pays:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ RÉINITIALISER LES PRÉFÉRENCES
export const resetPreferences = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const preferences = await UserPreferences.findOneAndUpdate(
      { utilisateur: utilisateurId },
      {
        langue: 'fr',
        devise: 'FCFA',
        pays: 'CI',
        fuseauHoraire: 'Africa/Abidjan',
        formatDate: 'DD/MM/YYYY',
        formatHeure: '24h',
        formatMonetaire: '1 234,56',
        theme: 'light',
        derniereModification: new Date()
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Préférences réinitialisées avec succès',
      preferences
    });
  } catch (err) {
    console.error('Erreur réinitialisation préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR TOUTES LES PRÉFÉRENCES (ADMIN)
export const getAllPreferences = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      langue, 
      devise, 
      pays,
      sortBy = 'derniereModification',
      sortOrder = 'desc'
    } = req.query;

    // Construction des filtres
    const filters = {};
    if (langue) filters.langue = langue;
    if (devise) filters.devise = devise;
    if (pays) filters.pays = pays;

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const preferences = await UserPreferences.find(filters)
      .populate('utilisateur', 'nom prenom email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await UserPreferences.countDocuments(filters);

    res.status(200).json({
      preferences,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (err) {
    console.error('Erreur récupération toutes préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ OBTENIR LES STATISTIQUES
export const getPreferencesStats = async (req, res) => {
  try {
    const stats = await UserPreferences.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          langues: { $addToSet: '$langue' },
          devises: { $addToSet: '$devise' },
          pays: { $addToSet: '$pays' }
        }
      }
    ]);

    // Statistiques détaillées par langue
    const statsByLanguage = await UserPreferences.aggregate([
      {
        $group: {
          _id: '$langue',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Statistiques détaillées par devise
    const statsByCurrency = await UserPreferences.aggregate([
      {
        $group: {
          _id: '$devise',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Statistiques détaillées par pays
    const statsByCountry = await UserPreferences.aggregate([
      {
        $group: {
          _id: '$pays',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      general: stats[0] || { totalUsers: 0, langues: [], devises: [], pays: [] },
      byLanguage: statsByLanguage,
      byCurrency: statsByCurrency,
      byCountry: statsByCountry
    });
  } catch (err) {
    console.error('Erreur récupération statistiques préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ SUPPRIMER LES PRÉFÉRENCES
export const deletePreferences = async (req, res) => {
  try {
    const { utilisateurId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(utilisateurId)) {
      return res.status(400).json({ 
        error: 'ID utilisateur invalide' 
      });
    }

    const deletedPreferences = await UserPreferences.findOneAndDelete({ 
      utilisateur: utilisateurId 
    });

    if (!deletedPreferences) {
      return res.status(404).json({ 
        error: 'Préférences non trouvées' 
      });
    }

    res.status(200).json({
      message: 'Préférences supprimées avec succès',
      preferences: deletedPreferences
    });
  } catch (err) {
    console.error('Erreur suppression préférences:', err.message);
    res.status(500).json({ error: err.message });
  }
};



