import express from 'express';
import { authFieldRecensementV1 } from '../middleware/authFieldRecensementV1.js';
import { requireFieldRecenseur } from '../middleware/requireFieldRecenseur.js';
import { requireFieldAdmin } from '../middleware/requireFieldAdmin.js';
import { requireFieldRecensementV1Enabled } from '../middleware/requireFieldRecensementV1Enabled.js';
import {
  requireFieldAgentAppBuild,
  requireFieldAppBuildUnlessAdmin,
} from '../middleware/requireFieldAppBuild.js';
import {
  fieldRecensementV1ErrorHandler,
  fieldRecensementV1NotFound,
} from '../middleware/fieldRecensementV1ErrorHandler.js';
import { imageUpload } from '../utils/uploadMiddleware.js';
import { FieldRecensementApiError } from '../utils/FieldRecensementApiError.js';
import { cleanupUploadedFiles } from '../utils/fieldRecensementV1Respond.js';
import {
  approveFieldRecensementController,
  createFieldRecensementController,
  getAdminFieldRecensementQueueStatsController,
  getFieldRecensementByIdController,
  listAdminFieldRecensementQueueController,
  listMineFieldRecensementsController,
  patchFieldRecensementController,
  publishFieldRecensementController,
  reactivateFieldRecensementController,
  rejectFieldRecensementController,
  requestCorrectionController,
  resubmitFieldRecensementController,
  suspendFieldRecensementController,
} from '../controller/fieldRecensementV1Controller.js';
import {
  rateLimitAdmin,
  rateLimitCorrection,
  rateLimitCreate,
  rateLimitRead,
} from '../middleware/fieldRecensementRateLimit.js';

const router = express.Router();
const upload = imageUpload.fields([{ name: 'profilePhoto', maxCount: 1 }]);

function multerFieldRecensement(req, res, next) {
  upload(req, res, (err) => {
    if (!err) return next();
    cleanupUploadedFiles(req);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(FieldRecensementApiError.fromCode('RECENSEMENT_PHOTO_TOO_LARGE'));
    }
    return next(
      FieldRecensementApiError.fromCode('RECENSEMENT_PHOTO_INVALID', {
        message: 'Photo invalide ou format non accepté.',
        cause: err,
      }),
    );
  });
}

/**
 * Ordre : auth → authz → rateLimit → flag → build (agent) → multer → contrôleur.
 * Rate-limit avant Multer (pas d’écriture temporaire si 429).
 * Erreurs : fieldRecensementV1ErrorHandler (contrat R1-11).
 */
router.post(
  '/field-recensements',
  authFieldRecensementV1,
  requireFieldRecenseur,
  rateLimitCreate,
  requireFieldRecensementV1Enabled,
  requireFieldAgentAppBuild,
  multerFieldRecensement,
  createFieldRecensementController,
);

router.get(
  '/field-recensements/mine',
  authFieldRecensementV1,
  requireFieldRecenseur,
  rateLimitRead,
  requireFieldRecensementV1Enabled,
  requireFieldAgentAppBuild,
  listMineFieldRecensementsController,
);

/** R3-01 — avant toute route /:id pour éviter toute ambiguïté. */
router.get(
  '/field-recensements/admin/queue/stats',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  getAdminFieldRecensementQueueStatsController,
);

router.get(
  '/field-recensements/admin/queue',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  listAdminFieldRecensementQueueController,
);

router.post(
  '/field-recensements/:id/resubmit',
  authFieldRecensementV1,
  requireFieldRecenseur,
  rateLimitCorrection,
  requireFieldRecensementV1Enabled,
  requireFieldAgentAppBuild,
  resubmitFieldRecensementController,
);

router.post(
  '/field-recensements/:id/request-correction',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  requestCorrectionController,
);
router.post(
  '/field-recensements/:id/reject',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  rejectFieldRecensementController,
);
router.post(
  '/field-recensements/:id/approve',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  approveFieldRecensementController,
);
router.post(
  '/field-recensements/:id/publish',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  publishFieldRecensementController,
);
router.post(
  '/field-recensements/:id/suspend',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  suspendFieldRecensementController,
);
router.post(
  '/field-recensements/:id/reactivate',
  authFieldRecensementV1,
  requireFieldAdmin,
  rateLimitAdmin,
  requireFieldRecensementV1Enabled,
  reactivateFieldRecensementController,
);

router.patch(
  '/field-recensements/:id',
  authFieldRecensementV1,
  requireFieldRecenseur,
  rateLimitCorrection,
  requireFieldRecensementV1Enabled,
  requireFieldAgentAppBuild,
  multerFieldRecensement,
  patchFieldRecensementController,
);

router.get(
  '/field-recensements/:id',
  authFieldRecensementV1,
  requireFieldRecenseur,
  rateLimitRead,
  requireFieldRecensementV1Enabled,
  requireFieldAppBuildUnlessAdmin,
  getFieldRecensementByIdController,
);

router.use(fieldRecensementV1NotFound);
router.use(fieldRecensementV1ErrorHandler);

export default router;
