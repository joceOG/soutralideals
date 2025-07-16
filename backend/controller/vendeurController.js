import vendeurModel from "../models/vendeurModel.js";

export const createVendeur = async (req, res) => {
  try {
    const nouveauVendeur = new vendeurModel(req.body);
    const saved = await nouveauVendeur.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllVendeurs = async (_req, res) => {
  try {
    const vendeurs = await vendeurModel.find();
    res.status(200).json(vendeurs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVendeurById = async (req, res) => {
  try {
    const vendeur = await vendeurModel.findById(req.params.id);
    if (!vendeur) return res.status(404).json({ error: "Vendeur non trouvé" });
    res.status(200).json(vendeur);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateVendeur = async (req, res) => {
  try {
    const vendeur = await vendeurModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vendeur) return res.status(404).json({ error: "Vendeur non trouvé" });
    res.status(200).json(vendeur);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteVendeur = async (req, res) => {
  try {
    const vendeur = await vendeurModel.findByIdAndDelete(req.params.id);
    if (!vendeur) return res.status(404).json({ error: "Vendeur non trouvé" });
    res.status(200).json({ message: "Vendeur supprimé" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
