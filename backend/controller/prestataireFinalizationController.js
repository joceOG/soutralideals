import prestataireModel from '../models/prestataireModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { isAdmin, isSelf } from '../middleware/entityAccess.js';

// 🎯 CONFIGURATION MULTER POUR UPLOAD
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/prestataires/documents';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé. Seuls JPEG, PNG et PDF sont acceptés.'));
  }
});

const DOCUMENT_FIELD_MAP = {
  cniRecto: 'cni1',
  cni_recto: 'cni1',
  cniVerso: 'cni2',
  cni_verso: 'cni2',
  selfie: 'selfie',
  insurance: 'attestationAssurance',
};

function applyDocumentToPrestataire(prestataire, documentType, fileUrl) {
  const field = DOCUMENT_FIELD_MAP[documentType];
  if (field) {
    prestataire[field] = fileUrl;
    return;
  }
  if (documentType.startsWith('certificate')) {
    if (!Array.isArray(prestataire.diplomeCertificat)) {
      prestataire.diplomeCertificat = [];
    }
    prestataire.diplomeCertificat.push(fileUrl);
  }
}

async function assertPrestataireAccess(req, prestataireId) {
  const prestataire = await prestataireModel.findById(prestataireId);
  if (!prestataire) {
    return { error: { status: 404, message: 'Prestataire non trouvé' } };
  }
  if (isAdmin(req)) return { prestataire };
  const ownerId = prestataire.utilisateur?.toString();
  if (!isSelf(req, ownerId)) {
    return { error: { status: 403, message: 'Accès refusé : profil prestataire invalide.' } };
  }
  return { prestataire };
}

// 🎯 UPLOAD D'UN DOCUMENT
export const uploadDocument = async (req, res) => {
  try {
    const { prestataireId, documentType } = req.body;

    if (!prestataireId || !documentType) {
      return res.status(400).json({
        error: 'prestataireId et documentType requis'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Aucun fichier fourni'
      });
    }

    const access = await assertPrestataireAccess(req, prestataireId);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const prestataire = access.prestataire;
    const fileUrl = `/uploads/prestataires/documents/${req.file.filename}`;

    applyDocumentToPrestataire(prestataire, documentType, fileUrl);
    prestataire.syncFinalizationFromDocuments();
    await prestataire.save();

    res.status(200).json({
      success: true,
      message: 'Document uploadé avec succès',
      url: fileUrl,
      documentType,
      filename: req.file.filename,
      status: prestataire.status,
    });
  } catch (error) {
    console.error('❌ Erreur upload document:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'upload du document'
    });
  }
};

// 🎯 FINALISATION DU PROFIL PRESTATAIRE
export const finalizePrestataireProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const access = await assertPrestataireAccess(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const prestataire = access.prestataire;

    const allowedFields = [
      'cni1', 'cni2', 'selfie', 'localisation', 'localisationmaps',
      'diplomeCertificat', 'attestationAssurance', 'numeroCNI',
      'rayonIntervention', 'zoneIntervention', 'description',
    ];

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        prestataire[field] = updateData[field];
      }
    }

    prestataire.syncFinalizationFromDocuments();
    await prestataire.save();

    const finalizationResult = prestataire.calculateFinalizationStatus();

    res.status(200).json({
      success: true,
      message: 'Profil finalisé avec succès',
      prestataire: {
        id: prestataire._id,
        status: prestataire.status,
        finalizationStatus: finalizationResult
      }
    });
  } catch (error) {
    console.error('❌ Erreur finalisation profil:', error);
    res.status(500).json({
      error: 'Erreur lors de la finalisation du profil'
    });
  }
};

// 🎯 RÉCUPÉRER LE STATUT DE FINALISATION
export const getFinalizationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const access = await assertPrestataireAccess(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const prestataire = access.prestataire;
    const finalizationResult = prestataire.calculateFinalizationStatus();

    res.status(200).json({
      success: true,
      status: prestataire.status,
      finalizationStatus: finalizationResult
    });
  } catch (error) {
    console.error('❌ Erreur récupération statut:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du statut'
    });
  }
};

// 🎯 RÉCUPÉRER LES DOCUMENTS D'UN PRESTATAIRE
export const getPrestataireDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    const access = await assertPrestataireAccess(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const prestataire = await prestataireModel.findById(id)
      .populate('utilisateur', 'nom prenom telephone email')
      .populate('service', 'nomservice')
      .select('cni1 cni2 selfie diplomeCertificat attestationAssurance finalizationStatus status source');

    res.status(200).json({
      success: true,
      prestataire: {
        id: prestataire._id,
        utilisateur: prestataire.utilisateur,
        service: prestataire.service,
        status: prestataire.status,
        source: prestataire.source,
        documents: {
          cni1: prestataire.cni1,
          cni2: prestataire.cni2,
          selfie: prestataire.selfie,
          certificates: prestataire.diplomeCertificat,
          insurance: prestataire.attestationAssurance,
        },
        finalizationStatus: prestataire.finalizationStatus
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération documents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
};

export { upload };
