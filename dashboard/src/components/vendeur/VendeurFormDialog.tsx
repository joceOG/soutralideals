import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Button,
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
  VENDEUR_FORM_STEPS,
  VENDEUR_BUSINESS_CATEGORIES,
  emptyVendeurFormValues,
  normalizeVendeurForEdit,
  buildVendeurFormData,
  validateVendeurStep,
  collectVendeurMissing,
  mapVendeurApiError,
  VendeurFormValues,
  VendeurFormFiles,
  VendeurExistingMedia,
  VendeurUtilisateurRef,
} from '../../services/vendeurService';

export interface VendeurFormDialogProps {
  open: boolean;
  vendeurId?: string | null;
  onClose: () => void;
  onSuccess: (saved: Record<string, unknown>) => void;
}

const EMPTY_FILES: VendeurFormFiles = {
  shopLogo: null,
  cni1: null,
  cni2: null,
  selfie: null,
  businessLicense: null,
  taxDocument: null,
};

const BUSINESS_TYPES = ['Particulier', 'Entreprise', 'Auto-entrepreneur'];
const SHIPPING = ['Standard', 'Express', 'Same-Day', 'Pickup'];
const PAYMENTS = ['Mobile Money', 'Carte Bancaire', 'Virement', 'Espèces'];
const CONTACT = ['Email', 'Phone', 'WhatsApp'];
const STATUS_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Actif' },
  { value: 'rejected', label: 'Rejeté' },
  { value: 'suspended', label: 'Suspendu' },
];
const ACCOUNT_STATUS = ['Pending', 'Active', 'Suspended', 'Banned'];

export const VendeurFormDialog: React.FC<VendeurFormDialogProps> = ({
  open,
  vendeurId,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const compactStepper = useMediaQuery(theme.breakpoints.down('sm'));
  const isUpdate = Boolean(vendeurId);

  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<VendeurFormValues>(emptyVendeurFormValues());
  const [files, setFiles] = useState<VendeurFormFiles>(EMPTY_FILES);
  const [existingMedia, setExistingMedia] = useState<VendeurExistingMedia>({
    shopLogo: false,
    cni1: false,
    cni2: false,
    selfie: false,
    businessLicense: false,
    taxDocument: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  const [utilisateurs, setUtilisateurs] = useState<VendeurUtilisateurRef[]>([]);

  const selectedUser = useMemo(
    () => utilisateurs.find((u) => u._id === values.utilisateurId) ?? null,
    [utilisateurs, values.utilisateurId],
  );

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setValues(emptyVendeurFormValues());
    setFiles(EMPTY_FILES);
    setExistingMedia({
      shopLogo: false,
      cni1: false,
      cni2: false,
      selfie: false,
      businessLicense: false,
      taxDocument: false,
    });
    setFieldErrors({});
    setFormError(null);
    setDirty(false);
  }, []);

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    try {
      const uRes = await apiClient.get<VendeurUtilisateurRef[]>('/utilisateur');
      setUtilisateurs(Array.isArray(uRes.data) ? uRes.data : []);
    } catch {
      setFormError('Impossible de charger la liste des utilisateurs.');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadDetail = useCallback(
    async (id: string) => {
      setLoadingDetail(true);
      try {
        const res = await apiClient.get(`/vendeur/${id}`);
        const { values: v, existingMedia: media } = normalizeVendeurForEdit(
          res.data as Record<string, unknown>,
        );
        setValues(v);
        setExistingMedia(media);
        const u = (res.data as { utilisateur?: VendeurUtilisateurRef }).utilisateur;
        if (u?._id && !utilisateurs.some((x) => x._id === u._id)) {
          setUtilisateurs((prev) => [...prev, u]);
        }
      } catch {
        setFormError('Impossible de charger le vendeur.');
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
    if (vendeurId) loadDetail(vendeurId);
  }, [open, vendeurId, resetForm, loadOptions, loadDetail]);

  const markDirty = () => setDirty(true);

  const tryClose = () => {
    if (dirty && !submitting) {
      setUnsavedOpen(true);
      return;
    }
    onClose();
  };

  const handleNext = () => {
    const err = validateVendeurStep(activeStep, values, files);
    setFieldErrors(err);
    if (Object.keys(err).length) return;
    setActiveStep((s) => Math.min(s + 1, VENDEUR_FORM_STEPS.length - 1));
  };

  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    for (let i = 0; i <= 3; i++) {
      const err = validateVendeurStep(i, values, files);
      if (Object.keys(err).length) {
        setFieldErrors(err);
        setActiveStep(i);
        return;
      }
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const form = buildVendeurFormData(values, files);
      const url = isUpdate ? `/vendeur/${vendeurId}` : '/vendeur';
      const method = isUpdate ? 'put' : 'post';
      const res = await apiClient({ method, url, data: form });
      setDirty(false);
      const data = res.data as Record<string, unknown>;
      onSuccess(data);
      onClose();
    } catch (e) {
      setFormError(mapVendeurApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const missing = collectVendeurMissing(values);

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              Le profil <strong>Vendeur</strong> est le compte commercial lié à un utilisateur. La vitrine
              E‑marché (nom, logo, catégories) est enregistrée sur ce même profil — il n’y a pas de modèle
              Boutique séparé. Les produits se gèrent dans <strong>Articles</strong>, les ventes dans{' '}
              <strong>Commandes</strong>.
            </Alert>
            <AdminFormSection title="Propriétaire du compte vendeur">
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
                  setValues((p) => ({ ...p, utilisateurId: u?._id ?? '' }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Utilisateur"
                    error={Boolean(fieldErrors.utilisateurId)}
                    helperText={
                      fieldErrors.utilisateurId ||
                      (isUpdate ? 'Non modifiable.' : 'Un seul profil vendeur par utilisateur.')
                    }
                  />
                )}
              />
            </AdminFormSection>
          </Stack>
        );
      case 1:
        return (
          <AdminFormSection title="Vitrine E‑marché" subtitle="Informations affichées sur la boutique publique.">
            <TextField
              fullWidth
              margin="normal"
              label="Nom de la boutique"
              value={values.shopName}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, shopName: e.target.value }));
              }}
              error={Boolean(fieldErrors.shopName)}
              helperText={fieldErrors.shopName}
            />
            <TextField
              select
              fullWidth
              margin="normal"
              label="Type de commerce"
              value={values.businessType}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, businessType: e.target.value }));
              }}
            >
              {BUSINESS_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <Autocomplete
              multiple
              options={[...VENDEUR_BUSINESS_CATEGORIES]}
              value={values.businessCategories}
              onChange={(_, v) => {
                markDirty();
                setValues((p) => ({ ...p, businessCategories: v }));
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip {...getTagProps({ index })} key={option} label={option} size="small" />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Catégories commerciales"
                  margin="normal"
                  error={Boolean(fieldErrors.businessCategories)}
                  helperText={fieldErrors.businessCategories}
                />
              )}
            />
            <TextField
              fullWidth
              margin="normal"
              multiline
              minRows={3}
              label="Description de la boutique"
              value={values.shopDescription}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, shopDescription: e.target.value }));
              }}
              error={Boolean(fieldErrors.shopDescription)}
              helperText={fieldErrors.shopDescription}
            />
            <AdminFileUpload
              label="Logo boutique (public)"
              file={files.shopLogo}
              existingLabel={existingMedia.shopLogo && !files.shopLogo ? 'Logo enregistré' : undefined}
              error={fieldErrors.shopLogo}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, shopLogo: f }));
              }}
            />
          </AdminFormSection>
        );
      case 2:
        return (
          <AdminFormSection title="Localisation et activité">
            <Stack spacing={2}>
              <TextField
                label="Rue / quartier"
                fullWidth
                value={values.addressStreet}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, addressStreet: e.target.value }));
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Ville / commune"
                  fullWidth
                  value={values.addressCity}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, addressCity: e.target.value }));
                  }}
                  error={Boolean(fieldErrors.addressCity)}
                  helperText={fieldErrors.addressCity}
                />
                <TextField
                  label="Pays"
                  fullWidth
                  value={values.addressCountry}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, addressCountry: e.target.value }));
                  }}
                />
              </Stack>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={values.deliveryZones}
                onChange={(_, v) => {
                  markDirty();
                  setValues((p) => ({ ...p, deliveryZones: v }));
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Zones de livraison" placeholder="Ajouter une zone" />
                )}
              />
              <Autocomplete
                multiple
                options={SHIPPING}
                value={values.shippingMethods}
                onChange={(_, v) => {
                  markDirty();
                  setValues((p) => ({ ...p, shippingMethods: v }));
                }}
                renderInput={(params) => <TextField {...params} label="Modes de livraison" />}
              />
              <Autocomplete
                multiple
                options={PAYMENTS}
                value={values.paymentMethods}
                onChange={(_, v) => {
                  markDirty();
                  setValues((p) => ({ ...p, paymentMethods: v }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Moyens de paiement acceptés"
                    helperText="Types de paiement proposés aux clients — aucune donnée bancaire sensible."
                  />
                )}
              />
              <TextField
                type="number"
                inputProps={{ min: 0 }}
                label="Montant minimum de commande (FCFA)"
                fullWidth
                value={values.minimumOrderAmount || ''}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, minimumOrderAmount: Number(e.target.value) || 0 }));
                }}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Téléphone professionnel"
                  fullWidth
                  value={values.businessPhone}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, businessPhone: e.target.value }));
                  }}
                />
                <TextField
                  label="Email professionnel"
                  fullWidth
                  value={values.businessEmail}
                  onChange={(e) => {
                    markDirty();
                    setValues((p) => ({ ...p, businessEmail: e.target.value }));
                  }}
                />
              </Stack>
              <TextField
                select
                label="Contact préféré"
                fullWidth
                value={values.preferredContactMethod}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, preferredContactMethod: e.target.value }));
                }}
              >
                {CONTACT.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="WhatsApp (optionnel)"
                fullWidth
                value={values.socialWhatsapp}
                onChange={(e) => {
                  markDirty();
                  setValues((p) => ({ ...p, socialWhatsapp: e.target.value }));
                }}
              />
            </Stack>
          </AdminFormSection>
        );
      case 3:
        return (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: '12px' }}>
              Documents KYC et commerciaux sensibles : stockage authentifié, jamais affichés dans le tableau.
              Le numéro RCCM est une référence texte ; les scans de licence restent privés.
            </Alert>
            <TextField
              fullWidth
              label="Numéro RCCM / enregistrement (référence)"
              value={values.businessRegistrationNumber}
              onChange={(e) => {
                markDirty();
                setValues((p) => ({ ...p, businessRegistrationNumber: e.target.value }));
              }}
            />
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
              label="Selfie"
              file={files.selfie}
              existingLabel={existingMedia.selfie && !files.selfie ? 'Document enregistré' : undefined}
              error={fieldErrors.selfie}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, selfie: f }));
              }}
            />
            <AdminFileUpload
              label="Licence commerciale (scan)"
              file={files.businessLicense}
              existingLabel={
                existingMedia.businessLicense && !files.businessLicense ? 'Document enregistré' : undefined
              }
              error={fieldErrors.businessLicense}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, businessLicense: f }));
              }}
            />
            <AdminFileUpload
              label="Document fiscal (scan)"
              file={files.taxDocument}
              existingLabel={existingMedia.taxDocument && !files.taxDocument ? 'Document enregistré' : undefined}
              error={fieldErrors.taxDocument}
              onFileChange={(f) => {
                markDirty();
                setFiles((p) => ({ ...p, taxDocument: f }));
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
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                  {ACCOUNT_STATUS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
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
                <strong>Propriétaire :</strong>{' '}
                {selectedUser ? `${selectedUser.prenom} ${selectedUser.nom}` : '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Boutique :</strong> {values.shopName || '—'} ({values.businessType})
              </Typography>
              <Typography variant="body2">
                <strong>Catégories :</strong> {values.businessCategories.join(', ') || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Ville :</strong> {values.addressCity || '—'}
              </Typography>
              <Typography variant="body2">
                <strong>Médias :</strong>{' '}
                {[
                  existingMedia.shopLogo || files.shopLogo ? 'Logo' : null,
                  existingMedia.cni1 || files.cni1 ? 'CNI recto' : null,
                  existingMedia.businessLicense || files.businessLicense ? 'Licence' : null,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Aucun'}
              </Typography>
            </Stack>
            {missing.length > 0 ? (
              <Alert severity="warning" sx={{ mt: 2, borderRadius: '12px' }}>
                À compléter : {missing.join(' · ')}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
                Prêt à enregistrer. Les articles seront ajoutés ensuite depuis le module Articles.
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
          {isUpdate ? 'Modifier le vendeur' : 'Créer un vendeur / boutique'}
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
            sx={{ mb: 3 }}
          >
            {VENDEUR_FORM_STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          {renderStep()}
        </DialogContent>
        <AdminFormActions
          activeStep={activeStep}
          stepCount={VENDEUR_FORM_STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel={isUpdate ? 'Enregistrer les modifications' : 'Créer le vendeur'}
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

export function VendeurPostCreateHint({ vendeurId }: { vendeurId: string | null }) {
  if (!vendeurId) return null;
  return (
    <Alert severity="success" sx={{ mt: 2, borderRadius: '12px' }}>
      Vendeur enregistré.{' '}
      <Button component={RouterLink} to={`/article?vendeur=${vendeurId}`} size="small" variant="outlined" sx={{ ml: 1 }}>
        Gérer les articles
      </Button>
    </Alert>
  );
}
