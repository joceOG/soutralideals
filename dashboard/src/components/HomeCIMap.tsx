/**
 * HomeCIMap — Carte Côte d'Ivoire centrée sur Abidjan.
 *
 * IMPORTANT : utilise l'API IMPÉRATIVE de Leaflet (lib `leaflet` v1.9 déjà installée),
 * PAS `react-leaflet`. Raison : react-leaflet v5 exige React 19, or le projet est en
 * React 18.2 → erreur "render is not a function" sur <Context.Consumer>.
 * L'approche vanilla est compatible avec toutes les versions de React et n'ajoute
 * aucune dépendance.
 *
 * SÉCURITÉ : n'affiche aucune adresse, nom, téléphone ni document KYC.
 * Uniquement lat/lng + type + zone.
 */
import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { colors } from '../tokens/colors';
import type { GeoPoint } from '../services/dashboardService';

interface Props {
  points: GeoPoint[];
}

// Limites Côte d'Ivoire
const CI_BOUNDS = L.latLngBounds([4.2, -8.6], [10.75, -2.5]);
const CI_CENTER: [number, number] = [7.54, -5.55];

const ptColor = (type: GeoPoint['type']): string =>
  type === 'seller' ? colors.primary600 : colors.forestGreen;

/** Évite le crash Leaflet `_leaflet_pos` si la carte est déjà détruite ou hors DOM. */
function safeInvalidateSize(map: L.Map | null): void {
  if (!map) return;
  try {
    const container = map.getContainer();
    if (!container?.isConnected) return;
    if (container.offsetWidth === 0 && container.offsetHeight === 0) return;
    map.invalidateSize({ animate: false, pan: false });
  } catch {
    /* carte démontée entre-temps */
  }
}

const HomeCIMap: React.FC<Props> = ({ points }) => {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;

    let cancelled = false;
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const map = L.map(mapElRef.current, {
      center: CI_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 13,
      scrollWheelZoom: false,
      attributionControl: false,
      maxBounds: CI_BOUNDS,
      maxBoundsViscosity: 0.7,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    const scheduleInvalidate = () => {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(() => {
        invalidateTimer = null;
        if (cancelled || mapRef.current !== map) return;
        safeInvalidateSize(map);
      }, 120);
    };

    scheduleInvalidate();

    const el = mapElRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!cancelled && mapRef.current === map) scheduleInvalidate();
      });
      resizeObserver.observe(el);
    }

    return () => {
      cancelled = true;
      if (invalidateTimer) clearTimeout(invalidateTimer);
      resizeObserver?.disconnect();
      try {
        map.remove();
      } catch {
        /* déjà supprimée */
      }
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Mise à jour des marqueurs quand les points changent
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    layer.clearLayers();

    points.forEach((p) => {
      if (!p.lat || !p.lng) return;
      const color = ptColor(p.type);
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: p.verified ? 8 : 5,
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: p.verified ? 2 : 1,
      });
      const typeLabel = p.type === 'seller' ? 'Vendeur' : 'Prestataire';
      marker.bindPopup(
        `<div style="min-width:120px">
           <strong style="text-transform:capitalize">${typeLabel}${p.verified ? ' — Vérifié' : ''}</strong>
           <div style="color:#667168;font-size:12px">${escapeHtml(p.zone || '—')}</div>
         </div>`
      );
      marker.addTo(layer);
    });
  }, [points]);

  const isEmpty = points.length === 0;

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Conteneur Leaflet */}
      <Box ref={mapElRef} sx={{ width: '100%', height: '100%', zIndex: 1 }} />

      {/* État vide */}
      {isEmpty && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            pointerEvents: 'none',
          }}
        >
          <Box sx={{ backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 2, px: 3, py: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Aucune donnée géographique disponible
            </Typography>
          </Box>
        </Box>
      )}

      {/* Légende */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          zIndex: 500,
          backgroundColor: 'rgba(255,255,255,0.92)',
          borderRadius: 2,
          px: 1.5,
          py: 1,
          border: `1px solid ${colors.border}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors.forestGreen }} />
          <Typography variant="caption" color="text.secondary">Prestataires</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors.primary600 }} />
          <Typography variant="caption" color="text.secondary">Vendeurs</Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Échappement HTML minimal pour le contenu des popups
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default HomeCIMap;
