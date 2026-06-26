import serviceModel from '../models/serviceModel.js';
import articleModel from '../models/articleModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import utilisateurModel from '../models/utilisateurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import { buildFuzzyRegex, buildFuzzyFilter, removeAccents } from '../utils/searchNormalize.js';

export const globalSearch = async (req, res) => {
  try {
    const { query, minPrice, maxPrice, city } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Le paramètre query est requis" });
    }

    const limit = 8;
    const { contains: fuzzyContains, exact: exactRegex } = buildFuzzyRegex(query);

    // Filtre prix optionnel
    const priceFilter = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);
    const hasPriceFilter = Object.keys(priceFilter).length > 0;

    const [services, articles, freelances, vendeurs, prestatairesRaw] = await Promise.all([
      serviceModel.find({
        $or: [
          { nomservice: exactRegex },
          { nomservice: fuzzyContains },
          { tags: { $in: [exactRegex] } },
          { tags: { $in: [fuzzyContains] } },
        ]
      })
        .select('nomservice prixmoyen imageservice categorie')
        .populate('categorie', 'nomcategorie')
        .limit(limit),

      articleModel.find({
        $or: [
          { nomArticle: exactRegex },
          { nomArticle: fuzzyContains },
          { tags: { $in: [exactRegex] } },
          { tags: { $in: [fuzzyContains] } },
          { description: fuzzyContains },
        ],
        ...(hasPriceFilter && { prixArticle: priceFilter })
      })
        .select('nomArticle prixArticle photoArticle description')
        .limit(limit),

      freelanceModel.find({
        $or: [
          { name: exactRegex },
          { name: fuzzyContains },
          { job: exactRegex },
          { job: fuzzyContains },
          { skills: { $in: [fuzzyContains] } },
        ]
      })
        .select('name job rating imagePath location ville hourlyRate')
        .limit(limit),

      vendeurModel.find({
        $or: [
          { shopName: exactRegex },
          { shopName: fuzzyContains },
          { shopDescription: fuzzyContains },
        ]
      })
        .select('shopName rating shopLogo ville')
        .limit(limit),

      // Chercher via le modèle prestataire directement (service + localisation)
      prestataireModel.find({
        $or: [
          { description: fuzzyContains },
          { specialite: { $in: [fuzzyContains] } },
        ]
      })
        .populate('utilisateur', 'nom prenom photoProfil')
        .populate('service', 'nomservice')
        .limit(limit),
    ]);

    // Aussi chercher les utilisateurs prestataires par service via utilisateur
    const userPrestataires = await utilisateurModel.find({
      role: 'Prestataire',
      $or: [
        { nom: exactRegex },
        { nom: fuzzyContains },
        { prenom: exactRegex },
        { prenom: fuzzyContains },
      ]
    })
      .select('nom prenom photoProfil')
      .populate({
        path: 'prestataire',
        select: 'localisation service ville',
        populate: { path: 'service', select: 'nomservice' }
      })
      .limit(limit);

    // Formatter les prestataires
    const formattedPrestataires = [
      ...prestatairesRaw
        .filter(p => p.utilisateur)
        .map(p => ({
          _id: p._id,
          name: `${p.utilisateur?.prenom ?? ''} ${p.utilisateur?.nom ?? ''}`.trim(),
          job: p.service?.nomservice || 'Prestataire',
          imagePath: p.utilisateur?.photoProfil,
          ville: p.ville || p.localisation,
          rating: p.note ?? 0,
          type: 'Prestataire',
        })),
      ...userPrestataires.map(user => {
        const prest = Array.isArray(user.prestataire) ? user.prestataire[0] : user.prestataire;
        return {
          _id: user._id,
          name: `${user.prenom ?? ''} ${user.nom ?? ''}`.trim(),
          job: prest?.service?.nomservice || 'Prestataire',
          imagePath: user.photoProfil,
          ville: prest?.ville || prest?.localisation,
          rating: 0,
          type: 'Prestataire',
        };
      }),
    ];

    // Déduplication par _id
    const seenIds = new Set();
    const uniquePrestataires = formattedPrestataires.filter(p => {
      const id = String(p._id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    res.json({
      query,
      results: {
        services,
        articles,
        freelances,
        prestataires: uniquePrestataires,
        vendeurs
      },
      counts: {
        services: services.length,
        articles: articles.length,
        freelances: freelances.length,
        prestataires: uniquePrestataires.length,
        vendeurs: vendeurs.length,
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
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const limit = 5;
    const { contains: fuzzyRegex, exact: exactRegex } = buildFuzzyRegex(query);

    const [services, articles, freelances, prestataires] = await Promise.all([
      serviceModel
        .find({ $or: [{ nomservice: exactRegex }, { nomservice: fuzzyRegex }] })
        .select('nomservice')
        .limit(limit),

      articleModel
        .find({ $or: [{ nomArticle: exactRegex }, { nomArticle: fuzzyRegex }] })
        .select('nomArticle')
        .limit(limit),

      freelanceModel
        .find({ $or: [{ job: exactRegex }, { job: fuzzyRegex }] })
        .select('job')
        .limit(limit),

      prestataireModel
        .find({})
        .populate({
          path: 'service',
          match: { $or: [{ nomservice: exactRegex }, { nomservice: fuzzyRegex }] },
          select: 'nomservice'
        })
        .select('service')
        .limit(limit),
    ]);

    // Collecter toutes les suggestions
    const raw = [
      ...services.map(s => s.nomservice),
      ...articles.map(a => a.nomArticle),
      ...freelances.map(f => f.job).filter(Boolean),
      ...prestataires.map(p => p.service?.nomservice).filter(Boolean),
    ];

    // Dédupliquer + trier par pertinence (commence par query en premier)
    const normalized = removeAccents(query);
    const unique = [...new Set(raw.filter(Boolean))]
      .sort((a, b) => {
        const aStarts = removeAccents(a).startsWith(normalized);
        const bStarts = removeAccents(b).startsWith(normalized);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.localeCompare(b, 'fr');
      })
      .slice(0, 10);

    res.json(unique);
  } catch (error) {
    console.error('Erreur suggestions:', error);
    res.status(500).json({ error: error.message });
  }
};
