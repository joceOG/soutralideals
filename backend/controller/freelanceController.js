import mongoose from "mongoose";
import fs from "fs";
import cloudinary from "cloudinary";
import freelanceModel from "../models/freelanceModel.js";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
import { applyProPublicFilter, canAccessProProfile } from "../utils/proPublicFilter.js";
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

cloudinary.v2.config({
<<<<<<< HEAD
<<<<<<< HEAD
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
=======

cloudinary.v2.config({
<<<<<<< HEAD
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
>>>>>>> a74433b (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
=======
  cloud_name: "dm0c8st6k",
  api_key: "541481188898557",
  api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
>>>>>>> 1656df6 (feat(backend): Sentry, bootstrap env, wallet, services freelance et sécurité)
});

// ✅ Créer un freelance (Modèle sdealsapp)
export const createFreelance = async (req, res) => {
  try {
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
        const result = await cloudinary.v2.uploader.upload(req.files[field][0].path, {
          folder: "freelances/verification",
        });
        verificationDocs[field] = result.secure_url;
        fs.unlinkSync(req.files[field][0].path);
      }
    }

    // ✅ Création freelance avec modèle sdealsapp
    const newFreelance = new freelanceModel({
      // Champs de base
      utilisateur,
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      subscriptionType: 'Free',
      status: 'pending',
    });

    if (req.body.source) {
      newFreelance.source = req.body.source;
    }

=======
      subscriptionType: 'Free'
    });

>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
      subscriptionType: 'Free',
      status: 'pending',
    });

=======
      subscriptionType: 'Free',
      status: 'pending',
    });

>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (req.body.source) {
      newFreelance.source = req.body.source;
    }

<<<<<<< HEAD
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
      subscriptionType: 'Free'
    });

>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    // ✅ Filtre statut (catalogue public si non authentifié)
    const filter = applyProPublicFilter(req, {});
=======
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
    // ✅ Filtre statut
    const filter = {};
    if (req.query.status) {
      filter.accountStatus = req.query.status;
    }
<<<<<<< HEAD
<<<<<<< HEAD
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    // ✅ Filtre statut (catalogue public si non authentifié)
    const filter = applyProPublicFilter(req, {});
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
    // ✅ Filtre statut (catalogue public si non authentifié)
    const filter = applyProPublicFilter(req, {});
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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
    const freelance = await freelanceModel.findById(req.params.id)
      .populate("utilisateur")
      .populate({
        path: "service",
        populate: {
          path: "categorie",
          populate: { path: "groupe" }
        }
      });

    if (!freelance) return res.status(404).json({ error: "Freelance non trouvé" });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    if (!canAccessProProfile(req, freelance)) {
      return res.status(404).json({ error: "Freelance non trouvé" });
    }

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    res.status(200).json(freelance);
  } catch (err) {
    console.error("Erreur lecture freelance:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Mettre à jour un freelance (Modèle sdealsapp)
export const updateFreelance = async (req, res) => {
  try {
    const {
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
      portfolioItems,
      rating,
      completedJobs,
      isTopRated,
      isFeatured,
      responseTime,
      accountStatus,
      subscriptionType
    } = req.body;

    const updates = {
      ...(name && { name }),
      ...(job && { job }),
      ...(category && { category }),
      ...(hourlyRate && { hourlyRate: parseFloat(hourlyRate) }),
      ...(description && { description }),
      ...(location && { location }),
      ...(phoneNumber && { phoneNumber }),
      ...(experienceLevel && { experienceLevel }),
      ...(availabilityStatus && { availabilityStatus }),
      ...(workingHours && { workingHours }),
      ...(skills && { skills: Array.isArray(skills) ? skills : JSON.parse(skills) }),
      ...(preferredCategories && { preferredCategories: JSON.parse(preferredCategories) }),
      ...(minimumProjectBudget && { minimumProjectBudget: parseFloat(minimumProjectBudget) }),
      ...(maxProjectsPerMonth && { maxProjectsPerMonth: parseInt(maxProjectsPerMonth) }),
      ...(portfolioItems && { portfolioItems: JSON.parse(portfolioItems) }),
      ...(rating && { rating: parseFloat(rating) }),
      ...(completedJobs && { completedJobs: parseInt(completedJobs) }),
      ...(typeof isTopRated !== "undefined" && { isTopRated: isTopRated === "true" || isTopRated === true }),
      ...(typeof isFeatured !== "undefined" && { isFeatured: isFeatured === "true" || isFeatured === true }),
      ...(responseTime && { responseTime: parseInt(responseTime) }),
      ...(accountStatus && { accountStatus }),
      ...(subscriptionType && { subscriptionType }),
      lastActive: new Date()
    };

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

// Mettre à jour la note d'un freelance
export const updateFreelanceRating = async (req, res) => {
  try {
    const { rating, clientId } = req.body;
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const freelances = await freelanceModel.find(
      applyProPublicFilter(req, { category }),
    )
=======
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
    const freelances = await freelanceModel.find({ 
      category: category,
      accountStatus: 'Active'
    })
<<<<<<< HEAD
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const freelances = await freelanceModel.find(
      applyProPublicFilter(req, { category }),
    )
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const freelances = await freelanceModel.find(
      applyProPublicFilter(req, { category }),
    )
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    let searchCriteria = applyProPublicFilter(req, {});
=======
    let searchCriteria = { accountStatus: 'Active' };
>>>>>>> 22ecb18 (Dashboard Complet and Merge)
=======
    let searchCriteria = { accountStatus: 'Active' };
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    let searchCriteria = applyProPublicFilter(req, {});
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    let searchCriteria = { accountStatus: 'Active' };
>>>>>>> 1ca350b (Dashboard Complet and Merge)
=======
    let searchCriteria = applyProPublicFilter(req, {});
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { job: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { skills: { $in: [new RegExp(query, 'i')] } }
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const freelances = await freelanceModel.find({ status: "pending" })
=======
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
    const freelances = await freelanceModel.find({ 
      status: 'pending',
      source: 'sdealsidentification'
    })
<<<<<<< HEAD
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const freelances = await freelanceModel.find({ status: "pending" })
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const freelances = await freelanceModel.find({ status: "pending" })
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const adminId = req.user._id;
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const adminId = req.user._id;
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const adminId = req.user._id;
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    const adminId = req.user._id;
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> e19f1be (feat: Backend complet pour système prestataire et panier)
=======
    const adminId = req.user._id;
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
    const adminId = req.body.adminId || req.user?._id;
>>>>>>> 1cbdf58 (Amelioration du Dashboard Prestataire 2026)
=======
    const adminId = req.user._id;
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)

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
