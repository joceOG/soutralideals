import React from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Avatar,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VerifiedIcon from '@mui/icons-material/Verified';
import { colors } from '../../tokens/colors';
import type { VendeurPickerOption } from '../../services/articleService';

export interface VendeurShopAutocompleteProps {
  options: VendeurPickerOption[];
  value: VendeurPickerOption | null;
  onChange: (option: VendeurPickerOption | null) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  label?: string;
  helperText?: string;
}

export const VendeurShopAutocomplete: React.FC<VendeurShopAutocompleteProps> = ({
  options,
  value,
  onChange,
  disabled,
  loading,
  error,
  label = 'Boutique / Vendeur *',
  helperText = 'Choisissez la boutique propriétaire de l’article.',
}) => (
  <Autocomplete
    options={options}
    value={value}
    onChange={(_, v) => onChange(v)}
    disabled={disabled}
    loading={loading}
    getOptionLabel={(o) => o.shopName}
    isOptionEqualToValue={(a, b) => a.id === b.id}
    renderOption={(props, option) => (
      <Box component="li" {...props} key={option.id}>
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 0.5, width: '100%' }}>
          {option.shopLogo ? (
            <Avatar src={option.shopLogo} variant="rounded" sx={{ width: 36, height: 36 }} />
          ) : (
            <Avatar variant="rounded" sx={{ width: 36, height: 36, bgcolor: colors.bgWarm }}>
              <StorefrontIcon fontSize="small" color="primary" />
            </Avatar>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {option.shopName}
              </Typography>
              {option.isVerified ? (
                <VerifiedIcon sx={{ fontSize: 16, color: colors.emerald }} aria-label="Vérifiée" />
              ) : null}
            </Stack>
            <Typography variant="caption" color={colors.textMuted} display="block" noWrap>
              {option.ownerLabel}
              {option.categoriesLabel ? ` · ${option.categoriesLabel}` : ''}
            </Typography>
          </Box>
        </Stack>
      </Box>
    )}
    renderInput={(params) => (
      <TextField
        {...params}
        label={label}
        size="small"
        required
        error={Boolean(error)}
        helperText={error || helperText}
      />
    )}
  />
);

export interface VendeurShopLockedSummaryProps {
  shopName: string;
  shopLogo?: string | null;
  ownerLabel?: string;
  lockedHint?: string;
}

export const VendeurShopLockedSummary: React.FC<VendeurShopLockedSummaryProps> = ({
  shopName,
  shopLogo,
  ownerLabel,
  lockedHint = 'Boutique verrouillée pour cette opération.',
}) => (
  <Box
    sx={{
      p: 1.5,
      borderRadius: 2,
      border: `1px solid ${colors.border}`,
      bgcolor: colors.bgWarm,
    }}
  >
    <Typography variant="caption" color={colors.textMuted} display="block" mb={0.5}>
      Boutique
    </Typography>
    <Stack direction="row" alignItems="center" gap={1.5}>
      {shopLogo ? (
        <Avatar src={shopLogo} variant="rounded" sx={{ width: 40, height: 40 }} />
      ) : (
        <Avatar variant="rounded" sx={{ width: 40, height: 40 }}>
          <StorefrontIcon />
        </Avatar>
      )}
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {shopName}
        </Typography>
        {ownerLabel ? (
          <Typography variant="caption" color={colors.textSecondary}>
            {ownerLabel}
          </Typography>
        ) : null}
      </Box>
      <Chip size="small" label="Verrouillé" sx={{ ml: 'auto' }} />
    </Stack>
    <Typography variant="caption" color={colors.textMuted} sx={{ mt: 1, display: 'block' }}>
      {lockedHint}
    </Typography>
  </Box>
);
