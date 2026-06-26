import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import auth from '../middleware/authMiddleware.js';
import {
    geocodeAddress,
    reverseGeocode,
    calculateDistance,
    searchNearbyPlaces,
    getDirections,
    validateAddress,
    calculateServiceArea
} from '../api/googleMaps.js';

const googleMapsRouter = Router();

const mapsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Trop de requêtes cartographiques, réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});

googleMapsRouter.use(auth, mapsLimiter);

googleMapsRouter.post('/geocode', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Adresse requise' });
        }

        const result = await geocodeAddress(address);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route géocodage:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/reverse-geocode', async (req, res) => {
    try {
        const { lat, lng } = req.body;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude et longitude requises' });
        }

        const result = await reverseGeocode(lat, lng);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route géocodage inverse:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/distance', async (req, res) => {
    try {
        const { origin, destination, mode = 'driving' } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origine et destination requises' });
        }

        const result = await calculateDistance(origin, destination, mode);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route distance:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius, type } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude et longitude requises' });
        }

        const result = await searchNearbyPlaces(lat, lng, radius, type);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route nearby:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/directions', async (req, res) => {
    try {
        const { origin, destination, mode = 'driving' } = req.body;
        if (!origin || !destination) {
            return res.status(400).json({ error: 'Origine et destination requises' });
        }

        const result = await getDirections(origin, destination, mode);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route directions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/validate-address', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Adresse requise' });
        }

        const result = await validateAddress(address);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route validate-address:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/service-area', async (req, res) => {
    try {
        const { center, radiusKm } = req.body;
        if (!center || !radiusKm) {
            return res.status(400).json({ error: 'Centre et rayon requis' });
        }

        const result = await calculateServiceArea(center, radiusKm);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route service-area:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default googleMapsRouter;