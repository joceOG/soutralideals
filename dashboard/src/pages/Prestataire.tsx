import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
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
  categorie: {
    _id: string;
    nomcategorie: string;
    groupe: {
      _id: string;
      nomgroupe: string;
    };
  };
}

export interface IPrestataireData {
  _id?: string;
  utilisateur: IUtilisateur;
  service: IService;
  prixprestataire: number;
  localisation: string;
  note: string;
  verifier: boolean;
  cni1?: string;
  cni2?: string;
  selfie?: string;
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
    note: '',
    verifier: false,
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

  // useCallback pour stabiliser la fonction et éviter warning react-hooks/exhaustive-deps
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
      note: '',
      verifier: false,
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
      const isUpdate = Boolean(selectedPrestataire?._id);
      const url = isUpdate ? `${apiUrl}/prestataire/${selectedPrestataire?._id}` : `${apiUrl}/prestataire`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      form.append('utilisateur', formData.utilisateur._id);
      form.append('service', formData.service._id);
      form.append('prixprestataire', formData.prixprestataire.toString());
      form.append('localisation', formData.localisation);
      form.append('note', formData.note);
      form.append('verifier', formData.verifier ? 'true' : 'false');
      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);

      const response = await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('Réponse après ajout/modif:', response.data);

      // Recharge la liste complète après ajout/modif
      await fetchPrestataires();

      toast.success(isUpdate ? 'Prestataire mis à jour avec succès !' : 'Nouveau prestataire ajouté avec succès !');
      setModalOpen(false);
    } catch {
      toast.error('Erreur lors de la sauvegarde du prestataire.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
    ) : (
      <span style={{ color: '#888' }}>Aucune</span>
    );
  };

  const rowIndexTemplate = (rowData: IPrestataireData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IPrestataireData) => `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

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
          globalFilterFields={['localisation', 'note']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}><h5>Gestion des Prestataires</h5><Button variant="contained" onClick={onAdd}>Ajouter</Button></div>}
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
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPrestataire ? 'Modifier le Prestataire' : 'Ajouter un Nouveau Prestataire'}</DialogTitle>
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

          <TextField margin="normal" fullWidth label="Prix" name="prixprestataire" type="number" value={formData.prixprestataire} onChange={handleChange} />
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
          <Button onClick={handleSave}>{selectedPrestataire ? 'Enregistrer' : 'Ajouter'}</Button>
        </DialogActions>
      </Dialog>

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
