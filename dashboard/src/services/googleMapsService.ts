// Service pour les appels API Google Maps
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodeResult {
  success: boolean;
  coordinates?: Coordinates;
  formattedAddress?: string;
  placeId?: string;
  error?: string;
}

export interface DistanceResult {
  success: boolean;
  distance?: {
    text: string;
    value: number;
  };
  duration?: {
    text: string;
    value: number;
  };
  error?: string;
}

export interface NearbyPlace {
  placeId: string;
  name: string;
  vicinity: string;
  rating?: number;
  geometry: Coordinates;
  types: string[];
}

export interface DirectionsResult {
  success: boolean;
  distance?: {
    text: string;
    value: number;
  };
  duration?: {
    text: string;
    value: number;
  };
  startAddress?: string;
  endAddress?: string;
  steps?: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
  polyline?: string;
  error?: string;
}

export interface ServiceArea {
  success: boolean;
  center?: Coordinates;
  radius?: number;
  points?: Coordinates[];
  error?: string;
}

// ✅ GÉOCODAGE - Convertir adresse en coordonnées
export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage'
    };
  }
};

// ✅ GÉOCODAGE INVERSE - Convertir coordonnées en adresse
export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodeResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/reverse-geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur géocodage inverse:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage inverse'
    };
  }
};

// ✅ CALCUL DE DISTANCE
export const calculateDistance = async (
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<DistanceResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/distance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origin, destination, mode }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur calcul distance:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de distance'
    };
  }
};

// ✅ RECHERCHE DE LIEUX PROCHES
export const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  type: string = 'establishment',
  keyword: string = ''
): Promise<{ success: boolean; places?: NearbyPlace[]; error?: string }> => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
      type,
      keyword,
    });

    const response = await fetch(`${API_BASE_URL}/api/maps/nearby?${params}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur recherche lieux:', error);
    return {
      success: false,
      error: 'Erreur lors de la recherche de lieux'
    };
  }
};

// ✅ DIRECTIONS
export const getDirections = async (
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): Promise<DirectionsResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/directions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ origin, destination, mode }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur directions:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de l\'itinéraire'
    };
  }
};

// ✅ VALIDATION D'ADRESSE
export const validateAddress = async (address: string): Promise<GeocodeResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/validate-address`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur validation adresse:', error);
    return {
      success: false,
      error: 'Erreur lors de la validation de l\'adresse'
    };
  }
};

// ✅ CALCUL DE ZONE DE COUVERTURE
export const calculateServiceArea = async (
  lat: number,
  lng: number,
  radius: number
): Promise<ServiceArea> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/maps/service-area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lat, lng, radius }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Erreur calcul zone:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de la zone de couverture'
    };
  }
};
