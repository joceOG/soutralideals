import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface IPrestataireData {
  _id?: string;
  idUtilisateur: string;
  cni: string;
  selfie: string;
  verifier: boolean;
  idservice: string;
  nomservice: string;
  prixmoyen: number;
  localisation: string;
  note: string;
}

const PrestataireComponent: React.FC = () => {
  const [prestataires, setPrestataires] = useState<IPrestataireData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    'global': { value: null, matchMode: 'contains' }
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedPrestataire, setSelectedPrestataire] = useState<IPrestataireData | null>(null);
  const [formData, setFormData] = useState<IPrestataireData>({
    idUtilisateur: '',
    cni: '',
    selfie: '',
    verifier: false,
    idservice: '',
    nomservice: '',
    prixmoyen: 0,
    localisation: '',
    note: ''
  });
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/prestataire');
        setPrestataires(response.data);
      } catch (error) {
        console.log(error);
        toast.error("Erreur lors du chargement des prestataires");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onDelete = async (rowData: IPrestataireData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/prestataire/${rowData._id}`);
        setPrestataires(prestataires.filter(item => item._id !== rowData._id));
        toast.success('Prestataire supprimé avec succès !');
      } catch (error) {
        toast.error('Erreur lors de la suppression du prestataire.');
        console.error('Erreur:', error);
      }
    }
  };

  const onEdit = (rowData: IPrestataireData) => {
    setSelectedPrestataire(rowData);
    setFormData(rowData);
    setCniFile(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedPrestataire(null);
    setFormData({
      idUtilisateur: '',
      cni: '',
      selfie: '',
      verifier: false,
      idservice: '',
      nomservice: '',
      prixmoyen: 0,
      localisation: '',
      note: ''
    });
    setCniFile(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'cni') {
        setCniFile(e.target.files[0]);
      } else {
        setSelfieFile(e.target.files[0]);
      }
    }
  };

  const handleSave = async () => {
  try {
    // Détermine si c'est une mise à jour ou une création
    const isUpdate = Boolean(selectedPrestataire?._id);

    // Construire l'URL et la méthode en fonction de l'action
    const url = isUpdate
      ? `http://localhost:3000/api/prestataire/${selectedPrestataire?._id}`
      : 'http://localhost:3000/api/prestataire';
    const method = isUpdate ? 'put' : 'post';

    // Préparation des données du formulaire
    const payload = { ...formData };

    // Appel API
    const response = await axios({
      method,
      url,
      data: payload,
    });

    // Mise à jour du state local
    if (isUpdate) {
      setPrestataires((prev) =>
        prev.map((item) =>
          item._id === selectedPrestataire?._id ? response.data : item
        )
      );
      toast.success('Prestataire mis à jour avec succès !');
    } else {
      setPrestataires((prev) => [...prev, response.data]);
      toast.success('Nouveau prestataire ajouté avec succès !');
    }

    setModalOpen(false);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    toast.error('Erreur lors de la sauvegarde du prestataire.');
  }
};

  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const renderHeader = () => (
    <div className="table-header">
      <h5 className="mx-0 my-1">Gestion des Prestataires</h5>
      <Button variant="contained" color="primary" onClick={onAdd}>
        Ajouter un Nouveau Prestataire
      </Button>
    </div>
  );

  const rowIndexTemplate = (rowData: IPrestataireData, options: ColumnBodyOptions) => {
    return options.rowIndex + 1;
  };

  const verificationTemplate = (rowData: IPrestataireData) => (
    <span>{rowData.verifier ? '✅ Vérifié' : '❌ Non vérifié'}</span>
  );

  const actionTemplate = (rowData: IPrestataireData) => (
    <React.Fragment>
      <IconButton
        className='mr-2'
        aria-label="delete"
        color="error"
        size="large"
        onClick={() => onDelete(rowData)}
      >
        <DeleteIcon />
      </IconButton>
      <IconButton
        className='mr-2'
        aria-label="edit"
        color="primary"
        size="large"
        onClick={() => onEdit(rowData)}
      >
        <EditIcon />
      </IconButton>
    </React.Fragment>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>
        Prestataires
      </Typography>
      <Typography variant="body1">
        Liste des prestataires
      </Typography>

      <Box sx={{ mt: 2, mb: 2 }}>
        <div className="datatable-doc-demo">
          <DataTable
            value={prestataires}
            paginator
            showGridlines
            rows={10}
            loading={loading}
            dataKey="_id"
            filters={filters}
            globalFilterFields={['nomservice', 'localisation', 'idUtilisateur']}
            header={renderHeader()}
            emptyMessage="Aucun prestataire trouvé"
            onFilter={(e) => setFilters(e.filters)}
          >
            <Column header="#" body={rowIndexTemplate} />
            <Column field="idUtilisateur" header="ID Utilisateur" sortable />
            <Column field="nomservice" header="Service" sortable />
            <Column field="prixmoyen" header="Prix Moyen" sortable />
            <Column field="localisation" header="Localisation" sortable />
            <Column field="note" header="Note" sortable />
            <Column header="Vérification" body={verificationTemplate} sortable field="verifier" />
            <Column header="Actions" body={actionTemplate} />
          </DataTable>
        </div>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>
          {selectedPrestataire ? 'Modifier le Prestataire' : 'Ajouter un Nouveau Prestataire'}
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            fullWidth
            label="ID Utilisateur"
            name="idUtilisateur"
            value={formData.idUtilisateur}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="ID Service"
            name="idservice"
            value={formData.idservice}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Nom du Service"
            name="nomservice"
            value={formData.nomservice}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Prix Moyen"
            name="prixmoyen"
            type="number"
            value={formData.prixmoyen}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Localisation"
            name="localisation"
            value={formData.localisation}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
          />
          <div>
            <Typography variant="subtitle1">CNI</Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'cni')}
              accept="image/*"
            />
          </div>
          <div>
            <Typography variant="subtitle1">Selfie</Typography>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, 'selfie')}
              accept="image/*"
            />
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                name="verifier"
                checked={formData.verifier}
                onChange={handleChange}
              />
              Vérifié
            </label>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="primary">
            Annuler
          </Button>
          <Button onClick={handleSave} color="primary">
            {selectedPrestataire ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default PrestataireComponent;