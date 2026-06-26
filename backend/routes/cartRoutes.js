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
import auth from '../middleware/authMiddleware.js';

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





<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
