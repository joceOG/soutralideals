import cartModel from '../models/cartModel.js';
import commandeModel from '../models/commandeModel.js';
import articleModel from '../models/articleModel.js';
import mongoose from 'mongoose';

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
const ARTICLE_POPULATE_FIELDS = 'nomarticle prixarticle imagearticle quantiteArticle';

function getArticleStock(article) {
    if (!article) return 0;
    const quantity = article.quantiteArticle ?? article.stock;
    return typeof quantity === 'number' && !Number.isNaN(quantity) ? quantity : 0;
}

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
// ✅ OBTENIR LE PANIER D'UN UTILISATEUR
export const getCartByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Chercher le panier actif de l'utilisateur
        let cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        })
        .populate('utilisateur', 'nom prenom email telephone')
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        .populate('articles.vendeur', 'utilisateur entreprise');

        // Si pas de panier, créer un nouveau
        if (!cart) {
            cart = new cartModel({
                utilisateur: userId,
                articles: [],
                statut: 'ACTIF'
            });
            await cart.save();
        }

        // Nettoyer les articles en rupture de stock
        const articlesValides = cart.articles.filter(item => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
            return item.article && getArticleStock(item.article) > 0;
=======
            return item.article && item.article.stock > 0;
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
            return item.article && item.article.stock > 0;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
            return item.article && getArticleStock(item.article) > 0;
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            return item.article && item.article.stock > 0;
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
            return item.article && getArticleStock(item.article) > 0;
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            return item.article && item.article.stock > 0;
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
            return item.article && getArticleStock(item.article) > 0;
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        });

        if (articlesValides.length !== cart.articles.length) {
            cart.articles = articlesValides;
            cart.calculerTotaux();
            await cart.save();
        }

        res.status(200).json(cart);
    } catch (err) {
        console.error('Erreur récupération panier:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ AJOUTER UN ARTICLE AU PANIER
export const addToCart = async (req, res) => {
    try {
        const { 
            userId, 
            articleId, 
            vendeurId, 
            quantite = 1,
            variantes 
        } = req.body;

        // Validations
        if (!userId || !articleId || !vendeurId) {
            return res.status(400).json({ 
                error: 'Utilisateur, article et vendeur requis' 
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId) || 
            !mongoose.Types.ObjectId.isValid(articleId) || 
            !mongoose.Types.ObjectId.isValid(vendeurId)) {
            return res.status(400).json({ error: 'IDs invalides' });
        }

        // Vérifier que l'article existe
        const article = await articleModel.findById(articleId);
        if (!article) {
            return res.status(404).json({ error: 'Article non trouvé' });
        }

        // Vérifier le stock
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        const stockDisponible = getArticleStock(article);
        if (stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
        if (article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        const stockDisponible = getArticleStock(article);
        if (stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        if (article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        const stockDisponible = getArticleStock(article);
        if (stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        if (article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        const stockDisponible = getArticleStock(article);
        if (stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
            });
        }

        // Récupérer ou créer le panier
        let cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            cart = new cartModel({
                utilisateur: userId,
                articles: [],
                statut: 'ACTIF'
            });
        }

        // Ajouter l'article
        cart.ajouterArticle({
            article: articleId,
            vendeur: vendeurId,
            nomArticle: article.nomarticle,
            imageArticle: article.imagearticle,
            prixUnitaire: article.prixarticle,
            quantite,
            variantes
        });

        await cart.save();

        // Repopuler pour la réponse
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        await cart.populate('articles.vendeur', 'utilisateur entreprise');

        res.status(200).json({
            message: 'Article ajouté au panier',
            cart
        });
    } catch (err) {
        console.error('Erreur ajout au panier:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ MODIFIER LA QUANTITÉ D'UN ARTICLE
export const updateCartItemQuantity = async (req, res) => {
    try {
        const { userId, itemId } = req.params;
        const { quantite } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId) || 
            !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ error: 'IDs invalides' });
        }

        if (!quantite || quantite < 1) {
            return res.status(400).json({ error: 'Quantité invalide' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        // Vérifier le stock disponible
        const item = cart.articles.id(itemId);
        if (!item) {
            return res.status(404).json({ error: 'Article non trouvé dans le panier' });
        }

        const article = await articleModel.findById(item.article);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        const stockDisponible = getArticleStock(article);
        if (article && stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
        if (article && article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        const stockDisponible = getArticleStock(article);
        if (article && stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        if (article && article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        const stockDisponible = getArticleStock(article);
        if (article && stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        if (article && article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        const stockDisponible = getArticleStock(article);
        if (article && stockDisponible < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible 
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
            });
        }

        // Modifier la quantité
        cart.modifierQuantite(itemId, quantite);
        await cart.save();

        // Repopuler
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        await cart.populate('articles.vendeur', 'utilisateur entreprise');

        res.status(200).json({
            message: 'Quantité mise à jour',
            cart
        });
    } catch (err) {
        console.error('Erreur mise à jour quantité:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ RETIRER UN ARTICLE DU PANIER
export const removeFromCart = async (req, res) => {
    try {
        const { userId, itemId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId) || 
            !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ error: 'IDs invalides' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        // Retirer l'article
        cart.retirerArticle(itemId);
        await cart.save();

        // Repopuler
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        await cart.populate('articles.vendeur', 'utilisateur entreprise');

        res.status(200).json({
            message: 'Article retiré du panier',
            cart
        });
    } catch (err) {
        console.error('Erreur retrait du panier:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ VIDER LE PANIER
export const clearCart = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        // Vider le panier
        cart.vider();
        await cart.save();

        res.status(200).json({
            message: 'Panier vidé',
            cart
        });
    } catch (err) {
        console.error('Erreur vidage panier:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ APPLIQUER UN CODE PROMO
export const applyPromoCode = async (req, res) => {
    try {
        const { userId } = req.params;
        const { code, reduction, typeReduction } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        if (!code || !reduction) {
            return res.status(400).json({ error: 'Code et réduction requis' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        // Appliquer le code promo
        cart.appliquerCodePromo(code, reduction, typeReduction || 'MONTANT_FIXE');
        await cart.save();

        // Repopuler
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        await cart.populate('articles.article', ARTICLE_POPULATE_FIELDS);
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        await cart.populate('articles.vendeur', 'utilisateur entreprise');

        res.status(200).json({
            message: 'Code promo appliqué',
            cart
        });
    } catch (err) {
        console.error('Erreur application code promo:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ AJOUTER/MODIFIER L'ADRESSE DE LIVRAISON
export const updateDeliveryAddress = async (req, res) => {
    try {
        const { userId } = req.params;
        const { adresse, ville, codePostal, pays, telephone } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        });

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        // Mettre à jour l'adresse
        cart.adresseLivraison = {
            adresse,
            ville,
            codePostal,
            pays: pays || 'Côte d\'Ivoire',
            telephone
        };

        await cart.save();

        res.status(200).json({
            message: 'Adresse de livraison mise à jour',
            cart
        });
    } catch (err) {
        console.error('Erreur mise à jour adresse:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ CONVERTIR LE PANIER EN COMMANDE (CHECKOUT)
export const checkout = async (req, res) => {
    try {
        const { userId } = req.params;
        const { moyenPaiement, notesClient } = req.body;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'ID utilisateur invalide' });
        }

        // Récupérer le panier
        const cart = await cartModel.findOne({ 
            utilisateur: userId, 
            statut: 'ACTIF' 
        })
        .populate('utilisateur', 'nom prenom email telephone')
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        .populate('articles.article', ARTICLE_POPULATE_FIELDS)
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        .populate('articles.vendeur');

        if (!cart) {
            return res.status(404).json({ error: 'Panier non trouvé' });
        }

        if (cart.articles.length === 0) {
            return res.status(400).json({ error: 'Panier vide' });
        }

        // Vérifier que l'adresse de livraison est renseignée
        if (!cart.adresseLivraison || !cart.adresseLivraison.adresse) {
            return res.status(400).json({ 
                error: 'Adresse de livraison requise',
                message: 'Veuillez ajouter une adresse de livraison avant de valider'
            });
        }

        // Vérifier le stock de tous les articles
        for (const item of cart.articles) {
            if (!item.article) {
                return res.status(400).json({ 
                    error: 'Un article n\'est plus disponible',
                    articleId: item._id
                });
            }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
            const stockDisponible = getArticleStock(item.article);
            if (stockDisponible < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible,
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
            if (item.article.stock < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible: item.article.stock,
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
            const stockDisponible = getArticleStock(item.article);
            if (stockDisponible < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible,
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            if (item.article.stock < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible: item.article.stock,
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
            const stockDisponible = getArticleStock(item.article);
            if (stockDisponible < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible,
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
            if (item.article.stock < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible: item.article.stock,
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
            const stockDisponible = getArticleStock(item.article);
            if (stockDisponible < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible,
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
                    quantiteDemandee: item.quantite
                });
            }
        }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        // 🔒 TRANSACTION ATOMIQUE — évite la race condition stock
        const session = await mongoose.startSession();
        let commande;
        try {
            await session.withTransaction(async () => {
                // Décrémentation atomique du stock avec contrainte ≥ 0
                for (const item of cart.articles) {
                    const updated = await articleModel.findOneAndUpdate(
                        { _id: item.article._id, quantiteArticle: { $gte: item.quantite } },
                        { $inc: { quantiteArticle: -item.quantite } },
                        { session, new: true }
                    );
                    if (!updated) {
                        throw Object.assign(
                            new Error(`Stock épuisé pour ${item.nomArticle}`),
                            { status: 409 }
                        );
                    }
                }
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
        // Créer la commande
        const commande = new commandeModel({
            utilisateur: userId,
            infoCommande: {
                addresse: cart.adresseLivraison.adresse,
                ville: cart.adresseLivraison.ville,
                codePostal: cart.adresseLivraison.codePostal,
                pays: cart.adresseLivraison.pays,
                telephone: cart.adresseLivraison.telephone
            },
            articles: cart.articles.map(item => ({
                nom: item.nomArticle,
                quantité: item.quantite,
                image: item.imageArticle,
                prix: item.prixUnitaire,
                prixTotal: item.prixTotal,
                articleId: item.article._id,
                vendeurId: item.vendeur._id
            })),
            prixArticles: cart.montantArticles,
            prixLivraison: cart.fraisLivraison,
            prixTotal: cart.montantTotal,
            statusCommande: 'En cours',
            moyenPaiement: moyenPaiement || 'A définir',
            notesClient: notesClient || cart.notes,
            codePromo: cart.codePromo.code ? {
                code: cart.codePromo.code,
                reduction: cart.codePromo.reduction,
                type: cart.codePromo.typeReduction
            } : undefined
        });
<<<<<<< HEAD
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

                commande = new commandeModel({
                    utilisateur: userId,
                    infoCommande: {
                        addresse: cart.adresseLivraison.adresse,
                        ville: cart.adresseLivraison.ville,
                        codePostal: cart.adresseLivraison.codePostal,
                        pays: cart.adresseLivraison.pays,
                        telephone: cart.adresseLivraison.telephone
                    },
                    articles: cart.articles.map(item => ({
                        nom: item.nomArticle,
                        quantite: item.quantite,
                        image: item.imageArticle,
                        prix: item.prixUnitaire,
                        prixTotal: item.prixTotal,
                        articleId: item.article._id,
                        vendeurId: item.vendeur._id
                    })),
                    prixArticles: cart.montantArticles,
                    prixLivraison: cart.fraisLivraison,
                    prixTotal: cart.montantTotal,
                    statusCommande: 'En cours',
                    moyenPaiement: moyenPaiement || 'A définir',
                    notesClient: notesClient || cart.notes,
                    codePromo: cart.codePromo.code ? {
                        code: cart.codePromo.code,
                        reduction: cart.codePromo.reduction,
                        type: cart.codePromo.typeReduction
                    } : undefined
                });

                await commande.save({ session });
                await cart.convertirEnCommande(commande._id);
            });
        } finally {
            session.endSession();
        }

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
        // Créer la commande
        const commande = new commandeModel({
            utilisateur: userId,
            infoCommande: {
                addresse: cart.adresseLivraison.adresse,
                ville: cart.adresseLivraison.ville,
                codePostal: cart.adresseLivraison.codePostal,
                pays: cart.adresseLivraison.pays,
                telephone: cart.adresseLivraison.telephone
            },
            articles: cart.articles.map(item => ({
                nom: item.nomArticle,
                quantité: item.quantite,
                image: item.imageArticle,
                prix: item.prixUnitaire,
                prixTotal: item.prixTotal,
                articleId: item.article._id,
                vendeurId: item.vendeur._id
            })),
            prixArticles: cart.montantArticles,
            prixLivraison: cart.fraisLivraison,
            prixTotal: cart.montantTotal,
            statusCommande: 'En cours',
            moyenPaiement: moyenPaiement || 'A définir',
            notesClient: notesClient || cart.notes,
            codePromo: cart.codePromo.code ? {
                code: cart.codePromo.code,
                reduction: cart.codePromo.reduction,
                type: cart.codePromo.typeReduction
            } : undefined
        });
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

                commande = new commandeModel({
                    utilisateur: userId,
                    infoCommande: {
                        addresse: cart.adresseLivraison.adresse,
                        ville: cart.adresseLivraison.ville,
                        codePostal: cart.adresseLivraison.codePostal,
                        pays: cart.adresseLivraison.pays,
                        telephone: cart.adresseLivraison.telephone
                    },
                    articles: cart.articles.map(item => ({
                        nom: item.nomArticle,
                        quantite: item.quantite,
                        image: item.imageArticle,
                        prix: item.prixUnitaire,
                        prixTotal: item.prixTotal,
                        articleId: item.article._id,
                        vendeurId: item.vendeur._id
                    })),
                    prixArticles: cart.montantArticles,
                    prixLivraison: cart.fraisLivraison,
                    prixTotal: cart.montantTotal,
                    statusCommande: 'En cours',
                    moyenPaiement: moyenPaiement || 'A définir',
                    notesClient: notesClient || cart.notes,
                    codePromo: cart.codePromo.code ? {
                        code: cart.codePromo.code,
                        reduction: cart.codePromo.reduction,
                        type: cart.codePromo.typeReduction
                    } : undefined
                });

                await commande.save({ session });
                await cart.convertirEnCommande(commande._id);
            });
        } finally {
            session.endSession();
        }

<<<<<<< HEAD
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
        // Marquer le panier comme converti
        await cart.convertirEnCommande(commande._id);

        // Populate la commande pour la réponse
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
        await commande.populate('utilisateur', 'nom prenom email telephone');

        res.status(201).json({
            message: 'Commande créée avec succès',
            commande,
            cart
        });
    } catch (err) {
        console.error('Erreur checkout:', err.message);
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
=======
        res.status(500).json({ error: err.message });
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
        res.status(500).json({ error: err.message });
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        res.status(500).json({ error: err.message });
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
        res.status(500).json({ error: err.message });
>>>>>>> da08acd (Dashboard Complet and Merge)
=======
        const status = err.status || 500;
        res.status(status).json({ error: err.message });
>>>>>>> 1ba4214 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
    }
};

// ✅ OBTENIR TOUS LES PANIERS (ADMIN)
export const getAllCarts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            statut,
            dateDebut,
            dateFin 
        } = req.query;

        // Filtres
        const filters = {};
        if (statut) filters.statut = statut;
        if (dateDebut && dateFin) {
            filters.createdAt = {
                $gte: new Date(dateDebut),
                $lte: new Date(dateFin)
            };
        }

        const carts = await cartModel.find(filters)
            .populate('utilisateur', 'nom prenom email telephone')
            .populate('articles.article', 'nomarticle prixarticle imagearticle')
            .populate('articles.vendeur', 'utilisateur entreprise')
            .sort({ updatedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await cartModel.countDocuments(filters);

        res.status(200).json({
            carts,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (err) {
        console.error('Erreur récupération paniers:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ STATISTIQUES DES PANIERS (ADMIN)
export const getCartStats = async (req, res) => {
    try {
        const stats = await cartModel.getStatistiques();

        // Nombre total d'articles dans tous les paniers actifs
        const articlesCount = await cartModel.aggregate([
            { $match: { statut: 'ACTIF' } },
            { $unwind: '$articles' },
            { $group: { _id: null, total: { $sum: '$articles.quantite' } } }
        ]);

        // Panier moyen
        const panierMoyen = await cartModel.aggregate([
            { $match: { statut: 'ACTIF' } },
            {
                $group: {
                    _id: null,
                    montantMoyen: { $avg: '$montantTotal' },
                    articlesParPanier: { $avg: { $size: '$articles' } }
                }
            }
        ]);

        res.status(200).json({
            ...stats,
            totalArticles: articlesCount[0]?.total || 0,
            panierMoyen: panierMoyen[0] || { 
                montantMoyen: 0, 
                articlesParPanier: 0 
            }
        });
    } catch (err) {
        console.error('Erreur statistiques paniers:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// ✅ NETTOYER LES PANIERS EXPIRÉS (CRON JOB)
export const cleanupExpiredCarts = async (req, res) => {
    try {
        const count = await cartModel.nettoyerPaniersExpires();

        res.status(200).json({
            message: `${count} panier(s) expiré(s) nettoyé(s)`,
            count
        });
    } catch (err) {
        console.error('Erreur nettoyage paniers:', err.message);
        res.status(500).json({ error: err.message });
    }
};





