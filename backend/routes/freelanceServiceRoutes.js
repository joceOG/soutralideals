import { Router } from 'express';
import { imageUpload } from '../utils/uploadMiddleware.js';
import auth from '../middleware/authMiddleware.js';
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
router.post('/freelance-services', auth, imageUpload.single('coverImage'), createFreelanceService);
router.put('/freelance-services/:id', auth, imageUpload.single('coverImage'), updateFreelanceService);
router.delete('/freelance-services/:id', auth, deleteFreelanceService);

export default router;
