// src/pages/Freelance.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
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
  categorie: {
    _id: string;
    nomcategorie: string;
    groupe: {
      _id: string;
      nomgroupe: string;
    };
  };
}

export interface IFreelanceData {
  _id?: string;
  utilisateur: IUtilisateur;
  service: IService;
  prixfreelance: number;
  localisation: string;
  note: string;
  verifier: boolean;
  cni1?: string;
  cni2?: string;
  selfie?: string;
  // Nouveaux champs
  titreprofessionnel?: string;
  categorieprincipale?: string;
  niveauxexperience?: string;
  competences?: string[];  // tableau de string maintenant
  statut?: string;
  horaire?: string;
}

const FreelanceComponent: React.FC = () => {
  const [freelances, setFreelances] = useState<IFreelanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFreelance, setSelectedFreelance] = useState<IFreelanceData | null>(null);
  const [formData, setFormData] = useState<IFreelanceData>({
    utilisateur: {} as IUtilisateur,
    service: {} as IService,
    prixfreelance: 0,
    localisation: '',
    note: '',
    verifier: false,
    titreprofessionnel: '',
    categorieprincipale: '',
    niveauxexperience: '',
    competences: [],
    statut: '',
    horaire: '',
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

  const fetchFreelances = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/freelance`);
      setFreelances(response.data);
    } catch {
      toast.error("Erreur lors du chargement des freelances");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchFreelances();

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
  }, [apiUrl, fetchFreelances]);

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

  const onDelete = async (rowData: IFreelanceData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce freelance ?')) {
      try {
        await axios.delete(`${apiUrl}/freelance/${rowData._id}`);
        setFreelances(freelances.filter(item => item._id !== rowData._id));
        toast.success('Freelance supprimé avec succès !');
      } catch {
        toast.error('Erreur lors de la suppression du freelance.');
      }
    }
  };

  const onEdit = (rowData: IFreelanceData) => {
    setSelectedFreelance(rowData);
    // Pour éviter problème type entre string et string[] dans competences lors édition
    setFormData({
      ...rowData,
      competences: Array.isArray(rowData.competences) ? rowData.competences : (rowData.competences ? [rowData.competences] : []),
    });
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedFreelance(null);
    setFormData({
      utilisateur: {} as IUtilisateur,
      service: {} as IService,
      prixfreelance: 0,
      localisation: '',
      note: '',
      verifier: false,
      titreprofessionnel: '',
      categorieprincipale: '',
      niveauxexperience: '',
      competences: [],
      statut: '',
      horaire: '',
    });
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni' | 'cni2' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'cni') setCniFile(file);
      else if (type === 'cni2') setCni2File(file);
      else setSelfieFile(file);
    }
  };

  const handleSave = async () => {
    try {
      const isUpdate = Boolean(selectedFreelance?._id);
      const url = isUpdate ? `${apiUrl}/freelance/${selectedFreelance?._id}` : `${apiUrl}/freelance`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      form.append('utilisateur', formData.utilisateur._id);
      form.append('service', formData.service._id);
      form.append('prixfreelance', formData.prixfreelance.toString());
      form.append('localisation', formData.localisation);
      form.append('note', formData.note);
      form.append('verifier', formData.verifier ? 'true' : 'false');

      // Nouveaux champs
      form.append('titreprofessionnel', formData.titreprofessionnel || '');
      form.append('categorieprincipale', formData.categorieprincipale || '');
      form.append('niveauxexperience', formData.niveauxexperience || '');
      form.append('competences', JSON.stringify(formData.competences || [])); // JSON.stringify !!
      form.append('statut', formData.statut || '');
      form.append('horaire', formData.horaire || '');

      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);

      console.log("Formulaire" + formData.titreprofessionnel + " " + formData.categorieprincipale) ;

      await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchFreelances();

      toast.success(isUpdate ? 'Freelance mis à jour avec succès !' : 'Nouveau freelance ajouté avec succès !');
      setModalOpen(false);
    } catch {
      toast.error('Erreur lors de la sauvegarde du freelance.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageClick = (url: string) => setZoomImage(url);

  const imageTemplate = (field: 'cni1' | 'cni2' | 'selfie') => (rowData: IFreelanceData) => {
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

  const rowIndexTemplate = (rowData: IFreelanceData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IFreelanceData) => `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

  const actionTemplate = (rowData: IFreelanceData) => (
    <>
      <IconButton color="error" onClick={() => onDelete(rowData)}><DeleteIcon /></IconButton>
      <IconButton color="primary" onClick={() => onEdit(rowData)}><EditIcon /></IconButton>
    </>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Freelances</Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable
          value={freelances}
          paginator
          showGridlines
          rows={10}
          loading={loading}
          dataKey="_id"
          filters={filters}
          globalFilterFields={['localisation', 'note', 'titreprofessionnel', 'categorieprincipale']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h5>Gestion des Freelances</h5>
            <Button variant="contained" onClick={onAdd}>Ajouter</Button>
          </div>}
          emptyMessage="Aucun freelance trouvé"
          onFilter={(e) => setFilters(e.filters)}
        >
          <Column header="#" body={rowIndexTemplate} />
          <Column header="Utilisateur" body={utilisateurNameTemplate} sortable />
          <Column header="Service" body={(rowData) => rowData.service?.nomservice} sortable />
          <Column header="Titre Pro" body={(rowData) => rowData.titreprofessionnel || '-'} />
          <Column header="Catégorie" body={(rowData) => rowData.categorieprincipale || '-'} />
          <Column header="Niveau Exp." body={(rowData) => rowData.niveauxexperience || '-'} />
          <Column header="Compétences" body={(rowData) => (rowData.competences || []).join(', ')} />

          <Column field="statut" header="Statut" />
          <Column field="horaire" header="Horaire" />
          <Column field="prixfreelance" header="Prix" sortable />
          <Column field="localisation" header="Localisation" sortable />
          <Column field="note" header="Note" sortable />
          <Column header="CNI 1" body={imageTemplate('cni1')} />
          <Column header="CNI 2" body={imageTemplate('cni2')} />
          <Column header="Selfie" body={imageTemplate('selfie')} />
          <Column header="Vérification" body={(rowData) => rowData.verifier ? '✅' : '❌'} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedFreelance ? 'Modifier le Freelance' : 'Ajouter un Nouveau Freelance'}</DialogTitle>
        <DialogContent>

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

          {/* Champs supplémentaires */}
          <TextField margin="normal" fullWidth label="Titre Professionnel" name="titreprofessionnel" value={formData.titreprofessionnel} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Catégorie Principale" name="categorieprincipale" value={formData.categorieprincipale} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Niveau d'Expérience" name="niveauxexperience" value={formData.niveauxexperience} onChange={handleChange} />

          <Autocomplete
            multiple
            freeSolo
            options={[]} // tu peux mettre une liste d'options prédéfinies ici
            value={formData.competences || []}
            onChange={(_, newValue) => setFormData(prev => ({ ...prev, competences: newValue }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Compétences" placeholder="Ajouter une compétence" margin="normal" fullWidth />
            )}
          />

          <TextField margin="normal" fullWidth label="Statut" name="statut" value={formData.statut} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Horaire" name="horaire" value={formData.horaire} onChange={handleChange} />

          <TextField margin="normal" fullWidth label="Prix" name="prixfreelance" type="number" value={formData.prixfreelance} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Localisation" name="localisation" value={formData.localisation} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Note" name="note" value={formData.note} onChange={handleChange} />

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

          <Box sx={{ mt: 2 }}>
            <label>
              <input type="checkbox" name="verifier" checked={formData.verifier} onChange={handleChange} /> Vérifié
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave}>{selectedFreelance ? 'Enregistrer' : 'Ajouter'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de sélection utilisateur */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sélectionner un utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Rechercher"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
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

      {/* Dialog zoom image */}
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

export default FreelanceComponent;
