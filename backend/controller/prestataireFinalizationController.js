import prestataireModel from '../models/prestataireModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Seuls JPEG, PNG et PDF sont acceptés.'));
    }
  }
});

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
    
    res.status(200).json({
      success: true,
      message: 'Document uploadé avec succès',
      url: fileUrl,
      documentType: documentType,
      filename: req.file.filename
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
    
    res.status(200).json({
      success: true,
      message: 'Profil finalisé avec succès',
      prestataire: {
        id: updatedPrestataire._id,
        status: updatedPrestataire.status,
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
    
    const prestataire = await prestataireModel.findById(id);
    if (!prestataire) {
      return res.status(404).json({ 
        error: 'Prestataire non trouvé' 
      });
    }
    
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

// 🎯 EXPORT DU MIDDLEWARE MULTER
export { upload };
