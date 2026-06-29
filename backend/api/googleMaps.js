import axios from 'axios';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve('../.env') });

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

// ✅ GÉOCODAGE - Convertir adresse en coordonnées
export const geocodeAddress = async (address) => {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/geocode/json`, {
      params: {
        address: address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        success: true,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        formattedAddress: result.formatted_address,
        placeId: result.place_id,
        addressComponents: result.address_components
      };
    } else {
      return {
        success: false,
        error: response.data.status || 'Adresse non trouvée'
      };
    }
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage'
    };
  }
};

// ✅ GÉOCODAGE INVERSE - Convertir coordonnées en adresse
export const reverseGeocode = async (lat, lng) => {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/geocode/json`, {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        success: true,
        address: result.formatted_address,
        placeId: result.place_id,
        addressComponents: result.address_components
      };
    } else {
      return {
        success: false,
        error: response.data.status || 'Coordonnées non trouvées'
      };
    }
  } catch (error) {
    console.error('Erreur géocodage inverse:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage inverse'
    };
  }
};

// ✅ CALCUL DE DISTANCE ET TEMPS DE TRAJET
export const calculateDistance = async (origin, destination, mode = 'driving') => {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/distancematrix/json`, {
      params: {
        origins: origin,
        destinations: destination,
        mode: mode, // driving, walking, bicycling, transit
        language: 'fr',
        units: 'metric',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.rows.length > 0) {
      const element = response.data.rows[0].elements[0];
      if (element.status === 'OK') {
        return {
          success: true,
          distance: {
            text: element.distance.text,
            value: element.distance.value // en mètres
          },
          duration: {
            text: element.duration.text,
            value: element.duration.value // en secondes
          }
        };
      } else {
        return {
          success: false,
          error: element.status
        };
      }
    } else {
      return {
        success: false,
        error: response.data.status || 'Impossible de calculer la distance'
      };
    }
  } catch (error) {
    console.error('Erreur calcul distance:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de distance'
    };
  }
};

// ✅ RECHERCHE DE LIEUX PAR PROXIMITÉ
export const searchNearbyPlaces = async (lat, lng, radius = 5000, type = 'establishment', keyword = '') => {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/place/nearbysearch/json`, {
      params: {
        location: `${lat},${lng}`,
        radius: radius,
        type: type,
        keyword: keyword,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      return {
        success: true,
        places: response.data.results.map(place => ({
          placeId: place.place_id,
          name: place.name,
          vicinity: place.vicinity,
          rating: place.rating,
          priceLevel: place.price_level,
          geometry: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          types: place.types,
          photos: place.photos
        }))
      };
    } else {
      return {
        success: false,
        error: response.data.status || 'Aucun lieu trouvé'
      };
    }
  } catch (error) {
    console.error('Erreur recherche lieux:', error);
    return {
      success: false,
      error: 'Erreur lors de la recherche de lieux'
    };
  }
};

// ✅ DIRECTIONS ET NAVIGATION
export const getDirections = async (origin, destination, mode = 'driving') => {
  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/directions/json`, {
      params: {
        origin: origin,
        destination: destination,
        mode: mode,
        language: 'fr',
        units: 'metric',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      return {
        success: true,
        distance: {
          text: leg.distance.text,
          value: leg.distance.value
        },
        duration: {
          text: leg.duration.text,
          value: leg.duration.value
        },
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        steps: leg.steps.map(step => ({
          instruction: step.html_instructions,
          distance: step.distance.text,
          duration: step.duration.text
        })),
        polyline: route.overview_polyline.points
      };
    } else {
      return {
        success: false,
        error: response.data.status || 'Impossible de calculer l\'itinéraire'
      };
    }
  } catch (error) {
    console.error('Erreur directions:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de l\'itinéraire'
    };
  }
};

// ✅ VALIDATION D'ADRESSE
export const validateAddress = async (address) => {
  try {
    const geocodeResult = await geocodeAddress(address);
    if (geocodeResult.success) {
      return {
        success: true,
        isValid: true,
        coordinates: geocodeResult.coordinates,
        formattedAddress: geocodeResult.formattedAddress
      };
    } else {
      return {
        success: true,
        isValid: false,
        error: geocodeResult.error
      };
    }
  } catch (error) {
    console.error('Erreur validation adresse:', error);
    return {
      success: false,
      error: 'Erreur lors de la validation de l\'adresse'
    };
  }
};

// ✅ AUTocomplétion de lieux (Google Places)
export const placesAutocomplete = async (input, options = {}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return { success: false, error: 'Clé Google Maps non configurée', predictions: [] };
  }
  if (!input || String(input).trim().length < 2) {
    return { success: true, predictions: [] };
  }

  try {
    const params = {
      input: String(input).trim(),
      key: GOOGLE_MAPS_API_KEY,
      components: options.country ? `country:${options.country}` : 'country:ci',
      language: options.language ?? 'fr',
    };
    if (options.location) {
      params.location = options.location;
      params.radius = options.radius ?? 50000;
    }

    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/place/autocomplete/json`, {
      params,
    });

    if (response.data.status === 'OK' || response.data.status === 'ZERO_RESULTS') {
      return {
        success: true,
        predictions: (response.data.predictions ?? []).map((p) => ({
          placeId: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text ?? p.description,
          secondaryText: p.structured_formatting?.secondary_text ?? '',
        })),
      };
    }

    return {
      success: false,
      error: response.data.status || 'Autocomplétion indisponible',
      predictions: [],
    };
  } catch (error) {
    console.error('Erreur autocomplétion:', error);
    return { success: false, error: 'Erreur lors de la recherche de lieux', predictions: [] };
  }
};

// ✅ Détails d'un lieu (coordonnées à partir d'un place_id)
export const getPlaceDetails = async (placeId) => {
  if (!GOOGLE_MAPS_API_KEY) {
    return { success: false, error: 'Clé Google Maps non configurée' };
  }
  if (!placeId) {
    return { success: false, error: 'Identifiant de lieu requis' };
  }

  try {
    const response = await axios.get(`${GOOGLE_MAPS_BASE_URL}/place/details/json`, {
      params: {
        place_id: placeId,
        fields: 'geometry,formatted_address,name',
        language: 'fr',
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status === 'OK' && response.data.result) {
      const result = response.data.result;
      return {
        success: true,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
        formattedAddress: result.formatted_address,
        name: result.name,
      };
    }

    return {
      success: false,
      error: response.data.status || 'Lieu introuvable',
    };
  } catch (error) {
    console.error('Erreur détails lieu:', error);
    return { success: false, error: 'Erreur lors de la récupération du lieu' };
  }
};

// ✅ CALCUL DE ZONE DE COUVERTURE
export const calculateServiceArea = async (centerLat, centerLng, radiusKm) => {
  try {
    // Convertir le rayon en mètres
    const radiusMeters = radiusKm * 1000;
    
    // Générer des points autour du centre pour définir la zone
    const points = [];
    const numPoints = 16; // Nombre de points pour former un cercle
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 360) / numPoints;
      const lat = centerLat + (radiusKm / 111) * Math.cos(angle * Math.PI / 180);
      const lng = centerLng + (radiusKm / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle * Math.PI / 180);
      points.push({ lat, lng });
    }
    
    return {
      success: true,
      center: { lat: centerLat, lng: centerLng },
      radius: radiusKm,
      points: points
    };
  } catch (error) {
    console.error('Erreur calcul zone:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de la zone de couverture'
    };
  }
};
