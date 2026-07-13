import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createFreelanceService,
  updateFreelanceService,
  getFreelanceServiceById,
  listFreelanceServices,
  getHomeFreelanceServices,
  deleteFreelanceService,
} from '../controller/freelanceServiceController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

const router = Router();

router.get('/freelance-services/home', getHomeFreelanceServices);
router.get('/freelance-services', listFreelanceServices);
router.get('/freelance-services/:id', getFreelanceServiceById);
router.post('/freelance-services', upload.single('coverImage'), createFreelanceService);
router.put('/freelance-services/:id', upload.single('coverImage'), updateFreelanceService);
router.delete('/freelance-services/:id', deleteFreelanceService);

export default router;
