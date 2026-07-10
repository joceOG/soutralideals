import multer from 'multer';

const DEFAULT_LIMITS = {
  fileSize: 10 * 1024 * 1024,
  files: 10,
};

function imageFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées.'), false);
  }
}

function imageOrPdfFilter(_req, file, cb) {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les images et PDF sont autorisés.'), false);
  }
}

/** Upload images (10 Mo max). */
export const imageUpload = multer({
  dest: 'uploads/',
  limits: DEFAULT_LIMITS,
  fileFilter: imageFilter,
});

/** Upload images + PDF (documents vendeur/prestataire). */
export const documentUpload = multer({
  dest: 'uploads/',
  limits: DEFAULT_LIMITS,
  fileFilter: imageOrPdfFilter,
});
