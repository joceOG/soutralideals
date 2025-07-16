import freelancerModel from "../models/freelancerModel.js";

export const createFreelancer = async (req, res) => {
  try {
    const nouveau = new freelancerModel(req.body);
    const saved = await nouveau.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllFreelancers = async (_req, res) => {
  try {
    const list = await freelancerModel.find();
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getFreelancerById = async (req, res) => {
  try {
    const doc = await freelancerModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Freelancer non trouvé" });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateFreelancer = async (req, res) => {
  try {
    const doc = await freelancerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ error: "Freelancer non trouvé" });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteFreelancer = async (req, res) => {
  try {
    const doc = await freelancerModel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Freelancer non trouvé" });
    res.status(200).json({ message: "Freelancer supprimé" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
