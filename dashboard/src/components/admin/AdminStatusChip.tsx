import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

type StatusVariant =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'inactive'
  | 'active'
  | 'unknown'
  | (string & {});

interface AdminStatusChipProps extends Omit<ChipProps, 'label' | 'color' | 'icon'> {
  status: StatusVariant;
  /** Surcharger le libellé affiché */
  label?: string;
}

const STATUS_MAP: Record<string, { label: string; color: ChipProps['color']; icon: React.ReactElement }> = {
  verified: { label: 'Vérifié', color: 'success', icon: <CheckCircleOutlineIcon fontSize="small" /> },
  active: { label: 'Actif', color: 'success', icon: <CheckCircleOutlineIcon fontSize="small" /> },
  pending: { label: 'En attente', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  en_attente: { label: 'En attente', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  pending_review: { label: 'En révision', color: 'warning', icon: <HourglassEmptyIcon fontSize="small" /> },
  rejected: { label: 'Rejeté', color: 'error', icon: <BlockIcon fontSize="small" /> },
  inactive: { label: 'Inactif', color: 'default', icon: <BlockIcon fontSize="small" /> },
};

/**
 * Retourne le libellé normalisé d'un statut.
 * Utile pour les colonnes de tableau sans composant complet.
 */
export const statusLabel = (status: string | undefined | null): string => {
  if (!status) return 'Inconnu';
  return STATUS_MAP[status.toLowerCase()]?.label ?? status;
};

export const AdminStatusChip: React.FC<AdminStatusChipProps> = ({ status, label, size = 'small', ...rest }) => {
  const key = (status ?? '').toLowerCase();
  const config = STATUS_MAP[key] ?? {
    label: status || 'Inconnu',
    color: 'default' as ChipProps['color'],
    icon: <HelpOutlineIcon fontSize="small" />,
  };

  return (
    <Chip
      label={label ?? config.label}
      color={config.color}
      icon={config.icon}
      size={size}
      variant="outlined"
      {...rest}
    />
  );
};
