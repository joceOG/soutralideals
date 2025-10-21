import prestataireModel from '../models/prestataireModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
<<<<<<< HEAD
<<<<<<< HEAD
import { isAdmin, isSelf } from '../middleware/entityAccess.js';
=======
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)

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

<<<<<<< HEAD
<<<<<<< HEAD
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
=======
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
<<<<<<< HEAD
<<<<<<< HEAD

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

=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls JPEG, PNG et PDF sont acceptés.'));
    }
  }
});

<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
// 🎯 UPLOAD D'UN DOCUMENT
export const uploadDocument = async (req, res) => {
  try {
    const { prestataireId, documentType } = req.body;
<<<<<<< HEAD
<<<<<<< HEAD

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

=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    
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
    
    // Vérifier que le prestataire existe
    const prestataire = await prestataireModel.findById(prestataireId);
    if (!prestataire) {
      return res.status(404).json({ 
        error: 'Prestataire non trouvé' 
      });
    }
    
    // Construire l'URL du fichier
    const fileUrl = `/uploads/prestataires/documents/${req.file.filename}`;
    
    console.log(`📤 Document uploadé: ${documentType} pour prestataire ${prestataireId}`);
    console.log(`📁 Fichier: ${req.file.filename}`);
    
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    res.status(200).json({
      success: true,
      message: 'Document uploadé avec succès',
      url: fileUrl,
<<<<<<< HEAD
<<<<<<< HEAD
      documentType,
      filename: req.file.filename,
      status: prestataire.status,
    });
  } catch (error) {
    console.error('❌ Erreur upload document:', error);
    res.status(500).json({
      error: 'Erreur lors de l\'upload du document'
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
      documentType: documentType,
      filename: req.file.filename
    });
    
  } catch (error) {
    console.error('❌ Erreur upload document:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'upload du document' 
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    });
  }
};

// 🎯 FINALISATION DU PROFIL PRESTATAIRE
export const finalizePrestataireProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
<<<<<<< HEAD
<<<<<<< HEAD

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

=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    
    console.log(`🎯 Finalisation profil prestataire: ${id}`);
    console.log(`📊 Données:`, updateData);
    
    // Vérifier que le prestataire existe
    const prestataire = await prestataireModel.findById(id);
    if (!prestataire) {
      return res.status(404).json({ 
        error: 'Prestataire non trouvé' 
      });
    }
    
    // Mettre à jour le statut de finalisation
    const finalizationStatus = updateData.finalizationStatus || {};
    
    // Calculer si le profil est complet
    const requiredDocs = finalizationStatus.cniUploaded && 
                        finalizationStatus.selfieUploaded && 
                        finalizationStatus.locationSet;
    
    // Mettre à jour le statut
    const newStatus = requiredDocs ? 'pending' : 'incomplete';
    
    // Préparer les données de mise à jour
    const updateFields = {
      ...updateData,
      status: newStatus,
      finalizationStatus: {
        ...prestataire.finalizationStatus,
        ...finalizationStatus,
        isComplete: requiredDocs
      }
    };
    
    // Mettre à jour le prestataire
    const updatedPrestataire = await prestataireModel.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );
    
    // Calculer le statut de finalisation
    const finalizationResult = updatedPrestataire.calculateFinalizationStatus();
    
    console.log(`✅ Profil finalisé:`, {
      status: updatedPrestataire.status,
      isComplete: finalizationResult.isComplete,
      requiredDocs: finalizationResult.requiredDocs
    });
    
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    res.status(200).json({
      success: true,
      message: 'Profil finalisé avec succès',
      prestataire: {
<<<<<<< HEAD
<<<<<<< HEAD
        id: prestataire._id,
        status: prestataire.status,
        finalizationStatus: finalizationResult
      }
    });
  } catch (error) {
    console.error('❌ Erreur finalisation profil:', error);
    res.status(500).json({
      error: 'Erreur lors de la finalisation du profil'
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
        id: updatedPrestataire._id,
        status: updatedPrestataire.status,
        finalizationStatus: finalizationResult
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur finalisation profil:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la finalisation du profil' 
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    });
  }
};

// 🎯 RÉCUPÉRER LE STATUT DE FINALISATION
export const getFinalizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
<<<<<<< HEAD
<<<<<<< HEAD

    const access = await assertPrestataireAccess(req, id);
    if (access.error) {
      return res.status(access.error.status).json({ error: access.error.message });
    }

    const prestataire = access.prestataire;
    const finalizationResult = prestataire.calculateFinalizationStatus();

=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    
    const prestataire = await prestataireModel.findById(id);
    if (!prestataire) {
      return res.status(404).json({ 
        error: 'Prestataire non trouvé' 
      });
    }
    
    const finalizationResult = prestataire.calculateFinalizationStatus();
    
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    res.status(200).json({
      success: true,
      status: prestataire.status,
      finalizationStatus: finalizationResult
    });
<<<<<<< HEAD
<<<<<<< HEAD
  } catch (error) {
    console.error('❌ Erreur récupération statut:', error);
    res.status(500).json({
      error: 'Erreur lors de la récupération du statut'
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    
  } catch (error) {
    console.error('❌ Erreur récupération statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut' 
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
    });
  }
};

<<<<<<< HEAD
<<<<<<< HEAD
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

=======
// 🎯 EXPORT DU MIDDLEWARE MULTER
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
// 🎯 EXPORT DU MIDDLEWARE MULTER
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
export { upload };
