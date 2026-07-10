import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import { authAdmin } from '../middleware/authMiddleware.js';
import {
  createFreelanceService,
  updateFreelanceService,
  getFreelanceServiceById,
  listFreelanceServices,
  getHomeFreelanceServices,
  deleteFreelanceService,
} from '../controller/freelanceServiceController.js';

const router = Router();

router.get('/freelance-services/home', getHomeFreelanceServices);
router.get('/freelance-services', listFreelanceServices);
router.get('/freelance-services/:id', getFreelanceServiceById);
router.post('/freelance-services', ...authAdmin, imageUpload.single('coverImage'), createFreelanceService);
router.put('/freelance-services/:id', ...authAdmin, imageUpload.single('coverImage'), updateFreelanceService);
router.delete('/freelance-services/:id', ...authAdmin, deleteFreelanceService);

export default router;
