import { Router } from 'express';
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

// ✅ GÉOCODAGE - Adresse vers coordonnées
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

// ✅ GÉOCODAGE INVERSE - Coordonnées vers adresse
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

// ✅ CALCUL DE DISTANCE
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

// ✅ RECHERCHE DE LIEUX PROCHES
googleMapsRouter.get('/nearby', async (req, res) => {
    try {
        const { lat, lng, radius = 5000, type = 'establishment', keyword = '' } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'Latitude et longitude requises' });
        }

        const result = await searchNearbyPlaces(lat, lng, radius, type, keyword);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route lieux proches:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ✅ DIRECTIONS ET NAVIGATION
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

// ✅ VALIDATION D'ADRESSE
googleMapsRouter.post('/validate-address', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) {
            return res.status(400).json({ error: 'Adresse requise' });
        }

        const result = await validateAddress(address);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route validation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ✅ CALCUL DE ZONE DE COUVERTURE
googleMapsRouter.post('/service-area', async (req, res) => {
    try {
        const { lat, lng, radius } = req.body;
        if (!lat || !lng || !radius) {
            return res.status(400).json({ error: 'Latitude, longitude et rayon requis' });
        }

        const result = await calculateServiceArea(lat, lng, radius);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route zone service:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default googleMapsRouter;
