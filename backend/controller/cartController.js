import cartModel from '../models/cartModel.js';
import commandeModel from '../models/commandeModel.js';
import articleModel from '../models/articleModel.js';
import mongoose from 'mongoose';

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
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
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
            return item.article && item.article.stock > 0;
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
        if (article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
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
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
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
        if (article && article.stock < quantite) {
            return res.status(400).json({ 
                error: 'Stock insuffisant',
                stockDisponible: article.stock 
            });
        }

        // Modifier la quantité
        cart.modifierQuantite(itemId, quantite);
        await cart.save();

        // Repopuler
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
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
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
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
        await cart.populate('articles.article', 'nomarticle prixarticle imagearticle stock');
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
        .populate('articles.article', 'nomarticle prixarticle imagearticle stock')
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

            if (item.article.stock < item.quantite) {
                return res.status(400).json({ 
                    error: `Stock insuffisant pour ${item.nomArticle}`,
                    stockDisponible: item.article.stock,
                    quantiteDemandee: item.quantite
                });
            }
        }

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

        await commande.save();

        // Mettre à jour le stock des articles
        for (const item of cart.articles) {
            await articleModel.findByIdAndUpdate(
                item.article._id,
                { $inc: { stock: -item.quantite } }
            );
        }

        // Marquer le panier comme converti
        await cart.convertirEnCommande(commande._id);

        // Populate la commande pour la réponse
        await commande.populate('utilisateur', 'nom prenom email telephone');

        res.status(201).json({
            message: 'Commande créée avec succès',
            commande,
            cart
        });
    } catch (err) {
        console.error('Erreur checkout:', err.message);
        res.status(500).json({ error: err.message });
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





