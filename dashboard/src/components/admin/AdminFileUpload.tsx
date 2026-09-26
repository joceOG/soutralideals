import React, { useEffect, useId, useState } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { colors } from '../../tokens/colors';
import { PRESTATAIRE_ACCEPT_IMAGES, PRESTATAIRE_MAX_FILE_BYTES } from '../../services/prestataireService';

export interface AdminFileUploadProps {
  label: string;
  helperText?: string;
  error?: string;
  accept?: string;
  maxBytes?: number;
  file: File | null;
  onFileChange: (file: File | null) => void;
  existingLabel?: string;
  disabled?: boolean;
}

export const AdminFileUpload: React.FC<AdminFileUploadProps> = ({
  label,
  helperText,
  error,
  accept = PRESTATAIRE_ACCEPT_IMAGES,
  maxBytes = PRESTATAIRE_MAX_FILE_BYTES,
  file,
  onFileChange,
  existingLabel,
  disabled,
}) => {
  const inputId = useId();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Box
      sx={{
        border: `1px dashed ${error ? colors.error : colors.border}`,
        borderRadius: '12px',
        p: 2,
        bgcolor: colors.greenPale,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
        {label}
      </Typography>
      {helperText ? (
        <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mb: 1 }}>
          {helperText}
        </Typography>
      ) : null}
      <Typography variant="caption" sx={{ color: colors.textMuted, display: 'block', mb: 1 }}>
        Images uniquement — max {(maxBytes / (1024 * 1024)).toFixed(0)} Mo
      </Typography>

      {existingLabel && !file ? (
        <Typography variant="body2" sx={{ color: colors.emerald, mb: 1 }}>
          {existingLabel}
        </Typography>
      ) : null}

      {file ? (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt=""
              sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '10px', border: `1px solid ${colors.border}` }}
            />
          ) : null}
          <Box>
            <Typography variant="body2">{file.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {(file.size / 1024).toFixed(0)} Ko
            </Typography>
          </Box>
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          size="small"
          component="label"
          htmlFor={inputId}
          startIcon={<CloudUploadOutlinedIcon />}
          disabled={disabled}
          sx={{ borderRadius: '10px' }}
        >
          Choisir un fichier
        </Button>
        {file ? (
          <Button size="small" color="inherit" onClick={() => onFileChange(null)} disabled={disabled}>
            Retirer
          </Button>
        ) : null}
      </Stack>

      <input
        id={inputId}
        type="file"
        accept={accept}
        hidden
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileChange(f);
          e.target.value = '';
        }}
      />

      {error ? (
        <Typography variant="caption" sx={{ color: colors.error, display: 'block', mt: 1 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
};
