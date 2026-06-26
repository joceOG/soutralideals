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
