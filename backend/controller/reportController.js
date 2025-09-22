const Report = require('../models/reportModel');

export const createReport = async (req, res) => {
  try {
    const userId = req.userId || req.utilisateur?._id;
    if (!userId) return res.status(401).json({ error: 'Auth requise' });
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ error: 'Champs manquants' });
    }
    const report = await Report.create({ utilisateur: userId, targetType, targetId, reason });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


