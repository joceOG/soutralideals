import { Router } from 'express';
import { getWallet, transfert, getTransactions, getWalletStats } from '../controller/walletController.js';
import auth from '../middleware/authMiddleware.js';

const walletRouter = Router();

// ✅ Toutes les routes wallet sont protégées
walletRouter.get('/wallet/user/:userId', auth, getWallet);
walletRouter.post('/wallet/transfert', auth, transfert);
walletRouter.get('/wallet/transactions/:userId', auth, getTransactions);
walletRouter.get('/wallet/stats/:userId', auth, getWalletStats);

export default walletRouter;
