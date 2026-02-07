import { Router } from 'express';
import {
    getCartByUserId,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    applyPromoCode,
    updateDeliveryAddress,
    checkout,
    getAllCarts,
    getCartStats,
    cleanupExpiredCarts
} from '../controller/cartController.js';
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import auth from '../middleware/authMiddleware.js';
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
import auth from '../middleware/authMiddleware.js';
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)

const cartRouter = Router();

// ✅ ROUTES UTILISATEUR
// Obtenir le panier d'un utilisateur
cartRouter.get('/cart/user/:userId', getCartByUserId);

// Ajouter un article au panier
cartRouter.post('/cart/add', addToCart);

// Modifier la quantité d'un article
cartRouter.put('/cart/user/:userId/item/:itemId', updateCartItemQuantity);

// Retirer un article du panier
cartRouter.delete('/cart/user/:userId/item/:itemId', removeFromCart);

// Vider le panier
cartRouter.delete('/cart/user/:userId/clear', clearCart);

// Appliquer un code promo
cartRouter.post('/cart/user/:userId/promo', applyPromoCode);

// Ajouter/Modifier l'adresse de livraison
cartRouter.put('/cart/user/:userId/address', updateDeliveryAddress);

// Checkout - Convertir le panier en commande
cartRouter.post('/cart/user/:userId/checkout', checkout);

// ✅ ROUTES ADMIN
// Obtenir tous les paniers (admin)
cartRouter.get('/carts', getAllCarts);

// Statistiques des paniers (admin)
cartRouter.get('/carts/stats', getCartStats);

// Nettoyer les paniers expirés (cron job)
cartRouter.post('/carts/cleanup', cleanupExpiredCarts);

export default cartRouter;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
import auth from '../middleware/authMiddleware.js';
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)

const cartRouter = Router();

// ✅ ROUTES UTILISATEUR (protégées)
cartRouter.get('/cart/user/:userId', auth, getCartByUserId);
cartRouter.post('/cart/add', auth, addToCart);
cartRouter.put('/cart/user/:userId/item/:itemId', auth, updateCartItemQuantity);
cartRouter.delete('/cart/user/:userId/item/:itemId', auth, removeFromCart);
cartRouter.delete('/cart/user/:userId/clear', auth, clearCart);
cartRouter.post('/cart/user/:userId/promo', auth, applyPromoCode);
cartRouter.put('/cart/user/:userId/address', auth, updateDeliveryAddress);
cartRouter.post('/cart/user/:userId/checkout', auth, checkout);

// ✅ ROUTES ADMIN
cartRouter.get('/carts', auth, getAllCarts);
cartRouter.get('/carts/stats', auth, getCartStats);
cartRouter.post('/carts/cleanup', auth, cleanupExpiredCarts);

export default cartRouter;
<<<<<<< HEAD
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
>>>>>>> da08acd (Dashboard Complet and Merge)





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
