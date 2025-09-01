import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton
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

export interface IVendeurData {
  _id?: string;
  utilisateur: IUtilisateur;
  localisation: string;
  zonedelivraison: string;
  note: string;
  verifier: boolean;
  cni1?: string;
  cni2?: string;
  selfie?: string;
}

const VendeurComponent: React.FC = () => {
  const [vendeurs, setVendeurs] = useState<IVendeurData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVendeur, setSelectedVendeur] = useState<IVendeurData | null>(null);
  const [formData, setFormData] = useState<IVendeurData>({
    utilisateur: {} as IUtilisateur,
    localisation: '',
    zonedelivraison: '',
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

  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // useCallback pour stabiliser la fonction et éviter warning react-hooks/exhaustive-deps
  const fetchVendeurs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/vendeur`);
      setVendeurs(response.data);
    } catch {
      toast.error("Erreur lors du chargement des vendeurs");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchVendeurs();
  }, [apiUrl, fetchVendeurs]);

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

  const onDelete = async (rowData: IVendeurData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce vendeur ?')) {
      try {
        await axios.delete(`${apiUrl}/vendeur/${rowData._id}`);
        setVendeurs(vendeurs.filter(item => item._id !== rowData._id));
        toast.success('Vendeur supprimé avec succès !');
      } catch {
        toast.error('Erreur lors de la suppression du vendeur.');
      }
    }
  };

  const onEdit = (rowData: IVendeurData) => {
    setSelectedVendeur(rowData);
    setFormData(rowData);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedVendeur(null);
    setFormData({
      utilisateur: {} as IUtilisateur,
      localisation: '',
      zonedelivraison: '',
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
  if (!formData.utilisateur || !formData.utilisateur._id) {
    toast.error("Veuillez sélectionner un utilisateur avant de sauvegarder.");
    return;
  }

    try {
      const isUpdate = Boolean(selectedVendeur?._id);
      const url = isUpdate ? `${apiUrl}/vendeur/${selectedVendeur?._id}` : `${apiUrl}/vendeur`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      form.append('utilisateur', formData.utilisateur._id); // <- s'assure que c'est bien défini
      form.append('localisation', formData.localisation);
      form.append('zonedelivraison', formData.zonedelivraison);
      form.append('note', formData.note);
      form.append('verifier', formData.verifier ? 'true' : 'false');
      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);

      const response = await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('Réponse après ajout/modif:', response.data);

      await fetchVendeurs();
      toast.success(isUpdate ? 'Vendeur mis à jour avec succès !' : 'Nouveau vendeur ajouté avec succès !');
      setModalOpen(false);
    } catch (error: any) {
      console.error(error.response?.data || error);
      toast.error('Erreur lors de la sauvegarde du vendeur.');
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageClick = (url: string) => {
    setZoomImage(url);
  };

  const imageTemplate = (field: 'cni1' | 'cni2' | 'selfie') => (rowData: IVendeurData) => {
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

  const rowIndexTemplate = (rowData: IVendeurData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IVendeurData) => `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

  const actionTemplate = (rowData: IVendeurData) => (
    <>
      <IconButton color="error" onClick={() => onDelete(rowData)}><DeleteIcon /></IconButton>
      <IconButton color="primary" onClick={() => onEdit(rowData)}><EditIcon /></IconButton>
    </>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Vendeurs</Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable
          value={vendeurs}
          paginator
          showGridlines
          rows={10}
          loading={loading}
          dataKey="_id"
          filters={filters}
          globalFilterFields={['localisation', 'note']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}><h5>Gestion des Vendeurs</h5><Button variant="contained" onClick={onAdd}>Ajouter</Button></div>}
          emptyMessage="Aucun vendeur trouvé"
          onFilter={(e) => setFilters(e.filters)}
        >
          <Column header="#" body={rowIndexTemplate} />
          <Column header="Utilisateur" body={utilisateurNameTemplate} sortable />
          <Column header="Service" body={(rowData) => rowData.service?.nomservice} sortable />
          <Column field="localisation" header="Localisation" sortable />
          <Column field="zonedelivraison" header="Zone de Livraison" sortable />
          <Column field="note" header="Note" sortable />
          <Column header="CNI 1" body={imageTemplate('cni1')} />
          <Column header="CNI 2" body={imageTemplate('cni2')} />
          <Column header="Selfie" body={imageTemplate('selfie')} />
          <Column header="Vérification" body={(rowData) => rowData.verifier ? '✅' : '❌'} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedVendeur ? 'Modifier le Vendeur' : 'Ajouter un Nouveau Vendeur'}</DialogTitle>
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

          <TextField margin="normal" fullWidth label="Localisation" name="localisation" value={formData.localisation} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Zone de livraison" name="zonedelivraison" value={formData.zonedelivraison} onChange={handleChange} />
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
          <Button onClick={handleSave}>{selectedVendeur ? 'Enregistrer' : 'Ajouter'}</Button>
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

export default VendeurComponent;
