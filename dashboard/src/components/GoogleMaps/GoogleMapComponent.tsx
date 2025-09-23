import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';

// Types pour les props
interface GoogleMapComponentProps {
  center: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    description?: string;
    type?: 'prestataire' | 'client' | 'service' | 'vendeur' | 'commande' | 'freelance' | 'mission';
    color?: string;
  }>;
  onMarkerClick?: (marker: any) => void;
  onMapClick?: (position: { lat: number; lng: number }) => void;
  height?: string;
  width?: string;
  showControls?: boolean;
  draggable?: boolean;
  className?: string;
}

// Interface pour Google Maps
interface GoogleMapsWindow extends Window {
  google: any;
  initMap: () => void;
}

declare const window: GoogleMapsWindow;

const GoogleMapComponent: React.FC<GoogleMapComponentProps> = ({
  center,
  zoom = 13,
  markers = [],
  onMarkerClick,
  onMapClick,
  height = '400px',
  width = '100%',
  showControls = true,
  draggable = true,
  className = ''
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  // ✅ CHARGEMENT DE L'API GOOGLE MAPS
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setGoogleMapsLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapsLoaded(true);
      script.onerror = () => setError('Erreur lors du chargement de Google Maps');
      
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // ✅ INITIALISATION DE LA CARTE
  useEffect(() => {
    if (!googleMapsLoaded || !mapRef.current) return;

    try {
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: !showControls,
        draggable: draggable,
        zoomControl: showControls,
        mapTypeControl: showControls,
        scaleControl: showControls,
        streetViewControl: showControls,
        rotateControl: showControls,
        fullscreenControl: showControls,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(mapInstance);

      // ✅ GESTION DES CLICS SUR LA CARTE
      if (onMapClick) {
        mapInstance.addListener('click', (event: any) => {
          const position = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          onMapClick(position);
        });
      }

    } catch (err) {
      console.error('Erreur initialisation carte:', err);
      setError('Erreur lors de l\'initialisation de la carte');
    }
  }, [googleMapsLoaded, center, zoom, onMapClick, showControls, draggable]);

  // ✅ GESTION DES MARQUEURS
  useEffect(() => {
    if (!map || !googleMapsLoaded) return;

    // Supprimer les anciens marqueurs
    mapMarkers.forEach(marker => marker.setMap(null));
    setMapMarkers([]);

    // Créer les nouveaux marqueurs
    const newMarkers = markers.map(markerData => {
      const marker = new window.google.maps.Marker({
        position: markerData.position,
        map: map,
        title: markerData.title,
        icon: getMarkerIcon(markerData.type, markerData.color),
        animation: window.google.maps.Animation.DROP
      });

      // ✅ INFO WINDOW
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 5px 0; color: #1976d2;">${markerData.title}</h3>
            ${markerData.description ? `<p style="margin: 0; color: #666;">${markerData.description}</p>` : ''}
          </div>
        `
      });

      // ✅ GESTION DES CLICS SUR MARQUEURS
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });

      return marker;
    });

    setMapMarkers(newMarkers);
  }, [map, markers, onMarkerClick, googleMapsLoaded]);

  // ✅ FONCTION POUR OBTENIR L'ICÔNE DU MARQUEUR
  const getMarkerIcon = (type?: string, color?: string) => {
    const defaultColor = color || '#1976d2';
    
    switch (type) {
      case 'prestataire':
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#4caf50',
          fillOpacity: 1,
          strokeColor: '#2e7d32',
          strokeWeight: 2,
          scale: 8
        };
      case 'client':
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#ff9800',
          fillOpacity: 1,
          strokeColor: '#f57c00',
          strokeWeight: 2,
          scale: 8
        };
      case 'service':
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: '#2196f3',
          fillOpacity: 1,
          strokeColor: '#1976d2',
          strokeWeight: 2,
          scale: 8
        };
      default:
        return {
          path: window.google.maps.SymbolPath.CIRCLE,
          fillColor: defaultColor,
          fillOpacity: 1,
          strokeColor: defaultColor,
          strokeWeight: 2,
          scale: 8
        };
    }
  };

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!googleMapsLoaded) {
    return (
      <Box 
        sx={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd'
        }}
      >
        <Typography>Chargement de la carte...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <div
        ref={mapRef}
        className={className}
        style={{
          height,
          width,
          borderRadius: '8px',
          border: '1px solid #ddd'
        }}
      />
    </Box>
  );
};

export default GoogleMapComponent;
