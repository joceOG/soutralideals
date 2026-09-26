import React from 'react';
import { Box, Typography } from '@mui/material';
import { colors } from '../../tokens/colors';

export interface AdminFormSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AdminFormSection: React.FC<AdminFormSectionProps> = ({
  title,
  subtitle,
  children,
}) => (
  <Box
    sx={{
      bgcolor: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: '12px',
      p: { xs: 2, sm: 2.5 },
      mb: 2,
    }}
  >
    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: colors.textPrimary, mb: subtitle ? 0.5 : 1.5 }}>
      {title}
    </Typography>
    {subtitle ? (
      <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1.5 }}>
        {subtitle}
      </Typography>
    ) : null}
    {children}
  </Box>
);
