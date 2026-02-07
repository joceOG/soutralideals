import serviceModel from '../models/serviceModel.js';
import articleModel from '../models/articleModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import utilisateurModel from '../models/utilisateurModel.js';

export const globalSearch = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Le paramètre query est requis" });
    }

    const limit = 5; // Limite par section pour la vue globale

    // Exécution en parallèle pour la performance
    const [services, articles, freelances, vendeurs, prestataires] = await Promise.all([
      // Recherche Services (Regex uniquement)
      serviceModel.find({
        $or: [
          { nomservice: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      })
        .select('nomservice prixmoyen imageservice categorie')
        .populate('categorie', 'nomcategorie')
        .limit(limit),

      // Recherche Articles (Regex uniquement)
      articleModel.find({
        $or: [
          { nomArticle: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      })
        .select('nomArticle prixArticle photoArticle')
        .limit(limit),

      // Recherche Freelances (Regex uniquement)
      freelanceModel.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { job: { $regex: query, $options: 'i' } }
        ]
      })
        .select('name job rating imagePath')
        .limit(limit),

      // Recherche Vendeurs (Regex uniquement)
      vendeurModel.find({
        $or: [
          { shopName: { $regex: query, $options: 'i' } }
        ]
      })
        .select('shopName rating shopLogo')
        .limit(limit),

      // ✅ Recherche Prestataires (via Utilisateur)
      utilisateurModel.find({
        role: 'Prestataire',
        $or: [
          { nom: { $regex: query, $options: 'i' } },
          { prenom: { $regex: query, $options: 'i' } },
          // Gestion "Nom Prénom" ou "Prénom Nom"
          ...(query.indexOf(' ') !== -1 ? [
            {
              $and: [
                { nom: { $regex: query.split(' ')[0], $options: 'i' } },
                { prenom: { $regex: query.split(' ').slice(1).join(' '), $options: 'i' } }
              ]
            },
            {
              $and: [
                { prenom: { $regex: query.split(' ')[0], $options: 'i' } },
                { nom: { $regex: query.split(' ').slice(1).join(' '), $options: 'i' } }
              ]
            }
          ] : [])
        ]
      })
        .select('nom prenom photoProfil')
        .populate({
          path: 'prestataire',
          select: 'localisation service',
          populate: {
            path: 'service',
            select: 'nomservice'
          }
        })
        .limit(limit)
    ]);

    // Formatage des prestataires pour l'affichage
    const formattedPrestataires = prestataires.map(user => {
      const prest = user.prestataire?.[0] || user.prestataire; // Gestion array/obj
      return {
        _id: user._id,
        name: `${user.nom} ${user.prenom}`,
        job: prest?.service?.nomservice || 'Prestataire',
        imagePath: user.photoProfil, // Adapté pour le frontend
        rating: 0, // Pas de note directe sur user
        type: 'Prestataire'
      };
    });

    res.json({
      query,
      results: {
        services,
        articles,
        freelances,
        prestataires: formattedPrestataires, // ✅ Envoi séparé
        vendeurs
      },
      counts: {
        services: services.length,
        articles: articles.length,
        freelances: freelances.length,
        prestataires: formattedPrestataires.length, // ✅ Compte séparé
        vendeurs: vendeurs.length
      }
    });

  } catch (error) {
    console.error('Erreur recherche globale:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.length < 2) {
      return res.json([]);
    }

    const limit = 5;
    const regex = new RegExp(query, 'i');

    const [services, articles, freelances] = await Promise.all([
      serviceModel.find({ nomservice: { $regex: regex } }).select('nomservice').limit(limit),
      articleModel.find({ nomArticle: { $regex: regex } }).select('nomArticle').limit(limit),
      freelanceModel.find({ name: { $regex: regex } }).select('name').limit(limit),
      // On peut ajouter Utilisateur (Prestataire) si nécessaire
    ]);

    // Extraction et déduplication des noms
    const suggestions = [
      ...services.map(s => s.nomservice),
      ...articles.map(a => a.nomArticle),
      ...freelances.map(f => f.name)
    ];

    // Déduplication (Set) et limite globale
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 10);

    res.json(uniqueSuggestions);
  } catch (error) {
    console.error('Erreur suggestions:', error);
    res.status(500).json({ error: error.message });
  }
};
