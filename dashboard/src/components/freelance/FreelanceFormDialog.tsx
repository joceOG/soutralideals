import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  TextField,
  MenuItem,
  Stack,
  Autocomplete,
  Chip,
  Typography,
  Alert,
  Box,
  useMediaQuery,
  useTheme,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { apiClient } from '../../services/setupApi';
import { colors } from '../../tokens/colors';
import {
  AdminFormSection,
  AdminFileUpload,
  AdminFormActions,
  UnsavedChangesDialog,
} from '../admin';
import { formatPrice } from '../admin/utils';
import {
  FREELANCE_FORM_STEPS,
  emptyFreelanceFormValues,
  normalizeFreelanceForEdit,
  buildFreelanceFormData,
  validateFreelanceStep,
  collectFreelanceMissing,
  mapFreelanceApiError,
  FreelanceFormValues,
  FreelanceFormFiles,
  FreelanceExistingMedia,
  FreelanceUtilisateurRef,
} from '../../services/freelanceService';

export interface FreelanceFormDialogProps {
  open: boolean;
  freelanceId?: string | null;
  onClose: () => void;
  onSuccess: (saved: Record<string, unknown>) => void;
}

interface FreelanceServiceRef {
  _id: string;
  nomservice: string;
  categorie?: { nomcategorie?: string; groupe?: { nomgroupe?: string } };
}

const EMPTY_FILES: FreelanceFormFiles = {
  profileImage: null,
  cni1: null,
  cni2: null,
  selfie: null,
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Actif' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'suspended', label: 'Suspendu' },
];

const ACCOUNT_STATUS_OPTIONS = ['Pending', 'Active', 'Suspended', 'Rejected'];

export const FreelanceFormDialog: React.FC<FreelanceFormDialogProps> = ({
  open,
  freelanceId,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const compactStepper = useMediaQuery(theme.breakpoints.down('sm'));
  const isUpdate = Boolean(freelanceId);

  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<FreelanceFormValues>(emptyFreelanceFormValues());
  const [files, setFiles] = useState<FreelanceFormFiles>(EMPTY_FILES);
  const [existingMedia, setExistingMedia] = useState<FreelanceExistingMedia>({
    profileImage: false,
    cni1: false,
    cni2: false,
    selfie: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [utilisateurs, setUtilisateurs] = useState<FreelanceUtilisateurRef[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const selectedUser = useMemo(
    () => utilisateurs.find((u) => u._id === values.utilisateurId) ?? null,
    [utilisateurs, values.utilisateurId],
  );

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setValues(emptyFreelanceFormValues());
    setFiles(EMPTY_FILES);
    setExistingMedia({ profileImage: false, cni1: false, cni2: false, selfie: false });
    setFieldErrors({});
    setFormError(null);
    setDirty(false);
  }, []);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [uRes, sRes] = await Promise.all([
        apiClient.get<FreelanceUtilisateurRef[]>('/utilisateur'),
        apiClient.get<FreelanceServiceRef[]>('/service'),
      ]);
      setUtilisateurs(Array.isArray(uRes.data) ? uRes.data : []);
      const services = Array.isArray(sRes.data) ? sRes.data : [];
      const cats = new Set<string>();
      for (const s of services) {
        if (s.categorie?.groupe?.nomgroupe === 'Freelance' && s.categorie?.nomcategorie) {
          cats.add(s.categorie.nomcategorie);
        }
      }
      setCategoryOptions([...cats].sort());
    } catch {
      setFormError('Impossible de charger les listes utilisateurs / catégories.');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const res = await apiClient.get(`/freelance/${id}`);
        const { values: v, existingMedia: media } = normalizeFreelanceForEdit(
          res.data as Record<string, unknown>,
        );
        setValues(v);
        setExistingMedia(media);
        const u = (res.data as { utilisateur?: FreelanceUtilisateurRef }).utilisateur;
        if (u?._id && !utilisateurs.some((x) => x._id === u._id)) {
          setUtilisateurs((prev) => [...prev, u]);
        }
      } catch {
        setFormError('Impossible de charger le freelance.');
      } finally {
        setLoadingDetail(false);
      }
    },
    [utilisateurs],
  );

  useEffect(() => {
    if (!open) return;
    resetForm();
    loadOptions();
    if (freelanceId) loadDetail(freelanceId);
  }, [open, freelanceId, resetForm, loadOptions, loadDetail]);

  const markDirty = () => setDirty(true);

  const tryClose = () => {
    if (dirty && !submitting) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const runStepValidation = (step: number) => {
    const err = validateFreelanceStep(step, values, files, existingMedia, isUpdate);
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (!runStepValidation(activeStep)) return;
    setActiveStep((s) => Math.min(s + 1, FREELANCE_FORM_STEPS.length - 1));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    for (let i = 0; i <= 3; i++) {
      const err = validateFreelanceStep(i, values, files, existingMedia, isUpdate);
      if (Object.keys(err).length) {
        setFieldErrors(err);
        setActiveStep(i);
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const form = buildFreelanceFormData(values, files, { isUpdate });
      const url = isUpdate ? `/freelance/${freelanceId}` : '/freelance';
      const method = isUpdate ? 'put' : 'post';
      const res = await apiClient({ method, url, data: form });
      setDirty(false);
      onSuccess(res.data as Record<string, unknown>);
      onClose();
    } catch (e) {
      setFormError(mapFreelanceApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const missing = collectFreelanceMissing(values, files, existingMedia, isUpdate);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <AdminFormSection
            title="Identité professionnelle"
            subtitle="Associez un compte utilisateur existant. Aucune inscription depuis ce formulaire."
          >
            <Autocomplete
              options={utilisateurs}
              loading={loadingOptions}
              disabled={isUpdate}
              value={selectedUser}
              getOptionLabel={(o) =>
                `${o.prenom} ${o.nom}${o.telephone ? ` — ${o.telephone}` : ''}`
              }
              isOptionEqualToValue={(a, b) => a._id === b._id}
              onChange={(_, u) => {
                markDirty();
                setValues((prev) => ({ ...prev, utilisateurId: u?._id ?? '' }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Utilisateur"
                  placeholder="Rechercher par nom ou téléphone"
                  error={Boolean(fieldErrors.utilisateurId)}
                  helperText={
                    fieldErrors.utilisateurId ||
                    (isUpdate ? 'Non modifiable en édition.' : 'Obligatoire à la création.')
                  }
                />
              )}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Nom affiché"
              value={values.name}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, name: e.target.value }));
              }}
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Métier / titre"
              value={values.job}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, job: e.target.value }));
              }}
              error={Boolean(fieldErrors.job)}
              helperText={fieldErrors.job}
            />
            <TextField
              fullWidth
              margin="normal"
              multiline
              minRows={2}
              label="Présentation courte"
              value={values.description}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, description: e.target.value }));
              }}
              helperText="Visible sur le profil catalogue."
            />
          </AdminFormSection>
        );
      case 1:
        return (
          <AdminFormSection title="Compétences et services">
            <TextField
              select
              fullWidth
              label="Catégorie"
              value={values.category}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, category: e.target.value }));
              }}
              error={Boolean(fieldErrors.category)}
              helperText={fieldErrors.category || 'Alignée sur le catalogue Freelance.'}
            >
              {categoryOptions.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
              {values.category && !categoryOptions.includes(values.category) ? (
                <MenuItem value={values.category}>{values.category}</MenuItem>
              ) : null}
            </TextField>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={values.skills}
              onChange={(_, v) => {
                markDirty();
                setValues((p) => ({ ...p, skills: v }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="Compétences" placeholder="Ajouter une compétence" margin="normal" />
              )}
            />
            <Autocomplete
              multiple
              freeSolo
              options={categoryOptions}
              value={values.preferredCategories}
              onChange={(_, v) => {
                markDirty();
                setValues((p) => ({ ...p, preferredCategories: v }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Catégories préférées (optionnel)"
                  placeholder="Par défaut : catégorie principale"
                  margin="normal"
                />
              )}
            />
          </AdminFormSection>
        );
      case 2:
        return (
          <AdminFormSection title="Tarification et disponibilité">
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Tarif horaire (FCFA)"
                type="number"
                inputProps={{ min: 1 }}
                value={values.hourlyRate || ''}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, hourlyRate: Number(e.target.value) || 0 }));
                }}
                error={Boolean(fieldErrors.hourlyRate)}
                helperText={fieldErrors.hourlyRate}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  select
                  label="Niveau d'expérience"
                  value={values.experienceLevel}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, experienceLevel: e.target.value }));
                  }}
                >
                  {['Débutant', 'Intermédiaire', 'Expert'].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  fullWidth
                  select
                  label="Disponibilité"
                  value={values.availabilityStatus}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, availabilityStatus: e.target.value }));
                  }}
                >
                  {['Disponible', 'Occupé', 'En pause'].map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <TextField
                select
                fullWidth
                label="Rythme de travail"
                value={values.workingHours}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, workingHours: e.target.value }));
                }}
              >
                {['Temps plein', 'Temps partiel', 'Ponctuel'].map((v) => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Budget minimum projet (FCFA)"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={values.minimumProjectBudget || ''}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({
                      ...p,
                      minimumProjectBudget: Number(e.target.value) || 0,
                    }));
                  }}
                />
                <TextField
                  fullWidth
                  label="Projets max / mois"
                  type="number"
                  inputProps={{ min: 1 }}
                  value={values.maxProjectsPerMonth}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({
                      ...p,
                      maxProjectsPerMonth: Number(e.target.value) || 10,
                    }));
                  }}
                />
              </Stack>
              <TextField
                fullWidth
                label="Localisation"
                value={values.location}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, location: e.target.value }));
                }}
                error={Boolean(fieldErrors.location)}
                helperText={fieldErrors.location}
              />
              <TextField
                fullWidth
                label="Téléphone"
                value={values.phoneNumber}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, phoneNumber: e.target.value }));
                }}
              />
            </Stack>
          </AdminFormSection>
        );
      case 3:
        return (
          <Stack spacing={2}>
            <AdminFormSection title="Photo professionnelle" subtitle="Image publique du catalogue (Cloudinary public).">
              <AdminFileUpload
                label="Photo de profil"
                file={files.profileImage}
                existingLabel={
                  existingMedia.profileImage && !files.profileImage ? 'Photo enregistrée' : undefined
                }
                error={fieldErrors.profileImage}
                onFileChange={(f) => {
                  markDirty();
                  setFiles((p) => ({ ...p, profileImage: f }));
                }}
              />
            </AdminFormSection>
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              Les pièces KYC (CNI, selfie) sont stockées en mode authentifié. Elles ne sont jamais listées ni
              prévisualisées par URL dans l’admin. Laissez vides les champs pour conserver les documents existants.
            </Alert>
            <AdminFileUpload
              label="CNI recto"
              file={files.cni1}
              existingLabel={existingMedia.cni1 && !files.cni1 ? 'Document enregistré' : undefined}
              error={fieldErrors.cni1}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, cni1: f }));
              }}
            />
            <AdminFileUpload
              label="CNI verso"
              file={files.cni2}
              existingLabel={existingMedia.cni2 && !files.cni2 ? 'Document enregistré' : undefined}
              error={fieldErrors.cni2}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, cni2: f }));
              }}
            />
            <AdminFileUpload
              label="Selfie avec CNI"
              file={files.selfie}
              existingLabel={existingMedia.selfie && !files.selfie ? 'Document enregistré' : undefined}
              error={fieldErrors.selfie}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, selfie: f }));
              }}
            />
            <AdminFormSection title="Modération admin">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.isVerified}
                    onChange={(e) => {
                      markDirty();
                      setValues((p) => ({ ...p, isVerified: e.target.checked }));
                    }}
                  />
                }
                label="Documents vérifiés"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.isTopRated}
                    onChange={(e) => {
                      markDirty();
                      setValues((p) => ({ ...p, isTopRated: e.target.checked }));
                    }}
                  />
                }
                label="Top rated"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.isFeatured}
                    onChange={(e) => {
                      markDirty();
                      setValues((p) => ({ ...p, isFeatured: e.target.checked }));
                    }}
                  />
                }
                label="Mis en avant"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
                <TextField
                  select
                  fullWidth
                  label="Statut compte"
                  value={values.accountStatus}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, accountStatus: e.target.value }));
                  }}
                >
                  {ACCOUNT_STATUS_OPTIONS.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  fullWidth
                  label="Statut profil"
                  value={values.status}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, status: e.target.value }));
                  }}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </AdminFormSection>
          </Stack>
        );
      case 4:
      default:
        return (
          <AdminFormSection title="Récapitulatif">
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Utilisateur :</strong>{' '}
                {selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Profil :</strong> {values.name || '—'} — {values.job || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Catégorie :</strong> {values.category || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Localisation :</strong> {values.location || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Tarif horaire :</strong> {formatPrice(values.hourlyRate)}
              </Typography>
              <Typography variant="body2">
                <strong>Médias :</strong>{' '}
                {[
                  existingMedia.profileImage || files.profileImage ? 'Photo profil' : null,
                  existingMedia.cni1 || files.cni1 ? 'CNI recto' : null,
                  existingMedia.cni2 || files.cni2 ? 'CNI verso' : null,
                  existingMedia.selfie || files.selfie ? 'Selfie' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Aucun document'}
              </Typography>
            </Stack>
            {missing.length > 0 ? (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
                Champs à compléter : {missing.join(' · ')}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                Le formulaire est prêt à être enregistré.
              </Alert>
            )}
          </AdminFormSection>
        );
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={tryClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: '14px', maxHeight: '95vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pr: 6 }}>
          {isUpdate ? 'Modifier le freelance' : 'Créer un freelance'}
          <IconButton onClick={tryClose} sx={{ position: 'absolute', right: 12, top: 12 }} aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: colors.bgWarm }}>
          {formError ? (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          ) : null}
          {(loadingDetail || loadingOptions) && activeStep === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chargement…
            </Typography>
          ) : null}
          <Stepper
            activeStep={activeStep}
            alternativeLabel={!compactStepper}
            orientation={compactStepper ? 'vertical' : 'horizontal'}
            sx={{ mb: 3, display: { xs: compactStepper ? 'flex' : 'none', sm: 'flex' } }}
          >
            {FREELANCE_FORM_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Étape {activeStep + 1} / {FREELANCE_FORM_STEPS.length} — {FREELANCE_FORM_STEPS[activeStep]}
            </Typography>
          </Box>
          {renderStep()}
        </DialogContent>
        <AdminFormActions
          activeStep={activeStep}
          stepCount={FREELANCE_FORM_STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isUpdate ? 'Enregistrer les modifications' : 'Créer le freelance'}
        />
      </Dialog>
      <UnsavedChangesDialog
        open={unsavedOpen}
        onCancel={() => setUnsavedOpen(false)}
        onConfirm={() => {
          setUnsavedOpen(false);
          setDirty(false);
          onClose();
        }}
      />
    </>
  );
};
