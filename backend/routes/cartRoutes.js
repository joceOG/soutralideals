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





