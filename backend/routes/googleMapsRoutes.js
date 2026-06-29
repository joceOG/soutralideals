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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
    calculateServiceArea,
    placesAutocomplete,
    getPlaceDetails,
=======
    calculateServiceArea
<<<<<<< HEAD
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
    calculateServiceArea,
    placesAutocomplete,
    getPlaceDetails,
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
<<<<<<< HEAD
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
=======
    calculateServiceArea,
    placesAutocomplete,
    getPlaceDetails,
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
googleMapsRouter.post('/autocomplete', async (req, res) => {
    try {
        const { input, country, location, radius } = req.body;
        if (!input) {
            return res.status(400).json({ error: 'Texte de recherche requis' });
        }

        const result = await placesAutocomplete(input, { country, location, radius });
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route autocomplete:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

googleMapsRouter.post('/place-details', async (req, res) => {
    try {
        const { placeId } = req.body;
        if (!placeId) {
            return res.status(400).json({ error: 'placeId requis' });
        }

        const result = await getPlaceDetails(placeId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route place-details:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> bbafccc (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> 7a152ec (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
=======
=======
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
>>>>>>> 37a9202 (fix(security): protéger routes admin, maps API et authentification Socket)
=======
=======
>>>>>>> cc0abbd (fix(security): protéger routes admin, maps API et authentification Socket)
=======
>>>>>>> dad8436 (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
>>>>>>> d0a481d (feat: backend OTP/prestataire, messagerie, cache et dashboard admin)
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

googleMapsRouter.post('/place-details', async (req, res) => {
    try {
        const { placeId } = req.body;
        if (!placeId) {
            return res.status(400).json({ error: 'placeId requis' });
        }

        const result = await getPlaceDetails(placeId);
        res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
        console.error('Erreur route place-details:', error);
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