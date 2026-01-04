import Service from "../models/serviceModel.js";
import multer from "multer";
import cloudinary from "cloudinary";
import fs from "fs";

// Configure Cloudinary
cloudinary.v2.config({
    cloud_name: "dm0c8st6k",
    api_key: "541481188898557",
    api_secret: "6ViefK1wxoJP50p8j2pQ7IykIYY",
});

// Configure Multer
const upload = multer({ dest: "uploads/" });

// Créer un nouveau service
export const searchServices = async (req, res) => {
    try {
        const { query, categorie, minPrice, maxPrice } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let searchCriteria = {};

        // Recherche textuelle et tags (Regex uniquement pour stabilité)
        if (query) {
            searchCriteria.$or = [
                { nomservice: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ];
        }

        // Filtre par catégorie
        if (categorie) {
            searchCriteria.categorie = categorie;
        }

        const services = await Service.find(searchCriteria)
            .populate({
                path: 'categorie',
                populate: { path: 'groupe' }
            })
            .limit(limit)
            .skip(skip);

        const total = await Service.countDocuments(searchCriteria);

        res.json({
            services,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / limit),
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Helper pour parser les tags
const parseTags = (tags) => {
    if (!tags) return [];
    try {
        return typeof tags === 'string' ? JSON.parse(tags) : tags;
    } catch (e) {
        return [tags];
    }
};

export const createService = async (req, res) => {
    try {
        const { nomservice, categorie, prixmoyen, imageservice, tags } = req.body;

        let finalImageUrl;

        if (req.file) {
            // Upload d'un fichier
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: "services",
            });
            finalImageUrl = result.secure_url;
            fs.unlinkSync(req.file.path);
        } else if (imageservice) {
            // Utiliser l'URL fournie
            finalImageUrl = imageservice;
        } else {
            // Image par défaut si aucune fournie
            finalImageUrl = "https://res.cloudinary.com/demo/image/upload/w_300,h_200,c_fill,g_auto/sample.jpg";
        }

        const newService = new Service({
            nomservice,
            imageservice: finalImageUrl,
            categorie,
            prixmoyen,
            tags: parseTags(tags) // ✅ Ajout des tags
        });

        console.log('💾 Tentative de sauvegarde du service:', newService);
        const savedService = await newService.save();
        console.log('✅ Service sauvegardé avec succès:', savedService._id);

        res.status(201).json(savedService);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Mettre à jour un service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { nomservice, categorie, prixmoyen, tags } = req.body;
        const updates = { nomservice, categorie, prixmoyen };

        if (tags) {
            updates.tags = parseTags(tags);
        }

        // Check if a new image is uploaded
        if (req.file) {
            // Upload new image to Cloudinary
            const result = await cloudinary.v2.uploader.upload(req.file.path, {
                folder: "services",
            });

            // Update the image URL in the updates object
            updates.imageservice = result.secure_url;

            // Remove the local file after uploading
            fs.unlinkSync(req.file.path);
        }

        // Find and update the service
        const updatedService = await Service.findByIdAndUpdate(id, updates, {
            new: true,
        });

        if (!updatedService) {
            return res.status(404).json({ error: "Service not found" });
        }

        res.status(200).json(updatedService);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir tous les services
export const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().populate({
            path: "categorie",
            populate: {
                path: "groupe",
            },
        }); // Populate categorie and groupe if necessary
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Obtenir les services par catégorie
export const getServicesByCategorie = async (req, res) => {
    try {
        const { categorie } = req.params;
        const servicesByCategorie = await Service.find({ nomcategorie: categorie });
        res.json(servicesByCategorie);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Créer un service directement (sans multer)
export const createServiceDirect = async (req, res) => {
    try {
        const { nomservice, categorie, prixmoyen, imageservice } = req.body;

        const newService = new Service({
            nomservice,
            imageservice: imageservice || "https://res.cloudinary.com/demo/image/upload/w_300,h_200,c_fill,g_auto/sample.jpg",
            categorie,
            prixmoyen
        });

        console.log('💾 Tentative de sauvegarde du service:', newService);
        const savedService = await newService.save();
        console.log('✅ Service sauvegardé avec succès:', savedService._id);

        res.status(201).json(savedService);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

// Supprimer un service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the service by ID
        const service = await Service.findByIdAndDelete(id);

        if (!service) {
            return res.status(404).json({ message: "Service not found" });
        }

        res.status(200).json({ message: "Service deleted successfully" });
    } catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ message: "Server error" });
    }
};
