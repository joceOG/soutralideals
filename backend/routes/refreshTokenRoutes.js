import express from 'express';
import auth from '../middleware/authMiddleware.js';
import { refreshAccessToken, createSocketToken } from '../controller/refreshTokenController.js';

const router = express.Router();

router.post('/refresh-token', refreshAccessToken);
router.post('/socket-token', auth, createSocketToken);

export default router;
