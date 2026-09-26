import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  IconButton,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { colors } from '../../tokens/colors';
import { AdminFormSection } from '../admin/AdminFormSection';
import { AdminFormActions } from '../admin/AdminFormActions';
import { AdminConfirmDialog } from '../admin/AdminConfirmDialog';
import { Link as RouterLink } from 'react-router-dom';
import {
  UtilisateurFormValues,
  UtilisateurListItem,
  ACCOUNT_ACCESS_ROLES,
  emptyUtilisateurFormValues,
  validateUtilisateurForm,
  buildUtilisateurFormData,
  fetchUtilisateurCapabilities,
  PRO_ROLE_HINT,
  ACCOUNT_CREATE_HELP,
  UserCapabilitiesSummary,
  resolveAccountAccessRole,
  isLegacyProfessionalStoredRole,
  professionalProfileLabel,
  PRO_MODULE_PATHS,
  AccountAccessRole,
} from '../../services/utilisateurService';

export interface UtilisateurFormDialogProps {
  open: boolean;
  editTarget: UtilisateurListItem | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, values: UtilisateurFormValues) => Promise<void>;
}

export const UtilisateurFormDialog: React.FC<UtilisateurFormDialogProps> = ({
  open,
  editTarget,
  saving,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = useState<UtilisateurFormValues>(emptyUtilisateurFormValues());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [capabilities, setCapabilities] = useState<UserCapabilitiesSummary | null>(null);
  const [initialAccountRole, setInitialAccountRole] = useState<AccountAccessRole>('Client');
  const [confirmAdminOpen, setConfirmAdminOpen] = useState(false);
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<FormData | null>(null);

  const isUpdate = Boolean(editTarget?._id);

  useEffect(() => {
    if (!open) return;
    setFormErrors({});
    setPhotoFile(null);
    setCapabilities(null);
    if (editTarget) {
      const accountRole = resolveAccountAccessRole(editTarget.role);
      setInitialAccountRole(accountRole);
      setValues({
        ...emptyUtilisateurFormValues(),
        nom: editTarget.nom,
        prenom: editTarget.prenom,
        email: editTarget.email ?? '',
        telephone: editTarget.telephone ?? '',
        genre: editTarget.genre ?? '',
        datedenaissance: editTarget.datedenaissance ?? '',
        role: accountRole,
        isActive: editTarget.isActive !== false,
        password: '',
        passwordConfirm: '',
      });
      fetchUtilisateurCapabilities(editTarget._id)
        .then(setCapabilities)
        .catch(() => setCapabilities(null));
    } else {
      setInitialAccountRole('Client');
      setValues(emptyUtilisateurFormValues());
    }
  }, [open, editTarget]);

  const legacyStoredRole = editTarget && isLegacyProfessionalStoredRole(editTarget.role) ? editTarget.role : null;

  const profileEntries = useMemo(() => {
    if (!capabilities) return [];
    return (['prestataire', 'freelance', 'vendeur'] as const).map((key) => ({
      key,
      profile: capabilities.profiles[key],
      label: professionalProfileLabel(key, capabilities.profiles[key]),
      path: PRO_MODULE_PATHS[key],
    }));
  }, [capabilities]);

  const runSubmit = async (fd: FormData) => {
    await onSubmit(fd, values);
  };

  const handleSubmitClick = async () => {
    const errors = validateUtilisateurForm(values, { isUpdate });
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    const roleChanged = isUpdate && values.role !== initialAccountRole;
    const fd = buildUtilisateurFormData(values, photoFile, {
      isUpdate,
      includeRole: !isUpdate || roleChanged,
    });

    if (values.role === 'Admin' && initialAccountRole !== 'Admin') {
      setPendingForm(fd);
      setConfirmAdminOpen(true);
      return;
    }
    if (isUpdate && editTarget?.isActive !== false && values.isActive === false) {
      setPendingForm(fd);
      setConfirmDeactivateOpen(true);
      return;
    }
    await runSubmit(fd);
  };

  const handleChange = (field: keyof UtilisateurFormValues, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const showLegacyInconsistency =
    isUpdate &&
    capabilities?.inconsistencies.includes('LEGACY_ROLE_WITHOUT_PROFILE');

  return (
    <>
      <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle sx={{ borderBottom: `1px solid ${colors.border}`, pb: 1.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography fontWeight={700}>
              {isUpdate ? 'Modifier l’utilisateur' : 'Nouvel utilisateur'}
            </Typography>
            <IconButton size="small" onClick={onClose} disabled={saving} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <AdminFormSection title="Identité" subtitle="Informations personnelles du compte.">
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Prénom *"
                size="small"
                value={values.prenom}
                onChange={(e) => handleChange('prenom', e.target.value)}
                error={Boolean(formErrors.prenom)}
                helperText={formErrors.prenom}
              />
              <TextField
                fullWidth
                label="Nom *"
                size="small"
                value={values.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                error={Boolean(formErrors.nom)}
                helperText={formErrors.nom}
              />
            </Stack>
            <Button variant="outlined" component="label" sx={{ mt: 2 }} disabled={saving}>
              {photoFile ? photoFile.name : editTarget?.photoProfil ? 'Remplacer la photo' : 'Photo de profil (optionnel)'}
              <input type="file" hidden accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </Button>
          </AdminFormSection>

          <AdminFormSection title="Contact">
            <Stack gap={2}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                size="small"
                value={values.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={Boolean(formErrors.email)}
                helperText={formErrors.email}
              />
              <TextField
                fullWidth
                label="Téléphone"
                size="small"
                value={values.telephone}
                onChange={(e) => handleChange('telephone', e.target.value)}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
                <TextField
                  fullWidth
                  label="Date de naissance"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={values.datedenaissance}
                  onChange={(e) => handleChange('datedenaissance', e.target.value)}
                />
                <TextField
                  select
                  fullWidth
                  label="Genre"
                  size="small"
                  value={values.genre}
                  onChange={(e) => handleChange('genre', e.target.value)}
                >
                  <MenuItem value="">Non spécifié</MenuItem>
                  <MenuItem value="Homme">Homme</MenuItem>
                  <MenuItem value="Femme">Femme</MenuItem>
                </TextField>
              </Stack>
            </Stack>
          </AdminFormSection>

          <AdminFormSection title="Accès au compte" subtitle={PRO_ROLE_HINT}>
            <Stack gap={2}>
              <TextField
                select
                fullWidth
                label="Rôle de compte *"
                size="small"
                value={values.role}
                onChange={(e) => handleChange('role', e.target.value as AccountAccessRole)}
                error={Boolean(formErrors.role)}
                helperText={formErrors.role || (!isUpdate ? ACCOUNT_CREATE_HELP : undefined)}
              >
                {ACCOUNT_ACCESS_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
              {legacyStoredRole ? (
                <Chip size="small" label={`Rôle historique : ${legacyStoredRole}`} color="warning" variant="outlined" />
              ) : null}
              <FormControlLabel
                control={
                  <Switch
                    checked={values.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    disabled={saving}
                  />
                }
                label={values.isActive ? 'Compte actif' : 'Compte désactivé'}
              />
            </Stack>
          </AdminFormSection>

          <AdminFormSection title="Activités professionnelles" subtitle="Lecture seule — gérées dans les modules métier.">
            {!isUpdate ? (
              <Typography variant="body2" color={colors.textSecondary}>
                Les capacités apparaîtront après création des profils Prestataire, Freelance ou Vendeur.
              </Typography>
            ) : capabilities ? (
              <Stack gap={1}>
                {profileEntries.map(({ key, profile, label, path }) => (
                  <Stack key={key} direction="row" alignItems="center" gap={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={label}
                      color={profile.canOperate ? 'success' : profile.exists ? 'warning' : 'default'}
                      variant={profile.exists ? 'filled' : 'outlined'}
                    />
                    {profile.exists && profile.id ? (
                      <Button component={RouterLink} to={path} size="small" variant="text">
                        Ouvrir le module
                      </Button>
                    ) : null}
                  </Stack>
                ))}
                {capabilities.capabilities.length > 0 ? (
                  <Typography variant="caption" color={colors.textMuted}>
                    Capacités actives : {capabilities.capabilities.join(', ')}
                  </Typography>
                ) : null}
                {showLegacyInconsistency ? (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    Rôle historique sans profil associé — créez le profil dans le module correspondant ou planifiez une
                    normalisation ultérieure.
                  </Alert>
                ) : null}
              </Stack>
            ) : (
              <Typography variant="body2" color={colors.textMuted}>
                Chargement des activités…
              </Typography>
            )}
          </AdminFormSection>

          {!isUpdate ? (
            <AdminFormSection title="Mot de passe" subtitle="Minimum 6 caractères. Jamais affiché après création.">
              <Stack gap={2}>
                <TextField
                  fullWidth
                  label="Mot de passe *"
                  type="password"
                  size="small"
                  autoComplete="new-password"
                  value={values.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  error={Boolean(formErrors.password)}
                  helperText={formErrors.password || 'Hashé côté serveur — jamais renvoyé en clair.'}
                />
                <TextField
                  fullWidth
                  label="Confirmer le mot de passe *"
                  type="password"
                  size="small"
                  autoComplete="new-password"
                  value={values.passwordConfirm}
                  onChange={(e) => handleChange('passwordConfirm', e.target.value)}
                  error={Boolean(formErrors.passwordConfirm)}
                  helperText={formErrors.passwordConfirm}
                />
              </Stack>
            </AdminFormSection>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
              Le mot de passe n’est pas modifiable ici. Utilisez la réinitialisation dédiée si disponible.
            </Alert>
          )}

          <AdminFormActions
            showBack={false}
            showNext={false}
            showSubmit
            submitLabel={isUpdate ? 'Enregistrer les modifications' : 'Créer l’utilisateur'}
            onSubmit={handleSubmitClick}
            loading={saving}
            disableSubmit={saving}
          />
        </DialogContent>
      </Dialog>

      <AdminConfirmDialog
        open={confirmAdminOpen}
        title="Attribuer le rôle Admin"
        message="Vous allez accorder des droits administrateur complets. Confirmez cette action."
        severity="warning"
        confirmLabel="Confirmer Admin"
        loading={saving}
        onCancel={() => {
          setConfirmAdminOpen(false);
          setPendingForm(null);
        }}
        onConfirm={async () => {
          if (pendingForm) await runSubmit(pendingForm);
          setConfirmAdminOpen(false);
          setPendingForm(null);
        }}
      />

      <AdminConfirmDialog
        open={confirmDeactivateOpen}
        title="Désactiver le compte"
        message="L’utilisateur ne pourra plus se connecter tant que le compte reste désactivé."
        severity="warning"
        confirmLabel="Désactiver"
        loading={saving}
        onCancel={() => {
          setConfirmDeactivateOpen(false);
          setPendingForm(null);
        }}
        onConfirm={async () => {
          if (pendingForm) await runSubmit(pendingForm);
          setConfirmDeactivateOpen(false);
          setPendingForm(null);
        }}
      />
    </>
  );
};
