import articleModel from '../models/articleModel.js';
import freelanceModel from '../models/freelanceModel.js';
import vendeurModel from '../models/vendeurModel.js';
import prestataireModel from '../models/prestataireModel.js';
import { removeAccents } from '../utils/searchNormalize.js';
import { matchCatalogServices } from '../utils/catalogSearch.js';
import { resolveSearchScope } from '../utils/catalogText.js';
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

const SEARCH_RESULT_LIMIT = 8;

function emptyBuckets() {
  return { services: [], articles: [], freelances: [], prestataires: [], vendeurs: [] };
}

export const globalSearch = async (req, res) => {
  try {
    const { query, minPrice, maxPrice, scope: scopeRaw } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Le paramètre query est requis' });
    }

    const scope = resolveSearchScope(scopeRaw);
    const limit = SEARCH_RESULT_LIMIT;
    const catalog = await matchCatalogServices(query, scope === 'global' ? 'global' : scope, {
      limit: 24,
    });

    const conflictIds = await loadPublicSearchConflictUtilisateurIds();
    const results = emptyBuckets();

    results.services = catalog.matches.slice(0, limit).map((m) => {
      const s = m.service;
      return {
        _id: s._id,
        nomservice: s.nomservice,
        prixmoyen: s.prixmoyen,
        imageservice: s.imageservice,
        aliases: s.aliases,
        needs: s.needs,
        categorie: s.categorie,
        matchKind: m.kind,
        matchScore: m.score,
      };
    });

    const includePrestataires = scope === 'global' || scope === 'metiers';
    const includeFreelance = scope === 'global' || scope === 'freelance';
    const includeEmarket = scope === 'global' || scope === 'emarket';

    if (includePrestataires && catalog.serviceIds.length) {
      const prestatairePublic = applyUtilisateurConflictExclusion(
        applyPrestatairePublicMatch({ service: { $in: catalog.serviceIds } }),
        conflictIds.prestataire,
      );
      const prestatairesRaw = await prestataireModel
        .find(prestatairePublic)
        .sort({ _id: 1 })
        .populate('utilisateur', 'nom prenom photoProfil telephone email role')
        .populate('service', 'nomservice')
        .limit(limit);
      results.prestataires = prestatairesRaw
        .filter((p) => p.utilisateur && isPrestatairePubliclyVisible(p))
        .slice(0, limit)
        .map((p) => presentPublicPrestataireSearchItem(p));
    }

    if (includeFreelance) {
      const { buildFuzzyRegex } = await import('../utils/searchNormalize.js');
      const { contains: fuzzyContains, exact: exactRegex } = buildFuzzyRegex(query);
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
      const freelancesRaw = await freelanceModel
        .find(freelancePublic)
        .select(
          'name job rating imagePath location ville hourlyRate displayName jobTitle utilisateur verificationDocuments',
        )
        .limit(limit);
      results.freelances = freelancesRaw.slice(0, limit).map((f) => presentPublicFreelanceSearchItem(f));
    }

    if (includeEmarket) {
      const { buildFuzzyRegex } = await import('../utils/searchNormalize.js');
      const { contains: fuzzyContains, exact: exactRegex } = buildFuzzyRegex(query);
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = Number(minPrice);
      if (maxPrice) priceFilter.$lte = Number(maxPrice);
      const hasPriceFilter = Object.keys(priceFilter).length > 0;
      const publicVendeurIds = await findPublicVendeurIds(vendeurModel);
      const articleFilter = {
        $or: [
          { nomArticle: exactRegex },
          { nomArticle: fuzzyContains },
          { tags: { $in: [exactRegex] } },
          { tags: { $in: [fuzzyContains] } },
        ],
        vendeur: { $in: publicVendeurIds },
        ...(hasPriceFilter && { prixArticle: priceFilter }),
      };
      const [articles, vendeursRaw] = await Promise.all([
        articleModel.find(articleFilter).select('nomArticle prixArticle photoArticle').limit(limit),
        vendeurModel
          .find(
            applyUtilisateurConflictExclusion(
              applyFreelanceVendeurPublicMatch({
                $or: [
                  { shopName: exactRegex },
                  { shopName: fuzzyContains },
                  { shopDescription: fuzzyContains },
                ],
              }),
              conflictIds.vendeur,
            ),
          )
          .select(
            'shopName shopDescription rating shopLogo ville businessCategories utilisateur verificationDocuments email telephone',
          )
          .limit(limit),
      ]);
      results.articles = articles;
      results.vendeurs = vendeursRaw.slice(0, limit).map((v) => presentPublicVendeurSearchItem(v));
    }

    res.json({
      query,
      scope,
      results,
      counts: {
        services: results.services.length,
        articles: results.articles.length,
        freelances: results.freelances.length,
        prestataires: results.prestataires.length,
        vendeurs: results.vendeurs.length,
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
    const { query, scope: scopeRaw } = req.query;
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const scope = resolveSearchScope(scopeRaw);
    const catalog = await matchCatalogServices(query, scope === 'global' ? 'global' : scope, {
      limit: 10,
    });
    const fromCatalog = catalog.matches.map((m) => m.service.nomservice).filter(Boolean);

    let extra = [];
    if (scope === 'global' || scope === 'emarket') {
      const publicVendeurIds = await findPublicVendeurIds(vendeurModel);
      const { buildFuzzyRegex } = await import('../utils/searchNormalize.js');
      const { contains: fuzzyRegex, exact: exactRegex } = buildFuzzyRegex(query);
      const articles = await articleModel
        .find({
          $or: [{ nomArticle: exactRegex }, { nomArticle: fuzzyRegex }],
          vendeur: { $in: publicVendeurIds },
        })
        .select('nomArticle')
        .limit(5);
      extra = articles.map((a) => a.nomArticle);
    }

    const normalized = removeAccents(query);
    const unique = [...new Set([...fromCatalog, ...extra].filter(Boolean))]
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
