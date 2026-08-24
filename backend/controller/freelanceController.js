import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "cloudinary";
import freelanceModel from "../models/freelanceModel.js";
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
import { isAdmin, assertAdmin } from '../utils/accessControl.js';
import { pickFields } from '../utils/pickFields.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { buildRecensementCreateFields, isRecensementRequest, assertRecensementAgent } from '../utils/recensementPolicy.js';
import { uploadKycToCloudinary } from '../utils/kycAccess.js';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FREELANCE_OWNER_FIELDS = [
  'name', 'job', 'category', 'hourlyRate', 'description', 'location', 'phoneNumber',
  'experienceLevel', 'availabilityStatus', 'workingHours', 'skills',
  'preferredCategories', 'minimumProjectBudget', 'maxProjectsPerMonth', 'portfolioItems',
];

const FREELANCE_JSON_FIELDS = ['skills', 'preferredCategories', 'portfolioItems'];

// ✅ Créer un freelance (Modèle sdealsapp)
export const createFreelance = async (req, res) => {
  try {
    const denied = assertRecensementAgent(req);
    if (denied) {
      return res.status(denied.status).json({ error: denied.error });
    }

    const {
      utilisateur,
      name,
      job,
      category,
      hourlyRate,
      description,
      location,
      phoneNumber,
      experienceLevel,
      availabilityStatus,
      workingHours,
      skills,
      preferredCategories,
      minimumProjectBudget,
      maxProjectsPerMonth,
      portfolioItems
    } = req.body;

    const ownerId =
      (isAdmin(req) || isRecensementRequest(req)) && utilisateur
        ? utilisateur
        : req.utilisateur._id.toString();

    // ✅ Upload de fichiers avec structure sdealsapp
    const uploads = {};
    let imagePath = "";
    
    // Upload photo principale (équivalent imagePath)
    if (req.files?.profileImage?.[0]) {
      const result = await cloudinary.v2.uploader.upload(req.files.profileImage[0].path, {
        folder: "freelances/profiles",
      });
      imagePath = result.secure_url;
      fs.unlinkSync(req.files.profileImage[0].path);
    }
    
    // Upload documents de vérification
    const verificationDocs = {};
    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const { ref } = await uploadKycToCloudinary(
          req.files[field][0].path,
          "freelances/verification",
        );
        verificationDocs[field] = ref;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // ✅ Création freelance avec modèle sdealsapp
    const newFreelance = new freelanceModel({
      // Champs de base
      utilisateur: new mongoose.Types.ObjectId(ownerId),
      name,
      job,
      category,
      imagePath,
      
      // Système de performance
      rating: 0,
      completedJobs: 0,
      isTopRated: false,
      isFeatured: false,
      isNew: true,
      responseTime: 24,
      
      // Compétences et tarification  
      skills: skills ? (Array.isArray(skills) ? skills : JSON.parse(skills)) : [],
      hourlyRate: parseFloat(hourlyRate),
      description,
      
      // Informations professionnelles
      experienceLevel: experienceLevel || 'Débutant',
      availabilityStatus: availabilityStatus || 'Disponible',
      workingHours: workingHours || 'Temps partiel',
      
      // Contact et localisation
      location,
      phoneNumber,
      
      // Portfolio
      portfolioItems: portfolioItems ? JSON.parse(portfolioItems) : [],
      
      // Documents de vérification
      verificationDocuments: {
        ...verificationDocs,
        isVerified: false
      },
      
      // Statistiques business
      totalEarnings: 0,
      currentProjects: 0,
      clientSatisfaction: 0,
      
      // Préférences
      preferredCategories: preferredCategories ? JSON.parse(preferredCategories) : [category],
      minimumProjectBudget: parseFloat(minimumProjectBudget) || 0,
      maxProjectsPerMonth: parseInt(maxProjectsPerMonth) || 10,
      
      // Activité
      lastActive: new Date(),
      joinedDate: new Date(),
      profileViews: 0,
      
      // Statut du compte
      accountStatus: 'Pending',
      subscriptionType: 'Free',
      status: 'pending',
    });

    const recensement = buildRecensementCreateFields(req, { defaultStatus: 'pending' });
    if (recensement.source) newFreelance.source = recensement.source;
    if (recensement.status) newFreelance.status = recensement.status;
    if (recensement.recenseur) newFreelance.recenseur = recensement.recenseur;
    if (recensement.dateRecensement) {
      newFreelance.dateRecensement = recensement.dateRecensement;
    }

    await newFreelance.save();
    
    // ✅ Populer les références pour la réponse
    const populatedFreelance = await freelanceModel.findById(newFreelance._id)
      .populate("utilisateur");
    
    res.status(201).json(populatedFreelance);
  } catch (err) {
    console.error("Erreur création freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire tous les freelances
export const getAllFreelances = async (req, res) => {
  try {
    // ✅ Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Tri
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    // ✅ Filtre statut (catalogue public si non authentifié)
    const filter = applyProPublicFilter(req, {});
    if (req.query.availabilityStatus) {
      filter.availabilityStatus = req.query.availabilityStatus;
    }

    const freelances = await freelanceModel.find(filter)
      .populate("utilisateur")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // ✅ Compter le total pour la pagination
    const total = await freelanceModel.countDocuments(filter);

    res.status(200).json({
      freelances,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    });
  } catch (err) {
    console.error("Erreur récupération freelances:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Lire freelance par ID
export const getFreelanceById = async (req, res) => {
  try {
    const { id } = req.params;

    // STAB-12C : ObjectId invalide → 404 (pas CastError 500)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }

    // Le modèle Freelance n'a PAS de champ `service` (contrairement à Prestataire).
    // populate('service') → StrictPopulateError → 500 systématique.
    const freelance = await freelanceModel.findById(id).populate("utilisateur");

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    if (!canAccessProProfile(req, freelance)) {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }

    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur lecture freelance:", err.message);
    if (err?.name === 'CastError' || err?.name === 'StrictPopulateError') {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }
    res.status(500).json({ error: "Impossible de charger ce profil" });
  }
};

// ✅ Mettre à jour un freelance (Modèle sdealsapp)
export const updateFreelance = async (req, res) => {
  try {
    const body = pickFields(req.body, FREELANCE_OWNER_FIELDS);

    const updates = { lastActive: new Date() };

    if (body.name) updates.name = body.name;
    if (body.job) updates.job = body.job;
    if (body.category) updates.category = body.category;
    if (body.hourlyRate) updates.hourlyRate = parseFloat(body.hourlyRate);
    if (body.description) updates.description = body.description;
    if (body.location) updates.location = body.location;
    if (body.phoneNumber) updates.phoneNumber = body.phoneNumber;
    if (body.experienceLevel) updates.experienceLevel = body.experienceLevel;
    if (body.availabilityStatus) updates.availabilityStatus = body.availabilityStatus;
    if (body.workingHours) updates.workingHours = body.workingHours;
    if (body.skills) {
      updates.skills = Array.isArray(body.skills) ? body.skills : JSON.parse(body.skills);
    }
    if (body.preferredCategories) {
      updates.preferredCategories = typeof body.preferredCategories === 'string'
        ? JSON.parse(body.preferredCategories)
        : body.preferredCategories;
    }
    if (body.minimumProjectBudget) updates.minimumProjectBudget = parseFloat(body.minimumProjectBudget);
    if (body.maxProjectsPerMonth) updates.maxProjectsPerMonth = parseInt(body.maxProjectsPerMonth, 10);
    if (body.portfolioItems) {
      updates.portfolioItems = typeof body.portfolioItems === 'string'
        ? JSON.parse(body.portfolioItems)
        : body.portfolioItems;
    }

    // ✅ Upload photo principale
    if (req.files?.profileImage?.[0]) {
      const result = await cloudinary.v2.uploader.upload(req.files.profileImage[0].path, {
        folder: "freelances/profiles",
      });
      updates.imagePath = result.secure_url;
      fs.unlinkSync(req.files.profileImage[0].path);
    }

    // ✅ Upload documents de vérification
    const verificationUpdates = {};
    for (const field of ["cni1", "cni2", "selfie"]) {
      if (req.files?.[field]?.[0]) {
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "freelances/verification",
        });
        verificationUpdates[`verificationDocuments.${field}`] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // Fusionner les updates de vérification
    Object.assign(updates, verificationUpdates);

    const freelance = await freelanceModel.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    }).populate("utilisateur");

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur mise à jour freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Nouvelles méthodes spécifiques au modèle sdealsapp

// Mettre à jour la note d'un freelance (admin uniquement — notes publiques via avis)
export const updateFreelanceRating = async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return;

    const { rating } = req.body;
    const freelanceId = req.params.id;

    const freelance = await freelanceModel.findById(freelanceId);
    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    // Calculer nouvelle moyenne (logique simplifiée)
    const newRating = ((freelance.rating * freelance.completedJobs) + parseFloat(rating)) / (freelance.completedJobs + 1);

    await freelanceModel.findByIdAndUpdate(freelanceId, {
      rating: newRating,
      $inc: { completedJobs: 1, totalEarnings: freelance.hourlyRate },
      lastActive: new Date()
    });

    res.status(200).json({ message: "Note mise à jour avec succès", newRating });
  } catch (err) {
    console.error("Erreur mise à jour note:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Promouvoir un freelance (top rated, featured)
export const promoteFreelance = async (req, res) => {
  try {
    const { isTopRated, isFeatured } = req.body;
    const freelanceId = req.params.id;

    const updates = {};
    if (typeof isTopRated !== "undefined") updates.isTopRated = isTopRated;
    if (typeof isFeatured !== "undefined") updates.isFeatured = isFeatured;

    const freelance = await freelanceModel.findByIdAndUpdate(freelanceId, updates, { new: true })
      .populate("utilisateur");

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur promotion freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Obtenir freelances par catégorie (pour sdealsapp)
export const getFreelancesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, sortBy = 'rating' } = req.query;

    let sortOptions = {};
    switch(sortBy) {
      case 'rating': sortOptions = { rating: -1 }; break;
      case 'completedJobs': sortOptions = { completedJobs: -1 }; break;
      case 'newest': sortOptions = { joinedDate: -1 }; break;
      default: sortOptions = { rating: -1 };
    }

    const freelances = await freelanceModel.find(
      applyProPublicFilter(req, { category }),
    )
    .populate("utilisateur")
    .sort(sortOptions)
    .limit(parseInt(limit));

    res.status(200).json(freelances);
  } catch (err) {
    console.error("Erreur récupération par catégorie:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Recherche freelances (pour sdealsapp)
export const searchFreelances = async (req, res) => {
  try {
    const { query, category, minRating, maxHourlyRate } = req.query;

    // ✅ Pagination avec limite par défaut
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 résultats
    const skip = (page - 1) * limit;

    let searchCriteria = applyProPublicFilter(req, {});

    if (query) {
      const safeQuery = escapeRegex(query);
      searchCriteria.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { job: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } },
        { skills: { $in: [new RegExp(safeQuery, 'i')] } }
      ];
    }

    if (category) searchCriteria.category = category;
    if (minRating) searchCriteria.rating = { $gte: parseFloat(minRating) };
    if (maxHourlyRate) searchCriteria.hourlyRate = { $lte: parseFloat(maxHourlyRate) };

    // ✅ Tri personnalisable
    const sortBy = req.query.sortBy || 'rating';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortOptions = {};
    
    if (sortBy === 'rating') {
      sortOptions.rating = sortOrder;
      sortOptions.completedJobs = -1; // Tri secondaire
    } else if (sortBy === 'price') {
      sortOptions.hourlyRate = sortOrder;
    } else if (sortBy === 'recent') {
      sortOptions.createdAt = sortOrder;
    } else {
      sortOptions[sortBy] = sortOrder;
    }

    const freelances = await freelanceModel.find(searchCriteria)
      .populate("utilisateur")
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    // ✅ Compter le total
    const total = await freelanceModel.countDocuments(searchCriteria);

    res.status(200).json({
      freelances,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    });
  } catch (err) {
    console.error("Erreur recherche freelances:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Supprimer un freelance
export const deleteFreelance = async (req, res) => {
  try {
    const freelance = await freelanceModel.findByIdAndDelete(req.params.id);
    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

    res.status(200).json({ message: "Freelance supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 OPTION C - Récupérer les freelances en attente
export const getPendingFreelances = async (req, res) => {
  try {
    const freelances = await freelanceModel.find({ status: "pending" })
      .populate("utilisateur")
      .populate("recenseur", "nom prenom telephone")
      .sort({ dateRecensement: -1 });

    res.status(200).json(freelances);
  } catch (err) {
    console.error("Erreur récupération freelances pending:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 OPTION C - Valider un freelance
export const validateFreelance = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const freelance = await freelanceModel.findById(id);
    
    if (!freelance) {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }

    if (freelance.status !== 'pending') {
      return res.status(400).json({ error: "Freelance déjà traité" });
    }

    freelance.status = 'active';
    freelance.accountStatus = 'Active';
    freelance.verificationDocuments.isVerified = true;
    freelance.validePar = adminId;
    freelance.dateValidation = new Date();

    await freelance.save();

    const populatedFreelance = await freelanceModel.findById(id)
      .populate("utilisateur")
      .populate("recenseur", "nom prenom");

    res.status(200).json({
      success: true,
      message: "Freelance validé avec succès",
      freelance: populatedFreelance
    });
  } catch (err) {
    console.error("Erreur validation freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// 🆕 OPTION C - Rejeter un freelance
export const rejectFreelance = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;
    const adminId = req.user._id;

    const freelance = await freelanceModel.findById(id);
    
    if (!freelance) {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }

    if (freelance.status !== 'pending') {
      return res.status(400).json({ error: "Freelance déjà traité" });
    }

    freelance.status = 'rejected';
    freelance.accountStatus = 'Suspended';
    freelance.motifRejet = motif || 'Non spécifié';
    freelance.validePar = adminId;
    freelance.dateValidation = new Date();

    await freelance.save();

    res.status(200).json({
      success: true,
      message: "Freelance rejeté",
      freelance
    });
  } catch (err) {
    console.error("Erreur rejet freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};
