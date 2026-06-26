import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

interface PopulatedFreelance {
  _id: string;
  name?: string;
  utilisateur?: { nom?: string; prenom?: string };
}

interface PopulatedService {
  _id: string;
  nomservice?: string;
  categorie?: { _id?: string; nomcategorie?: string };
}

export interface IFreelanceServiceRow {
  _id: string;
  titleOverride?: string;
  descriptionCourte?: string;
  coverImage: string;
  startingPrice: number;
  deliveryTime: string;
  isActive: boolean;
  isFeatured: boolean;
  ratingAvg?: number;
  reviewsCount?: number;
  orderCount?: number;
  freelance?: PopulatedFreelance | null;
  service?: PopulatedService | null;
}

interface IFreelanceListItem {
  _id: string;
  name: string;
}

interface ICategorieRow {
  _id: string;
  nomcategorie: string;
  groupe?: { _id?: string; nomgroupe?: string };
}

interface IServiceRow {
  _id: string;
  nomservice: string;
  categorie?: { _id?: string; nomgroupe?: string; groupe?: { nomgroupe?: string } };
}

const emptyForm = {
  freelanceId: '',
  categorieId: '',
  serviceId: '',
  titleOverride: '',
  descriptionCourte: '',
  startingPrice: '' as string | number,
  deliveryTime: '',
  coverImageUrl: '',
  isActive: true,
  isFeatured: false,
};

const FreelanceServicesPage: React.FC = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
  const [rows, setRows] = useState<IFreelanceServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<IFreelanceServiceRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [freelanceOptions, setFreelanceOptions] = useState<IFreelanceListItem[]>([]);
  const [categories, setCategories] = useState<ICategorieRow[]>([]);
  const [services, setServices] = useState<IServiceRow[]>([]);

  const freelanceCategories = useMemo(
    () =>
      categories.filter((c) => {
        const g = c.groupe?.nomgroupe;
        return g && norm(g) === 'freelance';
      }),
    [categories]
  );

  const servicesInCategory = useMemo(() => {
    if (!form.categorieId) return [];
    return services.filter((s) => {
      const cid =
        typeof s.categorie === 'object' && s.categorie && '_id' in s.categorie
          ? (s.categorie as { _id?: string })._id
          : undefined;
      return cid === form.categorieId;
    });
  }, [services, form.categorieId]);

  const loadRefs = useCallback(async () => {
    const [catRes, svcRes, frRes] = await Promise.all([
      axios.get<ICategorieRow[]>(`${apiUrl}/categorie`),
      axios.get<IServiceRow[]>(`${apiUrl}/service`),
      axios.get<{ freelances: IFreelanceListItem[] }>(`${apiUrl}/freelance`, {
        params: { limit: 200, page: 1 },
      }),
    ]);
    setCategories(catRes.data);
    setServices(
      (svcRes.data || []).filter((s: any) => {
        const g = s.categorie?.groupe?.nomgroupe;
        return g && norm(String(g)) === 'freelance';
      })
    );
    const fl = frRes.data?.freelances || (Array.isArray(frRes.data) ? frRes.data : []);
    setFreelanceOptions(
      (fl as any[]).map((f) => ({
        _id: f._id,
        name: f.name || `${f.utilisateur?.prenom || ''} ${f.utilisateur?.nom || ''}`.trim() || 'Sans nom',
      }))
    );
  }, [apiUrl]);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<{ offers: IFreelanceServiceRow[] }>(`${apiUrl}/freelance-services`);
      setRows(data.offers || []);
    } catch (e) {
      console.error(e);
      toast.error('Impossible de charger les offres freelance');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    loadRefs().catch(() => toast.error('Erreur chargement référentiels'));
  }, [loadRefs]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const displayTitle = (r: IFreelanceServiceRow) =>
    (r.titleOverride && r.titleOverride.trim()) || r.service?.nomservice || '—';

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setCoverFile(null);
    setModalOpen(true);
  };

  const openEdit = (r: IFreelanceServiceRow) => {
    setEditing(r);
    const catId = r.service?.categorie?._id || '';
    setForm({
      freelanceId: r.freelance?._id || '',
      categorieId: catId,
      serviceId: r.service?._id || '',
      titleOverride: r.titleOverride || '',
      descriptionCourte: r.descriptionCourte || '',
      startingPrice: r.startingPrice,
      deliveryTime: r.deliveryTime || '',
      coverImageUrl: '',
      isActive: r.isActive !== false,
      isFeatured: !!r.isFeatured,
    });
    setCoverFile(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.freelanceId || !form.serviceId) {
      toast.error('Freelance et service catalogue sont obligatoires');
      return;
    }
    const price = Number(form.startingPrice);
    if (!price || price <= 0) {
      toast.error('Prix à partir de : nombre > 0 requis');
      return;
    }
    if (!form.deliveryTime.trim()) {
      toast.error('Délai de livraison requis');
      return;
    }
    const urlOk = form.coverImageUrl.trim().length > 0;
    if (!editing && !coverFile && !urlOk) {
      toast.error('Image requise : fichier OU URL Cloudinary / https');
      return;
    }

    const fd = new FormData();
    fd.append('freelanceId', form.freelanceId);
    fd.append('serviceId', form.serviceId);
    fd.append('titleOverride', form.titleOverride);
    fd.append('descriptionCourte', form.descriptionCourte);
    fd.append('startingPrice', String(price));
    fd.append('deliveryTime', form.deliveryTime.trim());
    fd.append('isActive', form.isActive ? 'true' : 'false');
    fd.append('isFeatured', form.isFeatured ? 'true' : 'false');
    if (coverFile) fd.append('coverImage', coverFile);
    else if (urlOk) fd.append('coverImage', form.coverImageUrl.trim());

    try {
      if (editing?._id) {
        await axios.put(`${apiUrl}/freelance-services/${editing._id}`, fd);
        toast.success('Offre mise à jour');
      } else {
        await axios.post(`${apiUrl}/freelance-services`, fd);
        toast.success('Offre créée');
      }
      setModalOpen(false);
      await loadOffers();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Erreur enregistrement';
      toast.error(msg);
    }
  };

  const handleDelete = async (r: IFreelanceServiceRow) => {
    if (!window.confirm(`Supprimer l’offre « ${displayTitle(r)} » ?`)) return;
    try {
      await axios.delete(`${apiUrl}/freelance-services/${r._id}`);
      toast.success('Offre supprimée');
      loadOffers();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Suppression impossible');
    }
  };

  const coverBody = (r: IFreelanceServiceRow) =>
    r.coverImage ? (
      <img src={r.coverImage} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
    ) : (
      '—'
    );

  const actionsBody = (r: IFreelanceServiceRow) => (
    <>
      <IconButton size="small" color="primary" onClick={() => openEdit(r)} aria-label="edit">
        <EditIcon />
      </IconButton>
      <IconButton size="small" color="error" onClick={() => handleDelete(r)} aria-label="delete">
        <DeleteIcon />
      </IconButton>
    </>
  );

  const idxBody = (_r: IFreelanceServiceRow, o: ColumnBodyOptions) => o.rowIndex + 1;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Offres freelance (services publiés)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Chaque offre est liée à un service du catalogue groupe Freelance. Les cartes d’accueil mobile utilisent{' '}
        <code>/freelance-services/home</code>.
      </Typography>

      <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mb: 2 }}>
        Nouvelle offre
      </Button>

      <DataTable value={rows} loading={loading} dataKey="_id" paginator rows={15} emptyMessage="Aucune offre">
        <Column header="N°" body={idxBody} style={{ width: 56 }} />
        <Column header="Visuel" body={coverBody} />
        <Column header="Titre affiché" body={(r) => displayTitle(r)} sortable />
        <Column
          header="Freelance"
          body={(r) => r.freelance?.name || `${r.freelance?.utilisateur?.prenom || ''} ${r.freelance?.utilisateur?.nom || ''}`.trim() || '—'}
        />
        <Column header="Service catalogue" body={(r) => r.service?.nomservice || '—'} />
        <Column header="Prix" body={(r) => `${r.startingPrice} FCFA`} />
        <Column field="deliveryTime" header="Délai" />
        <Column header="Actif" body={(r) => (r.isActive ? 'Oui' : 'Non')} />
        <Column header="À la une" body={(r) => (r.isFeatured ? 'Oui' : 'Non')} />
        <Column header="Actions" body={actionsBody} />
      </DataTable>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editing ? 'Modifier l’offre' : 'Nouvelle offre'}
          <IconButton
            aria-label="close"
            onClick={() => setModalOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="dense"
            select
            label="Freelance"
            fullWidth
            required
            value={form.freelanceId}
            onChange={(e) => setForm({ ...form, freelanceId: e.target.value })}
            sx={{ mb: 2 }}
          >
            {freelanceOptions.map((f) => (
              <MenuItem key={f._id} value={f._id}>
                {f.name} ({f._id.slice(-6)})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="dense"
            select
            label="Catégorie (Freelance)"
            fullWidth
            value={form.categorieId}
            onChange={(e) => setForm({ ...form, categorieId: e.target.value, serviceId: '' })}
            sx={{ mb: 2 }}
            helperText="Filtre la liste des services catalogue"
          >
            <MenuItem value="">—</MenuItem>
            {freelanceCategories.map((c) => (
              <MenuItem key={c._id} value={c._id}>
                {c.nomcategorie}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="dense"
            select
            label="Service catalogue"
            fullWidth
            required
            disabled={!form.categorieId}
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            sx={{ mb: 2 }}
          >
            {servicesInCategory.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.nomservice}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            margin="dense"
            label="Titre personnalisé (optionnel)"
            fullWidth
            value={form.titleOverride}
            onChange={(e) => setForm({ ...form, titleOverride: e.target.value })}
            sx={{ mb: 1 }}
            helperText="Sinon le nom du service catalogue est utilisé"
          />
          <TextField
            margin="dense"
            label="Description courte"
            fullWidth
            multiline
            minRows={2}
            value={form.descriptionCourte}
            onChange={(e) => setForm({ ...form, descriptionCourte: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            margin="dense"
            label="Prix à partir de (FCFA)"
            type="number"
            fullWidth
            required
            value={form.startingPrice}
            onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
            sx={{ mb: 1 }}
          />
          <TextField
            margin="dense"
            label="Délai (ex: 24h, 3 jours)"
            fullWidth
            required
            value={form.deliveryTime}
            onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
            sx={{ mb: 2 }}
          />

          <Button variant="outlined" component="label" startIcon={<PhotoCameraIcon />} sx={{ mb: 1 }}>
            {editing ? 'Remplacer l’image' : 'Image couverture'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
          </Button>
          <TextField
            margin="dense"
            label="URL image (si pas de fichier)"
            fullWidth
            value={form.coverImageUrl}
            onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
            sx={{ mb: 1 }}
            helperText="À la création : fichier ou URL. À l’édition : optionnel si vous gardez l’image actuelle."
          />
          {coverFile && (
            <Typography variant="caption" display="block">
              {coverFile.name}
            </Typography>
          )}
          {editing?.coverImage && !coverFile && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Image actuelle :
              </Typography>
              <img src={editing.coverImage} alt="" style={{ maxWidth: 120, borderRadius: 8, display: 'block' }} />
            </Box>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={form.isActive}
                onChange={(_, v) => setForm({ ...form, isActive: v })}
              />
            }
            label="Offre active"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.isFeatured}
                onChange={(_, v) => setForm({ ...form, isFeatured: v })}
              />
            }
            label="Mettre en avant (home)"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} />
    </Box>
  );
};

export default FreelanceServicesPage;
