import { body, param, query, validationResult } from 'express-validator';
import logger from './logger.js';

// 🛡️ Middleware pour gérer les erreurs de validation
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));
    
    logger.warn('Validation Error', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip,
    });
    
    return res.status(400).json({
      error: 'Données de validation invalides',
      details: errorMessages,
    });
  }
  
  next();
};

// 👤 Validation pour l'inscription d'utilisateur
export const validateUserRegistration = [
  body('nom')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le nom doit contenir entre 2 et 50 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Le nom ne peut contenir que des lettres'),
    
  body('prenom')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Le prénom doit contenir entre 2 et 50 caractères')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Le prénom ne peut contenir que des lettres'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
    
  body('telephone')
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone invalide'),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
    
  body('role')
    .isIn(['Client', 'Prestataire', 'Vendeur', 'Freelance'])
    .withMessage('Rôle invalide'),
    
  handleValidationErrors,
];

// 🔐 Validation pour la connexion
export const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
    
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
    
  handleValidationErrors,
];

// 📦 Validation pour les commandes
export const validateCommande = [
  body('infoCommande.addresse')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('L\'adresse doit contenir entre 10 et 200 caractères'),
    
  body('infoCommande.ville')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('La ville doit contenir entre 2 et 50 caractères'),
    
  body('infoCommande.telephone')
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone invalide'),
    
  body('infoCommande.codePostal')
    .isPostalCode('FR')
    .withMessage('Code postal invalide'),
    
  body('articles')
    .isArray({ min: 1 })
    .withMessage('Au moins un article est requis'),
    
  body('articles.*.nom')
    .trim()
    .notEmpty()
    .withMessage('Le nom de l\'article est requis'),
    
  body('articles.*.quantité')
    .isInt({ min: 1 })
    .withMessage('La quantité doit être un nombre positif'),
    
  body('articles.*.prix')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
    
  body('prixTotal')
    .isFloat({ min: 0 })
    .withMessage('Le prix total doit être un nombre positif'),
    
  handleValidationErrors,
];

// 💬 Validation pour les messages
export const validateMessage = [
  body('expediteur')
    .isMongoId()
    .withMessage('ID expéditeur invalide'),
    
  body('destinataire')
    .isMongoId()
    .withMessage('ID destinataire invalide'),
    
  body('contenu')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Le contenu doit contenir entre 1 et 2000 caractères'),
    
  body('typeMessage')
    .optional()
    .isIn(['NORMAL', 'COMMANDE', 'PRESTATION', 'SUPPORT', 'AUTOMATIQUE'])
    .withMessage('Type de message invalide'),
    
  handleValidationErrors,
];

// 🔔 Validation pour les notifications
export const validateNotification = [
  body('destinataire')
    .isMongoId()
    .withMessage('ID destinataire invalide'),
    
  body('titre')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Le titre doit contenir entre 1 et 100 caractères'),
    
  body('message')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Le message doit contenir entre 1 et 500 caractères'),
    
  body('type')
    .isIn(['COMMANDE', 'PRESTATION', 'PAIEMENT', 'VERIFICATION', 'MESSAGE', 'SYSTEME', 'PROMOTION', 'RAPPEL'])
    .withMessage('Type de notification invalide'),
    
  body('priorite')
    .optional()
    .isIn(['BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'])
    .withMessage('Priorité invalide'),
    
  handleValidationErrors,
];

// 🛍️ Validation pour les articles
export const validateArticle = [
  body('nomArticle')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom de l\'article doit contenir entre 2 et 100 caractères'),
    
  body('prixArticle')
    .isFloat({ min: 0 })
    .withMessage('Le prix doit être un nombre positif'),
    
  body('quantiteArticle')
    .isInt({ min: 0 })
    .withMessage('La quantité doit être un nombre positif ou zéro'),
    
  body('vendeur')
    .isMongoId()
    .withMessage('ID vendeur invalide'),
    
  body('categorie')
    .isMongoId()
    .withMessage('ID catégorie invalide'),
    
  handleValidationErrors,
];

// 🎯 Validation pour les freelances
export const validateFreelance = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le nom doit contenir entre 2 et 100 caractères'),
    
  body('job')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Le métier doit contenir entre 2 et 100 caractères'),
    
  body('category')
    .trim()
    .notEmpty()
    .withMessage('La catégorie est requise'),
    
  body('hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Le tarif horaire doit être un nombre positif'),
    
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('La localisation doit contenir entre 2 et 100 caractères'),
    
  body('phoneNumber')
    .optional()
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone invalide'),
    
  body('skills')
    .optional()
    .isArray()
    .withMessage('Les compétences doivent être un tableau'),
    
  body('experienceLevel')
    .optional()
    .isIn(['Débutant', 'Intermédiaire', 'Expert'])
    .withMessage('Niveau d\'expérience invalide'),
    
  handleValidationErrors,
];

// 📍 Validation pour les paramètres d'ID
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('ID invalide'),
    
  handleValidationErrors,
];

// 🔍 Validation pour les requêtes de recherche
export const validateSearchQuery = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Le terme de recherche doit contenir entre 1 et 100 caractères'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un nombre positif'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
    
  handleValidationErrors,
];

// 📧 Validation pour les emails
export const validateEmail = [
  body('to')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email destinataire invalide'),
    
  body('subject')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le sujet doit contenir entre 1 et 200 caractères'),
    
  body('text')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Le contenu doit contenir entre 1 et 5000 caractères'),
    
  handleValidationErrors,
];

// 📱 Validation pour les SMS
export const validateSMS = [
  body('to')
    .isMobilePhone('fr-FR')
    .withMessage('Numéro de téléphone invalide'),
    
  body('body')
    .trim()
    .isLength({ min: 1, max: 160 })
    .withMessage('Le message SMS doit contenir entre 1 et 160 caractères'),
    
  handleValidationErrors,
];

// 🗺️ Validation pour les coordonnées géographiques
export const validateCoordinates = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude invalide (-90 à 90)'),
    
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude invalide (-180 à 180)'),
    
  handleValidationErrors,
];

// 💰 Validation pour les paiements
export const validatePayment = [
  body('montantOriginal')
    .isFloat({ min: 0.01 })
    .withMessage('Le montant doit être supérieur à 0'),
    
  body('methodePaiement')
    .isIn(['CARTE_VISA', 'CARTE_MASTERCARD', 'MOBILE_MONEY_MTN', 'MOBILE_MONEY_ORANGE', 'MOBILE_MONEY_MOOV', 'PAYPAL', 'VIREMENT_BANCAIRE', 'ESPECES', 'WALLET_PLATEFORME'])
    .withMessage('Méthode de paiement invalide'),
    
  body('devise')
    .isIn(['XAF', 'EUR', 'USD'])
    .withMessage('Devise invalide'),
    
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('La description doit contenir entre 1 et 500 caractères'),
    
  handleValidationErrors,
];

