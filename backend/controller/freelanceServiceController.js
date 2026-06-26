import fs from 'fs';
import mongoose from 'mongoose';
import cloudinary from 'cloudinary';
import freelanceServiceModel from '../models/freelanceServiceModel.js';
import freelanceModel from '../models/freelanceModel.js';
import serviceModel from '../models/serviceModel.js';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isFreelanceGroupName(name) {
  if (!name || typeof name !== 'string') return false;
  const n = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  return n === 'freelance';
}

function parseBool(v) {
  if (v === true || v === false) return v;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return undefined;
}

function unlinkSafe(p) {
  if (!p) return;
  try {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (_) {
    /* ignore */
  }
}

async function assertCatalogServiceInFreelanceGroup(serviceId) {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    return { ok: false, status: 400, error: 'serviceId invalide' };
  }
  const service = await serviceModel.findById(serviceId).populate({
    path: 'categorie',
    populate: { path: 'groupe' },
  });
  if (!service) {
    return { ok: false, status: 404, error: 'Service catalogue introuvable' };
  }
  const nomGroupe = service.categorie?.groupe?.nomgroupe;
  if (!isFreelanceGroupName(nomGroupe || '')) {
    return {
      ok: false,
      status: 400,
      error: 'Le service doit appartenir au groupe Freelance (catégorie liée au bon groupe).',
    };
  }
  return { ok: true, service };
}

async function assertFreelanceExists(freelanceId) {
  if (!mongoose.Types.ObjectId.isValid(freelanceId)) {
    return { ok: false, status: 400, error: 'freelanceId invalide' };
  }
  const f = await freelanceModel.findById(freelanceId);
  if (!f) {
    return { ok: false, status: 404, error: 'Freelance introuvable' };
  }
  return { ok: true, freelance: f };
}

async function uploadCoverToCloudinary(filePath) {
  const result = await cloudinary.v2.uploader.upload(filePath, {
    folder: 'freelance-services/covers',
  });
  return result.secure_url;
}

/** POST /freelance-services */
export const createFreelanceService = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const {
      freelanceId,
      serviceId,
      titleOverride,
      descriptionCourte,
      startingPrice,
      deliveryTime,
      coverImage: coverImageUrlBody,
    } = req.body;

    const fCheck = await assertFreelanceExists(freelanceId);
    if (!fCheck.ok) {
      unlinkSafe(tmpPath);
      return res.status(fCheck.status).json({ error: fCheck.error });
    }

    const sCheck = await assertCatalogServiceInFreelanceGroup(serviceId);
    if (!sCheck.ok) {
      unlinkSafe(tmpPath);
      return res.status(sCheck.status).json({ error: sCheck.error });
    }

    let coverImage = (coverImageUrlBody && String(coverImageUrlBody).trim()) || '';
    if (tmpPath) {
      coverImage = await uploadCoverToCloudinary(tmpPath);
      unlinkSafe(tmpPath);
    }
    if (!coverImage) {
      unlinkSafe(tmpPath);
      return res.status(400).json({
        error: 'Image requise',
        message: 'Fournir coverImage (URL) ou un fichier coverImage en multipart.',
      });
    }

    const price = parseFloat(startingPrice, 10);
    if (Number.isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'startingPrice doit être un nombre > 0' });
    }

    const delivery = (deliveryTime && String(deliveryTime).trim()) || '';
    if (!delivery) {
      return res.status(400).json({ error: 'deliveryTime est requis' });
    }

    const doc = await freelanceServiceModel.create({
      freelance: freelanceId,
      service: serviceId,
      titleOverride: titleOverride != null ? String(titleOverride).trim() : '',
      descriptionCourte: descriptionCourte != null ? String(descriptionCourte).trim() : '',
      coverImage,
      startingPrice: price,
      deliveryTime: delivery,
      isActive: parseBool(req.body.isActive) !== false,
      isFeatured: parseBool(req.body.isFeatured) === true,
    });

    const populated = await freelanceServiceModel
      .findById(doc._id)
      .populate({
        path: 'freelance',
        populate: { path: 'utilisateur', select: 'nom prenom photoProfil' },
      })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen categorie',
        populate: { path: 'categorie', select: 'nomcategorie imagecategorie' },
      });

    return res.status(201).json(populated);
  } catch (err) {
    unlinkSafe(tmpPath);
    if (err.code === 11000) {
      return res.status(409).json({
        error: 'Ce freelance a déjà une offre pour ce service catalogue.',
      });
    }
    console.error('createFreelanceService:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/** PUT /freelance-services/:id */
export const updateFreelanceService = async (req, res) => {
  const tmpPath = req.file?.path;
  try {
    const offer = await freelanceServiceModel.findById(req.params.id);
    if (!offer) {
      unlinkSafe(tmpPath);
      return res.status(404).json({ error: 'Offre introuvable' });
    }

    const { serviceId, freelanceId } = req.body;
    if (freelanceId && String(freelanceId) !== String(offer.freelance)) {
      unlinkSafe(tmpPath);
      return res.status(400).json({ error: 'Impossible de changer le freelance de l’offre.' });
    }

    if (serviceId && String(serviceId) !== String(offer.service)) {
      const sCheck = await assertCatalogServiceInFreelanceGroup(serviceId);
      if (!sCheck.ok) {
        unlinkSafe(tmpPath);
        return res.status(sCheck.status).json({ error: sCheck.error });
      }
      offer.service = serviceId;
    }

    if (req.body.titleOverride !== undefined) {
      offer.titleOverride = String(req.body.titleOverride).trim();
    }
    if (req.body.descriptionCourte !== undefined) {
      offer.descriptionCourte = String(req.body.descriptionCourte).trim();
    }
    if (req.body.startingPrice !== undefined) {
      const price = parseFloat(req.body.startingPrice, 10);
      if (Number.isNaN(price) || price <= 0) {
        unlinkSafe(tmpPath);
        return res.status(400).json({ error: 'startingPrice doit être un nombre > 0' });
      }
      offer.startingPrice = price;
    }
    if (req.body.deliveryTime !== undefined) {
      const d = String(req.body.deliveryTime).trim();
      if (!d) {
        unlinkSafe(tmpPath);
        return res.status(400).json({ error: 'deliveryTime ne peut pas être vide' });
      }
      offer.deliveryTime = d;
    }
    if (req.body.coverImage !== undefined && !tmpPath) {
      const url = String(req.body.coverImage).trim();
      if (!url) {
        return res.status(400).json({ error: 'coverImage ne peut pas être vide' });
      }
      offer.coverImage = url;
    }
    if (tmpPath) {
      offer.coverImage = await uploadCoverToCloudinary(tmpPath);
      unlinkSafe(tmpPath);
    }
    if (req.body.isActive !== undefined) {
      const b = parseBool(req.body.isActive);
      if (b !== undefined) offer.isActive = b;
    }
    if (req.body.isFeatured !== undefined) {
      const b = parseBool(req.body.isFeatured);
      if (b !== undefined) offer.isFeatured = b;
    }

    await offer.save();

    const populated = await freelanceServiceModel
      .findById(offer._id)
      .populate({
        path: 'freelance',
        populate: { path: 'utilisateur', select: 'nom prenom photoProfil' },
      })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen categorie',
        populate: { path: 'categorie', select: 'nomcategorie imagecategorie' },
      });

    return res.status(200).json(populated);
  } catch (err) {
    unlinkSafe(tmpPath);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Conflit: offre déjà existante pour ce couple freelance/service.' });
    }
    console.error('updateFreelanceService:', err);
    return res.status(500).json({ error: err.message || 'Erreur serveur' });
  }
};

/** GET /freelance-services/:id */
export const getFreelanceServiceById = async (req, res) => {
  try {
    const doc = await freelanceServiceModel
      .findById(req.params.id)
      .populate({
        path: 'freelance',
        populate: { path: 'utilisateur', select: 'nom prenom photoProfil telephone email' },
      })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen tags categorie',
        populate: { path: 'categorie', populate: { path: 'groupe', select: 'nomgroupe' } },
      });
    if (!doc) {
      return res.status(404).json({ error: 'Offre introuvable' });
    }
    return res.status(200).json(doc);
  } catch (err) {
    console.error('getFreelanceServiceById:', err);
    return res.status(500).json({ error: err.message });
  }
};

/** GET /freelance-services?freelanceId= */
export const listFreelanceServices = async (req, res) => {
  try {
    const filter = {};
    if (req.query.freelanceId && mongoose.Types.ObjectId.isValid(req.query.freelanceId)) {
      filter.freelance = req.query.freelanceId;
    }
    if (req.query.isActive === 'true') filter.isActive = true;
    if (req.query.isActive === 'false') filter.isActive = false;

    const docs = await freelanceServiceModel
      .find(filter)
      .populate({
        path: 'freelance',
        populate: { path: 'utilisateur', select: 'nom prenom photoProfil' },
      })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen categorie',
        populate: { path: 'categorie', select: 'nomcategorie' },
      })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ offers: docs, count: docs.length });
  } catch (err) {
    console.error('listFreelanceServices:', err);
    return res.status(500).json({ error: err.message });
  }
};

/** GET /freelance-services/home */
export const getHomeFreelanceServices = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);

    const docs = await freelanceServiceModel
      .find({
        isActive: true,
        coverImage: { $nin: [null, ''] },
        startingPrice: { $gt: 0 },
      })
      .populate({
        path: 'freelance',
        // Pas d’exigence accountStatus ici : beaucoup de profils restent Pending avec status active.
        match: { status: 'active' },
        populate: { path: 'utilisateur', select: 'nom prenom photoProfil' },
      })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen categorie',
        populate: { path: 'categorie', select: 'nomcategorie' },
      })
      .sort({ isFeatured: -1, orderCount: -1, ratingAvg: -1, updatedAt: -1 })
      .limit(limit * 2)
      .lean();

    const filtered = docs.filter((o) => o.freelance != null);

    const shaped = filtered.slice(0, limit).map((o) => {
      const title =
        (o.titleOverride && String(o.titleOverride).trim()) ||
        o.service?.nomservice ||
        'Service';
      const u = o.freelance?.utilisateur;
      const prenom = u?.prenom || '';
      const nom = u?.nom || '';
      const par = [prenom, nom].filter(Boolean).join(' ').trim() || o.freelance?.name || 'Freelance';
      return {
        _id: o._id,
        displayTitle: title,
        coverImage: o.coverImage,
        startingPrice: o.startingPrice,
        deliveryTime: o.deliveryTime,
        ratingAvg: o.ratingAvg,
        reviewsCount: o.reviewsCount,
        orderCount: o.orderCount,
        isFeatured: o.isFeatured,
        freelance: o.freelance
          ? {
              _id: o.freelance._id,
              name: o.freelance.name,
              imagePath: o.freelance.imagePath,
              rating: o.freelance.rating,
              utilisateur: u
                ? {
                    nom: u.nom,
                    prenom: u.prenom,
                    photoProfil: u.photoProfil,
                  }
                : null,
            }
          : null,
        service: o.service,
        par,
      };
    });

    return res.status(200).json({ offers: shaped, count: shaped.length });
  } catch (err) {
    console.error('getHomeFreelanceServices:', err);
    return res.status(500).json({ error: err.message });
  }
};

/** GET /freelance/:id/services (liste des offres d’un profil) */
export const listFreelanceServicesByFreelanceId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Identifiant freelance invalide' });
    }

    const exists = await freelanceModel.findById(id).select('_id').lean();
    if (!exists) {
      return res.status(404).json({ error: 'Freelance introuvable' });
    }

    const docs = await freelanceServiceModel
      .find({ freelance: id, isActive: true })
      .populate({
        path: 'service',
        select: 'nomservice imageservice prixmoyen categorie',
        populate: { path: 'categorie', select: 'nomcategorie' },
      })
      .sort({ isFeatured: -1, updatedAt: -1 })
      .lean();

    return res.status(200).json({ offers: docs, count: docs.length });
  } catch (err) {
    console.error('listFreelanceServicesByFreelanceId:', err);
    return res.status(500).json({ error: err.message });
  }
};

/** DELETE /freelance-services/:id */
export const deleteFreelanceService = async (req, res) => {
  try {
    const doc = await freelanceServiceModel.findByIdAndDelete(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Offre introuvable' });
    }
    return res.status(200).json({ message: 'Offre supprimée', id: doc._id });
  } catch (err) {
    console.error('deleteFreelanceService:', err);
    return res.status(500).json({ error: err.message });
  }
};
