import express from 'express';
import commandeModel from "../models/commandeModel.js";
const router = express.Router();
const Commande = commandeModel;

// Créer une nouvelle commande
router.post('/commande', async (req, res) => {
    try {
        const { DateCommande, DetailsCommande, article, utilisateur } = req.body;
        const newCommande = new Commande({
            DateCommande,
            DetailsCommande,
            article,
            utilisateur
        });
        await newCommande.save();
        res.status(201).json(newCommande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir toutes les commandes
router.get('/commandes', async (req, res) => {
    try {
        const commandes = await Commande.find()
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire
        res.status(200).json(commandes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtenir une commande par ID
router.get('/commande/:id', async (req, res) => {
    try {
        const commande = await Commande.findById(req.params.id)
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json(commande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mettre à jour une commande par ID
router.put('/commande/:id', async (req, res) => {
    try {
        const { DateCommande, DetailsCommande, article, utilisateur } = req.body;
        const commande = await Commande.findByIdAndUpdate(req.params.id, {
            DateCommande,
            DetailsCommande,
            article,
            utilisateur
        }, { new: true })
            .populate('article')
            .populate('utilisateur'); // Populer l'article et l'utilisateur si nécessaire

        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json(commande);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Supprimer une commande par ID
router.delete('/commande/:id', async (req, res) => {
    try {
        const commande = await Commande.findByIdAndDelete(req.params.id);
        if (!commande) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }
        res.status(200).json({ message: 'Commande supprimée avec succès' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Créer une nouvelle commande
export const createCommande = async (req, res) => {
  try {
    const commande = new commandeModel(req.body);
    const saved = await commande.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir toutes les commandes
export const getAllCommandes = async (_req, res) => {
  try {
    const commandes = await commandeModel.find();
    res.status(200).json(commandes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obtenir une commande par ID
export const getCommandeById = async (req, res) => {
  try {
    const commande = await commandeModel.findById(req.params.id);
    if (!commande) return res.status(404).json({ error: "Commande non trouvée" });
    res.status(200).json(commande);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour une commande par ID
export const updateCommande = async (req, res) => {
  try {
    const commande = await commandeModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!commande) return res.status(404).json({ error: "Commande non trouvée" });
    res.status(200).json(commande);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Supprimer une commande par ID
export const deleteCommande = async (req, res) => {
  try {
    const commande = await commandeModel.findByIdAndDelete(req.params.id);
    if (!commande) return res.status(404).json({ error: "Commande non trouvée" });
    res.status(200).json({ message: "Commande supprimée" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
