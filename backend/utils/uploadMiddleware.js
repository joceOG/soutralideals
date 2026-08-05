import multer from 'multer';

const DEFAULT_LIMITS = {
  fileSize: 10 * 1024 * 1024,
  files: 10,
};

const AUDIO_SIZE_LIMIT = 15 * 1024 * 1024; // 15 Mo pour les vocaux

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

function mediaFilter(_req, file, cb) {
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('audio/')
  ) {
    cb(null, true);
  } else {
    cb(new Error('Seules les images et les fichiers audio sont autorisés.'), false);
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

/** Upload images + audio pour les messages (photo du problème + vocal). */
export const mediaUpload = multer({
  dest: 'uploads/',
  limits: { fileSize: AUDIO_SIZE_LIMIT, files: 1 },
  fileFilter: mediaFilter,
});
