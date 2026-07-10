import Paiement from '../models/paiementModel.js';
import Utilisateur from '../models/utilisateurModel.js';
import mongoose from 'mongoose';

// ✅ RÉCUPÉRER LE WALLET D'UN UTILISATEUR
export const getWallet = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // 🛡️ IDOR : seul l'utilisateur peut consulter son propre wallet
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé : ce wallet ne vous appartient pas' });
    }

    const utilisateur = await Utilisateur.findById(userId).select('nom prenom email');
    if (!utilisateur) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    // Calcul du solde depuis l'historique des paiements
    const [recus, envoyes] = await Promise.all([
      Paiement.aggregate([
        { $match: { beneficiaire: new mongoose.Types.ObjectId(userId), statut: 'VALIDE' } },
        { $group: { _id: null, total: { $sum: '$montantNet' } } }
      ]),
      Paiement.aggregate([
        { $match: { payeur: new mongoose.Types.ObjectId(userId), statut: 'VALIDE' } },
        { $group: { _id: null, total: { $sum: '$montantOriginal' } } }
      ])
    ]);

    const totalRecu = recus[0]?.total || 0;
    const totalEnvoye = envoyes[0]?.total || 0;
    const solde = totalRecu - totalEnvoye;

    // Dernières transactions
    const transactions = await Paiement.find({
      $or: [
        { payeur: userId },
        { beneficiaire: userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('payeur', 'nom prenom')
      .populate('beneficiaire', 'nom prenom');

    res.status(200).json({
      utilisateur: { _id: utilisateur._id, nom: utilisateur.nom, prenom: utilisateur.prenom },
      solde,
      totalRecu,
      totalEnvoye,
      transactions,
      isActivated: true
    });
  } catch (err) {
    console.error('Erreur getWallet:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ EFFECTUER UN TRANSFERT
export const transfert = async (req, res) => {
  try {
    const { payeurId, beneficiaireId, montant, description } = req.body;

    if (!payeurId || !beneficiaireId || !montant) {
      return res.status(400).json({ error: 'payeurId, beneficiaireId et montant sont requis' });
    }

    // 🛡️ IDOR : seul le payeur connecté peut initier un transfert en son nom
    if (req.utilisateur._id.toString() !== payeurId) {
      return res.status(403).json({ error: 'Accès refusé : vous ne pouvez pas initier un transfert au nom d\'un autre utilisateur' });
    }
    if (montant <= 0) {
      return res.status(400).json({ error: 'Le montant doit être supérieur à 0' });
    }
    if (payeurId === beneficiaireId) {
      return res.status(400).json({ error: 'Impossible de s\'envoyer un transfert à soi-même' });
    }

    const [payeur, beneficiaire] = await Promise.all([
      Utilisateur.findById(payeurId),
      Utilisateur.findById(beneficiaireId)
    ]);

    if (!payeur) return res.status(404).json({ error: 'Payeur introuvable' });
    if (!beneficiaire) return res.status(404).json({ error: 'Bénéficiaire introuvable' });

    // 💰 Vérification du solde disponible avant tout transfert
    const [recus, envoyes] = await Promise.all([
      Paiement.aggregate([
        { $match: { beneficiaire: new mongoose.Types.ObjectId(payeurId), statut: 'VALIDE' } },
        { $group: { _id: null, total: { $sum: '$montantNet' } } }
      ]),
      Paiement.aggregate([
        { $match: { payeur: new mongoose.Types.ObjectId(payeurId), statut: 'VALIDE' } },
        { $group: { _id: null, total: { $sum: '$montantOriginal' } } }
      ])
    ]);
    const solde = (recus[0]?.total || 0) - (envoyes[0]?.total || 0);
    if (montant > solde) {
      return res.status(400).json({
        error: 'Solde insuffisant',
        soldeDisponible: solde,
        montantDemande: montant
      });
    }

    const frais = Math.round(montant * 0.01 * 100) / 100; // 1% de frais
    const montantNet = montant - frais;

    const paiement = new Paiement({
      numeroTransaction: `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      payeur: payeurId,
      beneficiaire: beneficiaireId,
      typeObjet: 'AUTRE',
      montantOriginal: montant,
      montantFrais: frais,
      montantNet,
      devise: 'XAF',
      methodePaiement: 'WALLET_PLATEFORME',
      fournisseurPaiement: 'INTERNE',
      statut: 'VALIDE',
      canal: 'SOUTRAPAY',
      description: description || `Transfert de ${payeur.nom} vers ${beneficiaire.nom}`,
      dateCompletion: new Date()
    });

    await paiement.save();

    res.status(201).json({
      message: 'Transfert effectué avec succès',
      transaction: paiement
    });
  } catch (err) {
    console.error('Erreur transfert:', err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ HISTORIQUE DES TRANSACTIONS D'UN UTILISATEUR
export const getTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, type } = req.query;

    // 🛡️ IDOR
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const filter = { $or: [{ payeur: userId }, { beneficiaire: userId }] };
    if (type) filter.typeObjet = type;

    const [transactions, total] = await Promise.all([
      Paiement.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('payeur', 'nom prenom photoProfil')
        .populate('beneficiaire', 'nom prenom photoProfil'),
      Paiement.countDocuments(filter)
    ]);

    res.status(200).json({ transactions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ STATISTIQUES DU WALLET
export const getWalletStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // 🛡️ IDOR
    if (req.utilisateur._id.toString() !== userId) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const stats = await Paiement.aggregate([
      { $match: { $or: [{ payeur: new mongoose.Types.ObjectId(userId) }, { beneficiaire: new mongoose.Types.ObjectId(userId) }], statut: 'VALIDE' } },
      {
        $group: {
          _id: '$typeObjet',
          count: { $sum: 1 },
          totalMontant: { $sum: '$montantOriginal' }
        }
      }
    ]);

    res.status(200).json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
