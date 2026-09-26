import serviceModel from '../models/serviceModel.js';
import articleModel from '../models/articleModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import { buildFuzzyRegex, removeAccents } from '../utils/searchNormalize.js';
import {
  applyFreelanceVendeurPublicMatch,
  applyPrestatairePublicMatch,
  findPublicVendeurIds,
  isPrestatairePubliclyVisible,
} from '../utils/proPublicFilter.js';
import {
  applyUtilisateurConflictExclusion,
  loadPublicSearchConflictUtilisateurIds,
} from '../services/publicSearchConflictService.js';
import {
  presentPublicFreelanceSearchItem,
  presentPublicPrestataireSearchItem,
  presentPublicVendeurSearchItem,
} from '../utils/publicSearchPresenters.js';

/** Endpoint non paginé : limite fixe par collection après filtre public + conflits. */
const SEARCH_RESULT_LIMIT = 8;

export const globalSearch = async (req, res) => {
  try {
    const { query, minPrice, maxPrice } = req.query;

    if (!query) {
      return res.status(400).json({ message: 'Le paramètre query est requis' });
    }

    const limit = SEARCH_RESULT_LIMIT;
    const { contains: fuzzyContains, exact: exactRegex } = buildFuzzyRegex(query);

    const priceFilter = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);
    const hasPriceFilter = Object.keys(priceFilter).length > 0;

    const conflictIds = await loadPublicSearchConflictUtilisateurIds();
    const publicVendeurIds = await findPublicVendeurIds(vendeurModel);

    const freelancePublic = applyUtilisateurConflictExclusion(
      applyFreelanceVendeurPublicMatch({
        $or: [
          { name: exactRegex },
          { name: fuzzyContains },
          { job: exactRegex },
          { job: fuzzyContains },
          { skills: { $in: [fuzzyContains] } },
        ],
      }),
      conflictIds.freelance,
    );

    const vendeurPublic = applyUtilisateurConflictExclusion(
      applyFreelanceVendeurPublicMatch({
        $or: [
          { shopName: exactRegex },
          { shopName: fuzzyContains },
          { shopDescription: fuzzyContains },
        ],
      }),
      conflictIds.vendeur,
    );

    const prestatairePublic = applyUtilisateurConflictExclusion(
      applyPrestatairePublicMatch({
        $or: [{ description: fuzzyContains }, { specialite: { $in: [fuzzyContains] } }],
      }),
      conflictIds.prestataire,
    );

    const articleFilter = {
      $or: [
        { nomArticle: exactRegex },
        { nomArticle: fuzzyContains },
        { tags: { $in: [exactRegex] } },
        { tags: { $in: [fuzzyContains] } },
        { description: fuzzyContains },
      ],
      vendeur: { $in: publicVendeurIds },
      ...(hasPriceFilter && { prixArticle: priceFilter }),
    };

    const [services, articles, freelancesRaw, vendeursRaw, prestatairesRaw] = await Promise.all([
      serviceModel
        .find({
          $or: [
            { nomservice: exactRegex },
            { nomservice: fuzzyContains },
            { tags: { $in: [exactRegex] } },
            { tags: { $in: [fuzzyContains] } },
          ],
        })
        .select('nomservice prixmoyen imageservice categorie')
        .populate('categorie', 'nomcategorie')
        .limit(limit),

      articleModel
        .find(articleFilter)
        .select('nomArticle prixArticle photoArticle description')
        .limit(limit),

      freelanceModel
        .find(freelancePublic)
        .select(
          'name job rating imagePath location ville hourlyRate displayName jobTitle utilisateur verificationDocuments',
        )
        .limit(limit),

      vendeurModel
        .find(vendeurPublic)
        .select(
          'shopName shopDescription rating shopLogo ville businessCategories utilisateur verificationDocuments email telephone',
        )
        .limit(limit),

      prestataireModel
        .find(prestatairePublic)
        .populate('utilisateur', 'nom prenom photoProfil telephone email role')
        .populate('service', 'nomservice')
        .limit(limit),
    ]);

    const prestataires = prestatairesRaw
      .filter((p) => p.utilisateur && isPrestatairePubliclyVisible(p))
      .slice(0, limit)
      .map((p) => presentPublicPrestataireSearchItem(p));

    const freelances = freelancesRaw.slice(0, limit).map((f) => presentPublicFreelanceSearchItem(f));

    const vendeurs = vendeursRaw.slice(0, limit).map((v) => presentPublicVendeurSearchItem(v));

    res.json({
      query,
      results: {
        services,
        articles,
        freelances,
        prestataires,
        vendeurs,
      },
      counts: {
        services: services.length,
        articles: articles.length,
        freelances: freelances.length,
        prestataires: prestataires.length,
        vendeurs: vendeurs.length,
      },
      pagination: {
        paginated: false,
        limitPerType: limit,
      },
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
    const publicVendeurIds = await findPublicVendeurIds(vendeurModel);
    const conflictIds = await loadPublicSearchConflictUtilisateurIds();

    const [services, articles, freelances, prestataires] = await Promise.all([
      serviceModel
        .find({ $or: [{ nomservice: exactRegex }, { nomservice: fuzzyRegex }] })
        .select('nomservice')
        .limit(limit),

      articleModel
        .find({
          $or: [{ nomArticle: exactRegex }, { nomArticle: fuzzyRegex }],
          vendeur: { $in: publicVendeurIds },
        })
        .select('nomArticle')
        .limit(limit),

      freelanceModel
        .find(
          applyUtilisateurConflictExclusion(
            applyFreelanceVendeurPublicMatch({
              $or: [{ job: exactRegex }, { job: fuzzyRegex }],
            }),
            conflictIds.freelance,
          ),
        )
        .select('job')
        .limit(limit),

      prestataireModel
        .find(
          applyUtilisateurConflictExclusion(applyPrestatairePublicMatch({}), conflictIds.prestataire),
        )
        .populate({
          path: 'service',
          match: { $or: [{ nomservice: exactRegex }, { nomservice: fuzzyRegex }] },
          select: 'nomservice',
        })
        .select('service')
        .limit(limit),
    ]);

    const raw = [
      ...services.map((s) => s.nomservice),
      ...articles.map((a) => a.nomArticle),
      ...freelances.map((f) => f.job).filter(Boolean),
      ...prestataires.map((p) => p.service?.nomservice).filter(Boolean),
    ];

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
