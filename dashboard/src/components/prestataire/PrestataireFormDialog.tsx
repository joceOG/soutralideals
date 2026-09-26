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
import {
  PRESTATAIRE_FORM_STEPS,
  emptyPrestataireFormValues,
  normalizePrestataireForEdit,
  buildPrestataireFormData,
  validatePrestataireStep,
  collectPrestataireMissingFields,
  mapPrestataireApiError,
  PrestataireFormValues,
  PrestataireKycFiles,
  PrestataireExistingKyc,
  PrestataireUtilisateurRef,
  PrestataireServiceRef,
} from '../../services/prestataireService';
import { formatPrice } from '../admin/utils';

export interface PrestataireFormDialogProps {
  open: boolean;
  prestataireId?: string | null;
  onClose: () => void;
  onSuccess: (saved: Record<string, unknown>) => void;
}

const EMPTY_FILES: PrestataireKycFiles = {
  cni1: null,
  cni2: null,
  selfie: null,
  attestationAssurance: null,
};

const STATUS_OPTIONS = [
  { value: 'incomplete', label: 'Incomplet' },
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Actif' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'suspended', label: 'Suspendu' },
];

export const PrestataireFormDialog: React.FC<PrestataireFormDialogProps> = ({
  open,
  prestataireId,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const compactStepper = useMediaQuery(theme.breakpoints.down('sm'));
  const isUpdate = Boolean(prestataireId);

  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<PrestataireFormValues>(emptyPrestataireFormValues());
  const [files, setFiles] = useState<PrestataireKycFiles>(EMPTY_FILES);
  const [existingKyc, setExistingKyc] = useState<PrestataireExistingKyc>({
    cni1: false,
    cni2: false,
    selfie: false,
    attestationAssurance: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [utilisateurs, setUtilisateurs] = useState<PrestataireUtilisateurRef[]>([]);
  const [services, setServices] = useState<PrestataireServiceRef[]>([]);

  const selectedUser = useMemo(
    () => utilisateurs.find((u) => u._id === values.utilisateurId) ?? null,
    [utilisateurs, values.utilisateurId],
  );

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setValues(emptyPrestataireFormValues());
    setFiles(EMPTY_FILES);
    setExistingKyc({ cni1: false, cni2: false, selfie: false, attestationAssurance: false });
    setFieldErrors({});
    setFormError(null);
    setDirty(false);
  }, []);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const [uRes, sRes] = await Promise.all([
        apiClient.get<PrestataireUtilisateurRef[]>('/utilisateur'),
        apiClient.get<PrestataireServiceRef[]>('/service'),
      ]);
      const allServices = Array.isArray(sRes.data) ? sRes.data : [];
      setServices(
        allServices.filter((s) => {
          const g = (s as PrestataireServiceRef & { categorie?: { groupe?: { nomgroupe?: string } } }).categorie?.groupe?.nomgroupe;
          return g === 'Métiers';
        }),
      );
      setUtilisateurs(Array.isArray(uRes.data) ? uRes.data : []);
    } catch {
      setFormError('Impossible de charger les listes utilisateurs / services.');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiClient.get(`/prestataire/${id}`);
      const { values: v, existingKyc: kyc } = normalizePrestataireForEdit(res.data as Record<string, unknown>);
      setValues(v);
      setExistingKyc(kyc);
      const u = (res.data as { utilisateur?: PrestataireUtilisateurRef }).utilisateur;
      if (u?._id && !utilisateurs.some((x) => x._id === u._id)) {
        setUtilisateurs((prev) => [...prev, u]);
      }
    } catch {
      setFormError('Impossible de charger le prestataire.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
    loadOptions();
    if (prestataireId) loadDetail(prestataireId);
  }, [open, prestataireId, resetForm, loadOptions, loadDetail]);

  const markDirty = () => setDirty(true);

  const tryClose = () => {
    if (dirty && !submitting) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const runStepValidation = (step: number) => {
    const err = validatePrestataireStep(step, values, files, existingKyc, isUpdate);
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleNext = () => {
    if (!runStepValidation(activeStep)) return;
    setActiveStep((s) => Math.min(s + 1, PRESTATAIRE_FORM_STEPS.length - 1));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    for (let i = 0; i <= 3; i++) {
      const err = validatePrestataireStep(i, values, files, existingKyc, isUpdate);
      if (Object.keys(err).length) {
        setFieldErrors(err);
        setActiveStep(i);
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const form = buildPrestataireFormData(values, files, { isUpdate });
      const url = isUpdate ? `/prestataire/${prestataireId}` : '/prestataire';
      const method = isUpdate ? 'put' : 'post';
      const res = await apiClient({ method, url, data: form });
      setDirty(false);
      onSuccess(res.data as Record<string, unknown>);
      onClose();
    } catch (e) {
      setFormError(mapPrestataireApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const missing = collectPrestataireMissingFields(values, files, existingKyc, isUpdate);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <AdminFormSection title="Utilisateur associé" subtitle="Liez ce profil à un compte existant. Aucune inscription depuis ce formulaire.">
            <Autocomplete
              options={utilisateurs}
              loading={loadingOptions}
              value={selectedUser}
              getOptionLabel={(o) => `${o.prenom} ${o.nom}${o.telephone ? ` — ${o.telephone}` : ''}`}
              isOptionEqualToValue={(a, b) => a._id === b._id}
              onChange={(_, u) => {
                markDirty();
                setValues((prev) => ({
                  ...prev,
                  utilisateurId: u?._id ?? '',
                  utilisateurLabel: u ? `${u.prenom} ${u.nom}` : '',
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Utilisateur"
                  placeholder="Rechercher par nom ou téléphone"
                  error={Boolean(fieldErrors.utilisateurId)}
                  helperText={fieldErrors.utilisateurId || 'Obligatoire pour la création admin.'}
                />
              )}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Numéro CNI"
              value={values.numeroCNI}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, numeroCNI: e.target.value }));
              }}
              helperText="Optionnel — référence administrative."
            />
          </AdminFormSection>
        );
      case 1:
        return (
          <AdminFormSection title="Activité professionnelle">
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                label="Métier / service"
                value={values.serviceId}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, serviceId: e.target.value }));
                }}
                error={Boolean(fieldErrors.serviceId)}
                helperText={fieldErrors.serviceId}
              >
                {services.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.nomservice}
                    {s.categorie?.nomcategorie ? ` (${s.categorie.nomcategorie})` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={values.specialite}
                onChange={(_, v) => {
                  markDirty();
                  setValues((p) => ({ ...p, specialite: v }));
                }}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                  ))
                }
                renderInput={(params) => (
                  <TextField {...params} label="Spécialités" placeholder="Ajouter une spécialité" />
                )}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Tarif de base (FCFA)"
                  type="number"
                  inputProps={{ min: 0 }}
                  value={values.prixprestataire || ''}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, prixprestataire: Number(e.target.value) || 0 }));
                  }}
                  error={Boolean(fieldErrors.prixprestataire)}
                  helperText={fieldErrors.prixprestataire || 'Tarif affiché sur le catalogue.'}
                />
                <TextField
                  fullWidth
                  label="Années d'expérience"
                  value={values.anneeExperience}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, anneeExperience: e.target.value }));
                  }}
                  error={Boolean(fieldErrors.anneeExperience)}
                  helperText={fieldErrors.anneeExperience}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Tarif horaire min"
                  type="number"
                  value={values.tarifHoraireMin || ''}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, tarifHoraireMin: Number(e.target.value) || 0 }));
                  }}
                />
                <TextField
                  fullWidth
                  label="Tarif horaire max"
                  type="number"
                  value={values.tarifHoraireMax || ''}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, tarifHoraireMax: Number(e.target.value) || 0 }));
                  }}
                  error={Boolean(fieldErrors.tarifHoraireMax)}
                  helperText={fieldErrors.tarifHoraireMax}
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Description"
                value={values.description}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, description: e.target.value }));
                }}
                error={Boolean(fieldErrors.description)}
                helperText={fieldErrors.description || `${values.description.length}/5000`}
              />
            </Stack>
          </AdminFormSection>
        );
      case 2:
        return (
          <AdminFormSection title="Localisation">
            <TextField
              fullWidth
              margin="normal"
              label="Ville / commune / adresse"
              placeholder="Ex. Cocody, Abidjan"
              value={values.localisation}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, localisation: e.target.value }));
              }}
              error={Boolean(fieldErrors.localisation)}
              helperText={fieldErrors.localisation}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Zones d'intervention"
              placeholder="Quartiers séparés par des virgules"
              value={values.zoneInterventionText}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, zoneInterventionText: e.target.value }));
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                label="Rayon (km)"
                type="number"
                value={values.rayonIntervention}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, rayonIntervention: Number(e.target.value) || 10 }));
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block', mt: 2, mb: 1 }}>
              Coordonnées GPS (optionnelles)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                fullWidth
                label="Latitude"
                value={values.latitude}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, latitude: e.target.value }));
                }}
                error={Boolean(fieldErrors.latitude)}
                helperText={fieldErrors.latitude}
              />
              <TextField
                fullWidth
                label="Longitude"
                value={values.longitude}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, longitude: e.target.value }));
                }}
                error={Boolean(fieldErrors.longitude)}
                helperText={fieldErrors.longitude}
              />
            </Stack>
          </AdminFormSection>
        );
      case 3:
        return (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              Les pièces d'identité sont stockées de façon sécurisée (Cloudinary authentifié). Elles ne sont jamais
              affichées dans le tableau principal. En modification, laissez vides les champs pour conserver les documents existants.
            </Alert>
            <AdminFileUpload
              label="CNI recto"
              file={files.cni1}
              existingLabel={existingKyc.cni1 && !files.cni1 ? 'Document enregistré' : undefined}
              error={fieldErrors.cni1}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, cni1: f }));
              }}
            />
            <AdminFileUpload
              label="CNI verso"
              file={files.cni2}
              existingLabel={existingKyc.cni2 && !files.cni2 ? 'Document enregistré' : undefined}
              error={fieldErrors.cni2}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, cni2: f }));
              }}
            />
            <AdminFileUpload
              label="Selfie"
              file={files.selfie}
              existingLabel={existingKyc.selfie && !files.selfie ? 'Document enregistré' : undefined}
              error={fieldErrors.selfie}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, selfie: f }));
              }}
            />
            <AdminFileUpload
              label="Attestation d'assurance (optionnel)"
              file={files.attestationAssurance}
              existingLabel={
                existingKyc.attestationAssurance && !files.attestationAssurance ? 'Document enregistré' : undefined
              }
              error={fieldErrors.attestationAssurance}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, attestationAssurance: f }));
              }}
            />
            <AdminFormSection title="Statut de vérification">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={values.verifier}
                    onChange={(e) => {
                      markDirty();
                      setValues((p) => ({ ...p, verifier: e.target.checked }));
                    }}
                  />
                }
                label="Marquer comme vérifié (badge catalogue)"
              />
              <TextField
                select
                fullWidth
                margin="normal"
                label="Statut du profil"
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
            </AdminFormSection>
          </Stack>
        );
      case 4:
      default:
        return (
          <AdminFormSection title="Récapitulatif">
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Utilisateur :</strong> {values.utilisateurLabel || selectedUser ? `${selectedUser?.prenom} ${selectedUser?.nom}` : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Service :</strong>{' '}
                {services.find((s) => s._id === values.serviceId)?.nomservice || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Localisation :</strong> {values.localisation || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Tarif :</strong> {formatPrice(values.prixprestataire)}
              </Typography>
              <Typography variant="body2">
                <strong>Documents :</strong>{' '}
                {[
                  existingKyc.cni1 || files.cni1 ? 'CNI recto' : null,
                  existingKyc.cni2 || files.cni2 ? 'CNI verso' : null,
                  existingKyc.selfie || files.selfie ? 'Selfie' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Aucun'}
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
          {isUpdate ? 'Modifier le prestataire' : 'Créer un prestataire'}
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
            {PRESTATAIRE_FORM_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Étape {activeStep + 1} / {PRESTATAIRE_FORM_STEPS.length} — {PRESTATAIRE_FORM_STEPS[activeStep]}
            </Typography>
          </Box>
          {renderStep()}
          <AdminFormActions
            showBack={activeStep > 0}
            showNext={activeStep < PRESTATAIRE_FORM_STEPS.length - 1}
            showSubmit={activeStep === PRESTATAIRE_FORM_STEPS.length - 1}
            onBack={handleBack}
            onNext={handleNext}
            onSubmit={handleSubmit}
            loading={submitting}
            disableSubmit={submitting || missing.length > 0}
            submitLabel={isUpdate ? 'Enregistrer les modifications' : 'Créer le prestataire'}
          />
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog
        open={unsavedOpen}
        onStay={() => setUnsavedOpen(false)}
        onDiscard={() => {
          setUnsavedOpen(false);
          setDirty(false);
          onClose();
        }}
      />
    </>
  );
};
