import { apiClient } from './setupApi';

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

export const geocodeAddress = async (address: string): Promise<GeocodeResult> => {
  try {
    const response = await apiClient.post<GeocodeResult>('/maps/geocode', { address });
    return response.data;
  } catch (error) {
    console.error('Erreur géocodage:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage',
    };
  }
};

export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodeResult> => {
  try {
    const response = await apiClient.post<GeocodeResult>('/maps/reverse-geocode', { lat, lng });
    return response.data;
  } catch (error) {
    console.error('Erreur géocodage inverse:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage inverse',
    };
  }
};

export const calculateDistance = async (
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<DistanceResult> => {
  try {
    const response = await apiClient.post<DistanceResult>('/maps/distance', { origin, destination, mode });
    return response.data;
  } catch (error) {
    console.error('Erreur calcul distance:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de distance',
    };
  }
};

export const searchNearbyPlaces = async (
  lat: number,
  lng: number,
  radius: number = 5000,
  type: string = 'establishment',
  keyword: string = '',
): Promise<{ success: boolean; places?: NearbyPlace[]; error?: string }> => {
  try {
    const response = await apiClient.get<{ success: boolean; places?: NearbyPlace[]; error?: string }>(
      '/maps/nearby',
      {
        params: {
          lat: lat.toString(),
          lng: lng.toString(),
          radius: radius.toString(),
          type,
          keyword,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error('Erreur recherche lieux:', error);
    return {
      success: false,
      error: 'Erreur lors de la recherche de lieux',
    };
  }
};

export const getDirections = async (
  origin: string,
  destination: string,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving',
): Promise<DirectionsResult> => {
  try {
    const response = await apiClient.post<DirectionsResult>('/maps/directions', { origin, destination, mode });
    return response.data;
  } catch (error) {
    console.error('Erreur directions:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de l\'itinéraire',
    };
  }
};

export const validateAddress = async (address: string): Promise<GeocodeResult> => {
  try {
    const response = await apiClient.post<GeocodeResult>('/maps/validate-address', { address });
    return response.data;
  } catch (error) {
    console.error('Erreur validation adresse:', error);
    return {
      success: false,
      error: 'Erreur lors de la validation de l\'adresse',
    };
  }
};

export const calculateServiceArea = async (
  lat: number,
  lng: number,
  radius: number,
): Promise<ServiceArea> => {
  try {
    const response = await apiClient.post<ServiceArea>('/maps/service-area', {
      center: { lat, lng },
      radiusKm: radius,
    });
    return response.data;
  } catch (error) {
    console.error('Erreur calcul zone:', error);
    return {
      success: false,
      error: 'Erreur lors du calcul de la zone de couverture',
    };
  }
};
