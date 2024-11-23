import prestataireModel from "../models/prestataireModel.js";

// Créer un nouveau prestataire
export const createPrestataire = async (req, res) => {
    try {
        const {
            idUtilisateur,
            cni,
            selfie,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        } = req.body;

<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        // Validation des données
        if (!idUtilisateur) {
            return res.status(400).json({ error: "idUtilisateur est obligatoire." });
        }

        // Conversion des champs en base64 si présents
        const cniBuffer = cni ? Buffer.from(cni, "base64") : undefined;
        const selfieBuffer = selfie ? Buffer.from(selfie, "base64") : undefined;

<<<<<<< HEAD
        const newPrestataire = new prestataireModel({
            idUtilisateur,
            cni: cniBuffer,
            selfie: selfieBuffer,
=======
        const newPrestataire = new prestataireModel({
            idUtilisateur,
            cni: cni ? Buffer.from(cni, "base64") : undefined, // Convert base64 to buffer
            selfie: selfie ? Buffer.from(selfie, "base64") : undefined,
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        const newPrestataire = new prestataireModel({
            idUtilisateur,
            cni: cniBuffer,
            selfie: selfieBuffer,
>>>>>>> 7f93ecd (Connexion effective entre front et back)
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        });

        await newPrestataire.save();
        res.status(201).json(newPrestataire);
    } catch (err) {
<<<<<<< HEAD
<<<<<<< HEAD
        console.error("Erreur lors de la création du prestataire:", err);
        res.status(500).json({ error: "Une erreur est survenue lors de la création du prestataire." });
=======
        console.error("Erreur lors de la création du prestataire:", err.message);
        res.status(500).json({ error: err.message });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error("Erreur lors de la création du prestataire:", err);
        res.status(500).json({ error: "Une erreur est survenue lors de la création du prestataire." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
    }
};

// Obtenir tous les prestataires
export const getAllPrestataires = async (req, res) => {
    try {
<<<<<<< HEAD
        const prestataires = await prestataireModel.find({});
        res.status(200).json(prestataires);
    } catch (err) {
        console.error("Erreur lors de la récupération des prestataires:", err);
        res.status(500).json({ error: "Impossible de récupérer les prestataires." });
=======
        const prestataires = await prestataireModel.find();
        res.status(200).json(prestataires);
    } catch (err) {
<<<<<<< HEAD
        console.error("Erreur lors de la récupération des prestataires:", err.message);
        res.status(500).json({ error: err.message });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error("Erreur lors de la récupération des prestataires:", err);
        res.status(500).json({ error: "Impossible de récupérer les prestataires." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
    }
};

// Obtenir un prestataire par ID
export const getPrestataireById = async (req, res) => {
    try {
        const prestataire = await prestataireModel.findById(req.params.id);

        if (!prestataire) {
<<<<<<< HEAD
<<<<<<< HEAD
            return res.status(404).json({ error: "Prestataire non trouvé." });
=======
            return res.status(404).json({ error: "Prestataire non trouvé" });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
            return res.status(404).json({ error: "Prestataire non trouvé." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        }

        res.status(200).json(prestataire);
    } catch (err) {
<<<<<<< HEAD
<<<<<<< HEAD
        console.error("Erreur lors de la récupération du prestataire:", err);
        res.status(500).json({ error: "Impossible de récupérer le prestataire." });
=======
        console.error("Erreur lors de la récupération du prestataire:", err.message);
        res.status(500).json({ error: err.message });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error("Erreur lors de la récupération du prestataire:", err);
        res.status(500).json({ error: "Impossible de récupérer le prestataire." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
    }
};

// Mettre à jour un prestataire par ID
export const updatePrestataire = async (req, res) => {
    try {
        const {
            idUtilisateur,
            cni,
            selfie,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        } = req.body;

<<<<<<< HEAD
<<<<<<< HEAD
        // Construction de l'objet `updates`
=======
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        // Construction de l'objet `updates`
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        const updates = {
            idUtilisateur,
            verifier,
            idservice,
            nomservice,
            prixmoyen,
            localisation,
            note,
        };

        if (cni) updates.cni = Buffer.from(cni, "base64");
        if (selfie) updates.selfie = Buffer.from(selfie, "base64");

        const prestataire = await prestataireModel.findByIdAndUpdate(
            req.params.id,
            updates,
<<<<<<< HEAD
<<<<<<< HEAD
            { new: true, runValidators: true } // Retourne l'objet mis à jour
        );

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé." });
=======
            { new: true }
        );

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé" });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
            { new: true, runValidators: true } // Retourne l'objet mis à jour
        );

        if (!prestataire) {
            return res.status(404).json({ error: "Prestataire non trouvé." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        }

        res.status(200).json(prestataire);
    } catch (err) {
<<<<<<< HEAD
<<<<<<< HEAD
        console.error("Erreur lors de la mise à jour du prestataire:", err);
        res.status(500).json({ error: "Impossible de mettre à jour le prestataire." });
=======
        console.error("Erreur lors de la mise à jour du prestataire:", err.message);
        res.status(500).json({ error: err.message });
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======
        console.error("Erreur lors de la mise à jour du prestataire:", err);
        res.status(500).json({ error: "Impossible de mettre à jour le prestataire." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
    }
};

// Supprimer un prestataire par ID
export const deletePrestataire = async (req, res) => {
    try {
        const prestataire = await prestataireModel.findByIdAndDelete(req.params.id);

        if (!prestataire) {
<<<<<<< HEAD
<<<<<<< HEAD
            return res.status(404).json({ error: "Prestataire non trouvé." });
        }

        res.status(200).json({ message: "Prestataire supprimé avec succès." });
    } catch (err) {
        console.error("Erreur lors de la suppression du prestataire:", err);
        res.status(500).json({ error: "Impossible de supprimer le prestataire." });
    }
};



























// import prestataireModel from "../models/prestataireModel.js";

// // Créer un nouveau prestataire
// export const createPrestataire = async (req, res) => {
//     try {
//         const {
//             idUtilisateur,
//             cni,
//             selfie,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         } = req.body;

//         if (!idUtilisateur) {
//             return res.status(400).send("idUtilisateur est obligatoire.");
//         }

//         const cniBuffer = cni ? Buffer.from(cni, "base64") : undefined;
//         const selfieBuffer = selfie ? Buffer.from(selfie, "base64") : undefined;

//         const newPrestataire = new prestataireModel({
//             idUtilisateur,
//             cni: cniBuffer,
//             selfie: selfieBuffer,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         });

//         await newPrestataire.save();
//         res.status(201).send(newPrestataire);
//     } catch (err) {
//         console.error("Erreur lors de la création du prestataire:", err);
//         res.status(500).send("Une erreur est survenue lors de la création du prestataire.");
//     }
// };

// // Obtenir tous les prestataires
// export const getAllPrestataires = async (req, res) => {
//     try {
//         const prestataires = await prestataireModel.find();
//         res.status(200).send(prestataires);
//     } catch (err) {
//         console.error("Erreur lors de la récupération des prestataires:", err);
//         res.status(500).send("Impossible de récupérer les prestataires.");
//     }
// };

// // Obtenir un prestataire par ID
// export const getPrestataireById = async (req, res) => {
//     try {
//         const prestataire = await prestataireModel.findById(req.params.id);

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send(prestataire);
//     } catch (err) {
//         console.error("Erreur lors de la récupération du prestataire:", err);
//         res.status(500).send("Impossible de récupérer le prestataire.");
//     }
// };

// // Mettre à jour un prestataire par ID
// export const updatePrestataire = async (req, res) => {
//     try {
//         const {
//             idUtilisateur,
//             cni,
//             selfie,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         } = req.body;

//         const updates = {
//             idUtilisateur,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         };

//         if (cni) updates.cni = Buffer.from(cni, "base64");
//         if (selfie) updates.selfie = Buffer.from(selfie, "base64");

//         const prestataire = await prestataireModel.findByIdAndUpdate(
//             req.params.id,
//             updates,
//             { new: true, runValidators: true }
//         );

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send(prestataire);
//     } catch (err) {
//         console.error("Erreur lors de la mise à jour du prestataire:", err);
//         res.status(500).send("Impossible de mettre à jour le prestataire.");
//     }
// };

// // Supprimer un prestataire par ID
// export const deletePrestataire = async (req, res) => {
//     try {
//         const prestataire = await prestataireModel.findByIdAndDelete(req.params.id);

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send("Prestataire supprimé avec succès.");
//     } catch (err) {
//         console.error("Erreur lors de la suppression du prestataire:", err);
//         res.status(500).send("Impossible de supprimer le prestataire.");
//     }
// };
=======
            return res.status(404).json({ error: "Prestataire non trouvé" });
=======
            return res.status(404).json({ error: "Prestataire non trouvé." });
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        }

        res.status(200).json({ message: "Prestataire supprimé avec succès." });
    } catch (err) {
        console.error("Erreur lors de la suppression du prestataire:", err);
        res.status(500).json({ error: "Impossible de supprimer le prestataire." });
    }
};
<<<<<<< HEAD
>>>>>>> 0b7e280 (Connexion effective entre front et back)
=======



























// import prestataireModel from "../models/prestataireModel.js";

// // Créer un nouveau prestataire
// export const createPrestataire = async (req, res) => {
//     try {
//         const {
//             idUtilisateur,
//             cni,
//             selfie,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         } = req.body;

//         if (!idUtilisateur) {
//             return res.status(400).send("idUtilisateur est obligatoire.");
//         }

//         const cniBuffer = cni ? Buffer.from(cni, "base64") : undefined;
//         const selfieBuffer = selfie ? Buffer.from(selfie, "base64") : undefined;

//         const newPrestataire = new prestataireModel({
//             idUtilisateur,
//             cni: cniBuffer,
//             selfie: selfieBuffer,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         });

//         await newPrestataire.save();
//         res.status(201).send(newPrestataire);
//     } catch (err) {
//         console.error("Erreur lors de la création du prestataire:", err);
//         res.status(500).send("Une erreur est survenue lors de la création du prestataire.");
//     }
// };

// // Obtenir tous les prestataires
// export const getAllPrestataires = async (req, res) => {
//     try {
//         const prestataires = await prestataireModel.find();
//         res.status(200).send(prestataires);
//     } catch (err) {
//         console.error("Erreur lors de la récupération des prestataires:", err);
//         res.status(500).send("Impossible de récupérer les prestataires.");
//     }
// };

// // Obtenir un prestataire par ID
// export const getPrestataireById = async (req, res) => {
//     try {
//         const prestataire = await prestataireModel.findById(req.params.id);

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send(prestataire);
//     } catch (err) {
//         console.error("Erreur lors de la récupération du prestataire:", err);
//         res.status(500).send("Impossible de récupérer le prestataire.");
//     }
// };

// // Mettre à jour un prestataire par ID
// export const updatePrestataire = async (req, res) => {
//     try {
//         const {
//             idUtilisateur,
//             cni,
//             selfie,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         } = req.body;

//         const updates = {
//             idUtilisateur,
//             verifier,
//             idservice,
//             nomservice,
//             prixmoyen,
//             localisation,
//             note,
//         };

//         if (cni) updates.cni = Buffer.from(cni, "base64");
//         if (selfie) updates.selfie = Buffer.from(selfie, "base64");

//         const prestataire = await prestataireModel.findByIdAndUpdate(
//             req.params.id,
//             updates,
//             { new: true, runValidators: true }
//         );

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send(prestataire);
//     } catch (err) {
//         console.error("Erreur lors de la mise à jour du prestataire:", err);
//         res.status(500).send("Impossible de mettre à jour le prestataire.");
//     }
// };

// // Supprimer un prestataire par ID
// export const deletePrestataire = async (req, res) => {
//     try {
//         const prestataire = await prestataireModel.findByIdAndDelete(req.params.id);

//         if (!prestataire) {
//             return res.status(404).send("Prestataire non trouvé.");
//         }

//         res.status(200).send("Prestataire supprimé avec succès.");
//     } catch (err) {
//         console.error("Erreur lors de la suppression du prestataire:", err);
//         res.status(500).send("Impossible de supprimer le prestataire.");
//     }
// };
>>>>>>> 7f93ecd (Connexion effective entre front et back)
