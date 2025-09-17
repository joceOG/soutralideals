import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, Autocomplete, Chip, InputAdornment,
  IconButton, MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



export interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface IService {
  _id: string;
  nomservice: string;
  categorie?: {
    _id: string;
    nomcategorie: string;
    groupe?: {
      _id: string;
      nomgroupe: string;
    };
  };
}

export interface ILocalisation {
  latitude: number;
  longitude: number;
}

export interface IDiplomeCertificat {
  nomDiplome?: string;
  institution?: string;
  anneeObtention?: string;
}

export interface IPrestataireData {
  _id?: string;
  utilisateur: IUtilisateur;
  service: IService;
  prixprestataire: number;
  localisation: string;
  localisationmaps: ILocalisation;
  note?: string;
  verifier: boolean;

  // Identité / fichiers
  cni1?: string;
  cni2?: string;
  selfie?: string;
  numeroCNI?: string;

  // Métier
  specialite?: string[];
  anneeExperience?: string;
  description?: string;
  rayonIntervention?: number; // km
  zoneIntervention?: string[];
  tarifHoraireMin?: number;
  tarifHoraireMax?: number;

  // Diplômes / Certificats
  diplomeCertificat?: IDiplomeCertificat[];
  attestationAssurance?: string;
  numeroAssurance?: string;
  numeroRCCM?: string;

  // Stats
  nbMission?: number;
  revenus?: number;
  clients?: IUtilisateur[];
  createdAt?: string;
  updatedAt?: string;
}

const PrestataireComponent: React.FC = () => {
  const [prestataires, setPrestataires] = useState<IPrestataireData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrestataire, setSelectedPrestataire] = useState<IPrestataireData | null>(null);
const [formData, setFormData] = useState<IPrestataireData>({
  utilisateur: {} as IUtilisateur,
  service: {} as IService,
  prixprestataire: 0,
  localisation: '',
  localisationmaps: { latitude: 0, longitude: 0 },
  note: '',
  verifier: false,

  // Identité / fichiers
  cni1: '',
  cni2: '',
  selfie: '',
  numeroCNI: '',

  // Métier
  specialite: [],
  anneeExperience: '',
  description: '',
  rayonIntervention: 0,
  zoneIntervention: [],
  tarifHoraireMin: 0,
  tarifHoraireMax: 0,

  // Diplômes / Certificats
  diplomeCertificat: [],
  attestationAssurance: '',
  numeroAssurance: '',
  numeroRCCM: '',

  // Stats
  nbMission: 0,
  revenus: 0,
  clients: [],

  // Dates
  createdAt: '',
  updatedAt: '',
});
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [cni2File, setCni2File] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [utilisateurs, setUtilisateurs] = useState<IUtilisateur[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [loadingUtilisateurs, setLoadingUtilisateurs] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const [services, setServices] = useState<IService[]>([]);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const fetchPrestataires = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/prestataire`);
      setPrestataires(response.data);
    } catch {
      toast.error("Erreur lors du chargement des prestataires");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchPrestataires();

    const fetchServices = async () => {
      try {
        const res = await axios.get(`${apiUrl}/service`);
        const filtered = res.data.filter((s: IService) => s.categorie?.groupe?.nomgroupe === 'Métiers');
        setServices(filtered);
      } catch {
        toast.error("Erreur lors du chargement des services");
      }
    };

    fetchServices();
  }, [apiUrl, fetchPrestataires]);

  const loadUtilisateurs = async () => {
    try {
      setLoadingUtilisateurs(true);
      const res = await axios.get(`${apiUrl}/utilisateur`);
      setUtilisateurs(res.data);
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoadingUtilisateurs(false);
    }
  };

  const handleOpenUserDialog = () => {
    loadUtilisateurs();
    setUserSearch('');
    setShowUserDialog(true);
  };

  const filteredUtilisateurs = utilisateurs.filter(u => {
    const search = userSearch.toLowerCase();
    return (
      u.nom.toLowerCase().includes(search) ||
      u.prenom.toLowerCase().includes(search) ||
      (u.email?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni' | 'cni2' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'cni') setCniFile(file);
      else if (type === 'cni2') setCni2File(file);
      else setSelfieFile(file);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async () => {
    try {
      const isUpdate = Boolean(selectedPrestataire?._id);
      const url = isUpdate
        ? `${apiUrl}/prestataire/${selectedPrestataire?._id}`
        : `${apiUrl}/prestataire`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      // Informations principales
      form.append('utilisateur', formData.utilisateur._id);
      form.append('service', formData.service._id);
      form.append('prixprestataire', formData.prixprestataire.toString());
      form.append('localisation', formData.localisation);
      form.append('note', formData.note || '');
      form.append('verifier', formData.verifier ? 'true' : 'false');
      form.append('localisationmaps', JSON.stringify(formData.localisationmaps));

      // Identité / fichiers
      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);
      if (formData.numeroCNI) form.append('numeroCNI', formData.numeroCNI);

      // Métier
      if (formData.specialite?.length) form.append('specialite', JSON.stringify(formData.specialite));
      if (formData.anneeExperience) form.append('anneeExperience', formData.anneeExperience);
      if (formData.description) form.append('description', formData.description);
      if (formData.rayonIntervention) form.append('rayonIntervention', formData.rayonIntervention.toString());
      if (formData.zoneIntervention?.length) form.append('zoneIntervention', JSON.stringify(formData.zoneIntervention));
      if (formData.tarifHoraireMin) form.append('tarifHoraireMin', formData.tarifHoraireMin.toString());
      if (formData.tarifHoraireMax) form.append('tarifHoraireMax', formData.tarifHoraireMax.toString());

      // Diplômes / Certificats
      if (formData.diplomeCertificat?.length) form.append('diplomeCertificat', JSON.stringify(formData.diplomeCertificat));

      // Assurance / RCCM
      if (formData.attestationAssurance) form.append('attestationAssurance', formData.attestationAssurance);
      if (formData.numeroAssurance) form.append('numeroAssurance', formData.numeroAssurance);
      if (formData.numeroRCCM) form.append('numeroRCCM', formData.numeroRCCM);

      // Stats / clients
      if (formData.nbMission) form.append('nbMission', formData.nbMission.toString());
      if (formData.revenus) form.append('revenus', formData.revenus.toString());
      if (formData.clients?.length) form.append('clients', JSON.stringify(formData.clients));

      await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchPrestataires();
      toast.success(isUpdate ? 'Prestataire mis à jour !' : 'Prestataire ajouté !');
      setModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la sauvegarde du prestataire');
    }
  };

  const onDelete = async (rowData: IPrestataireData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) {
      try {
        await axios.delete(`${apiUrl}/prestataire/${rowData._id}`);
        setPrestataires(prestataires.filter(item => item._id !== rowData._id));
        toast.success('Prestataire supprimé avec succès !');
      } catch {
        toast.error('Erreur lors de la suppression du prestataire.');
      }
    }
  };

  const onEdit = (rowData: IPrestataireData) => {
    setSelectedPrestataire(rowData);
    setFormData(rowData);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedPrestataire(null);
    setFormData({
      utilisateur: {} as IUtilisateur,
      service: {} as IService,
      prixprestataire: 0,
      localisation: '',
      localisationmaps: { latitude: 0, longitude: 0 },
      note: '',
      verifier: false,
    });
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const handleImageClick = (url: string) => {
    setZoomImage(url);
  };

  const imageTemplate = (field: 'cni1' | 'cni2' | 'selfie') => (rowData: IPrestataireData) => {
    const imageUrl = rowData[field];
    return imageUrl ? (
      <img
        src={imageUrl}
        alt={field}
        width={60}
        height={60}
        style={{ objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
        onClick={() => handleImageClick(imageUrl)}
      />
    ) : <span style={{ color: '#888' }}>Aucune</span>;
  };

  const rowIndexTemplate = (rowData: IPrestataireData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IPrestataireData) =>
    `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

  const actionTemplate = (rowData: IPrestataireData) => (
    <>
      <IconButton color="error" onClick={() => onDelete(rowData)}><DeleteIcon /></IconButton>
      <IconButton color="primary" onClick={() => onEdit(rowData)}><EditIcon /></IconButton>
    </>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Prestataires</Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable
          value={prestataires}
          paginator
          showGridlines
          rows={10}
          loading={loading}
          dataKey="_id"
          filters={filters}
          globalFilterFields={['localisation', 'note', 'prixprestataire', 'description']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h5>Gestion des Prestataires</h5>
            <Button variant="contained" onClick={onAdd}>Ajouter</Button>
          </div>}
          emptyMessage="Aucun prestataire trouvé"
          onFilter={(e) => setFilters(e.filters)}
        >
          <Column header="#" body={rowIndexTemplate} />
          <Column header="Utilisateur" body={utilisateurNameTemplate} sortable />
          <Column header="Service" body={(rowData) => rowData.service?.nomservice} sortable />
          <Column field="prixprestataire" header="Prix" sortable />
          <Column field="localisation" header="Localisation" sortable />
          <Column field="note" header="Note" sortable />
          <Column header="CNI 1" body={imageTemplate('cni1')} />
          <Column header="CNI 2" body={imageTemplate('cni2')} />
          <Column header="Selfie" body={imageTemplate('selfie')} />
          <Column header="Vérification" body={(rowData) => rowData.verifier ? '✅' : '❌'} />
          <Column header="Spécialités" body={(rowData) => rowData.specialite?.join(', ')} />
          <Column header="Année Exp." field="anneeExperience" sortable />
          <Column header="Description" field="description" />
          <Column header="Rayon Intervention (km)" field="rayonIntervention" sortable />
          <Column header="Zones Intervention" body={(rowData) => rowData.zoneIntervention?.join(', ')} />
          <Column header="Tarif Min" field="tarifHoraireMin" sortable />
          <Column header="Tarif Max" field="tarifHoraireMax" sortable />
          <Column header="Diplômes / Certificats" body={(rowData) =>
            rowData.diplomeCertificat?.map((d: { nomDiplome: any; anneeObtention: any; }) => `${d.nomDiplome} (${d.anneeObtention})`).join(', ')
          } />
          <Column header="Assurance" body={(rowData) => rowData.numeroAssurance || '-'} />
          <Column header="RCCM" body={(rowData) => rowData.numeroRCCM || '-'} />
          <Column header="Nb Missions" field="nbMission" sortable />
          <Column header="Revenus" field="revenus" sortable />
          <Column header="Clients" body={(rowData) => rowData.clients?.map((c: { nom: any; prenom: any; }) => `${c.nom} ${c.prenom}`).join(', ')} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      {/* Dialog pour ajouter / modifier */}
<Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
  <DialogTitle>{selectedPrestataire ? 'Modifier le Prestataire' : 'Ajouter un Nouveau Prestataire'}</DialogTitle>
  <DialogContent>
    {/* Utilisateur */}
    <TextField
      margin="normal"
      fullWidth
      label="Utilisateur"
      value={formData.utilisateur?._id || ''}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton onClick={handleOpenUserDialog}><SearchIcon /></IconButton>
          </InputAdornment>
        )
      }}
    />

    {/* Service */}
    <TextField
      margin="normal"
      select
      fullWidth
      label="Service"
      value={formData.service?._id || ''}
      onChange={(e) => {
        const selected = services.find(s => s._id === e.target.value);
        if (selected) setFormData(prev => ({ ...prev, service: selected }));
      }}
    >
      {services.map(service => (
        <MenuItem key={service._id} value={service._id}>{service.nomservice}</MenuItem>
      ))}
    </TextField>

    {/* Prix, Localisation, Note */}
    <TextField margin="normal" fullWidth label="Prix" name="prixprestataire" type="number" value={formData.prixprestataire} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Localisation" name="localisation" value={formData.localisation} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Note" name="note" value={formData.note} onChange={handleChange} />

    {/* Localisation Maps */}
    <TextField
      margin="normal"
      fullWidth
      label="Latitude"
      name="latitude"
      type="number"
      value={formData.localisationmaps.latitude}
      onChange={(e) =>
        setFormData(prev => ({
          ...prev,
          localisationmaps: { ...prev.localisationmaps, latitude: parseFloat(e.target.value) }
        }))
      }
    />
    <TextField
      margin="normal"
      fullWidth
      label="Longitude"
      name="longitude"
      type="number"
      value={formData.localisationmaps.longitude}
      onChange={(e) =>
        setFormData(prev => ({
          ...prev,
          localisationmaps: { ...prev.localisationmaps, longitude: parseFloat(e.target.value) }
        }))
      }
    />

    {/* Identité / fichiers */}
    <Box sx={{ mt: 1, mb: 1 }}>
      <Typography>CNI 1</Typography>
      <input type="file" onChange={(e) => handleFileChange(e, 'cni')} accept="image/*" />
    </Box>
    <Box sx={{ mt: 1, mb: 1 }}>
      <Typography>CNI 2</Typography>
      <input type="file" onChange={(e) => handleFileChange(e, 'cni2')} accept="image/*" />
    </Box>
    <Box sx={{ mt: 1, mb: 1 }}>
      <Typography>Selfie</Typography>
      <input type="file" onChange={(e) => handleFileChange(e, 'selfie')} accept="image/*" />
    </Box>
    <TextField margin="normal" fullWidth label="Numéro CNI" name="numeroCNI" value={formData.numeroCNI} onChange={handleChange} />

    {/* Métier */}

      <Autocomplete
        multiple
        freeSolo
        options={[]} // ici tu peux mettre une liste prédéfinie de spécialités si tu veux
        value={formData.specialite || []}
        onChange={(_, newValue) =>
          setFormData(prev => ({ ...prev, specialite: newValue }))
        }
        renderTags={(value: string[], getTagProps) =>
          value.map((option: string, index: number) => (
            <Chip
              label={option}
              {...getTagProps({ index })} // Ne pas mettre key ici, getTagProps gère déjà le key
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Spécialités"
            placeholder="Ajouter une spécialité"
            margin="normal"
          />
        )}
      />
    <TextField margin="normal" fullWidth label="Année d'expérience" name="anneeExperience" value={formData.anneeExperience} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Description" name="description" value={formData.description} onChange={handleChange} multiline rows={3} />
    <TextField margin="normal" fullWidth label="Rayon d'intervention (km)" name="rayonIntervention" type="number" value={formData.rayonIntervention} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Zones d'intervention (séparées par des virgules)" name="zoneIntervention" value={formData.zoneIntervention?.join(', ') || ''} onChange={(e) => setFormData(prev => ({ ...prev, zoneIntervention: e.target.value.split(',').map(s => s.trim()) }))} />
    <TextField margin="normal" fullWidth label="Tarif horaire min" name="tarifHoraireMin" type="number" value={formData.tarifHoraireMin} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Tarif horaire max" name="tarifHoraireMax" type="number" value={formData.tarifHoraireMax} onChange={handleChange} />

    {/* Diplômes / certificats */}
    <TextField
      margin="normal"
      fullWidth
      label="Diplômes / Certificats (JSON)"
      name="diplomeCertificat"
      value={JSON.stringify(formData.diplomeCertificat || [])}
      onChange={(e) => {
        try {
          setFormData(prev => ({ ...prev, diplomeCertificat: JSON.parse(e.target.value) }));
        } catch {}
      }}
    />

    {/* Assurances / RCCM */}
    <TextField margin="normal" fullWidth label="Attestation Assurance" name="attestationAssurance" value={formData.attestationAssurance} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Numéro Assurance" name="numeroAssurance" value={formData.numeroAssurance} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Numéro RCCM" name="numeroRCCM" value={formData.numeroRCCM} onChange={handleChange} />

    {/* Stats */}
    <TextField margin="normal" fullWidth label="Nombre de missions" name="nbMission" type="number" value={formData.nbMission} onChange={handleChange} />
    <TextField margin="normal" fullWidth label="Revenus" name="revenus" type="number" value={formData.revenus} onChange={handleChange} />

    {/* Vérification */}
    <Box sx={{ mt: 2 }}>
      <label>
        <input type="checkbox" name="verifier" checked={formData.verifier} onChange={handleChange} /> Vérifié
      </label>
    </Box>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setModalOpen(false)}>Annuler</Button>
    <Button onClick={handleSave}>{selectedPrestataire ? 'Enregistrer' : 'Ajouter'}</Button>
  </DialogActions>
</Dialog>

      {/* Dialog pour sélectionner utilisateur */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sélectionner un utilisateur</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Rechercher" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
          <DataTable
            value={filteredUtilisateurs}
            paginator
            rows={5}
            loading={loadingUtilisateurs}
            selectionMode="single"
            onRowClick={(e) => {
              const utilisateur = e.data as IUtilisateur;
              setFormData(prev => ({ ...prev, utilisateur }));
              setShowUserDialog(false);
              toast.success(`Utilisateur sélectionné : ${utilisateur.nom} ${utilisateur.prenom}`);
            }}
            dataKey="_id"
          >
            <Column field="nom" header="Nom" />
            <Column field="prenom" header="Prénom" />
            <Column field="email" header="Email" />
            <Column field="telephone" header="Téléphone" />
          </DataTable>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour zoom image */}
      <Dialog open={!!zoomImage} onClose={() => setZoomImage(null)} maxWidth="md">
        <DialogTitle>Image</DialogTitle>
        <DialogContent>
          {zoomImage && (
            <img
              src={zoomImage}
              alt="document"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoomImage(null)} color="primary">Fermer</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PrestataireComponent;
