import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface Item {
  _id?: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  genre: string;
  note: string;
  photoProfil?: string;// Cloudinary image URL
  motdepasse?: string; // Password field
}

const Utilisateur: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<Item[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    'global': { value: null, matchMode: 'contains' }
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedUtilisateur, setSelectedUtilisateur] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Item>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    genre: '',
    note: '',
    motdepasse: '', // Password field
  });
  const [file, setFile] = useState<File | null>(null); // Separate state for file input

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/utilisateurs');
        setUtilisateurs(response.data);
        console.log(response.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let _filters = { ...filters };

    if (_filters['global'] && 'value' in _filters['global']) {
      _filters['global'].value = value;
    } else {
      _filters['global'] = { value, matchMode: 'contains' };
    }

    setFilters(_filters);
    setGlobalFilter(value);
  };

  const onDelete = async (rowData: Item) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/utilisateur/${rowData._id}`);
        setUtilisateurs(utilisateurs.filter(item => item._id !== rowData._id));
        toast.success('Utilisateur supprimé avec succès !');
      } catch (error) {
        toast.error('Erreur lors de la suppression de l\'utilisateur.');
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      }
    }
  };

  const onEdit = (rowData: Item) => {
    setSelectedUtilisateur(rowData);
    setFormData(rowData);
    setFile(null); // Reset file state when editing
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedUtilisateur(null);
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      genre: '',
      note: '',
      motdepasse: '', // Reset this field as well
    });
    setFile(null); // Reset file state when adding new user
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]); // Save file in the state
    }
  };
  const handleSave = async () => {
    const formDataToSend = new FormData();
    formDataToSend.append('nom', formData.nom);
    formDataToSend.append('prenom', formData.prenom);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('telephone', formData.telephone);
    formDataToSend.append('genre', formData.genre);
    formDataToSend.append('note', formData.note);
    formDataToSend.append('motdepasse', formData.motdepasse || '');

    if (file) {
        formDataToSend.append('photo', file);
    }

    try {
        if (selectedUtilisateur) {
            // Update existing utilisateur
            const response = await axios.put(`http://localhost:3000/api/utilisateur/${selectedUtilisateur._id}`, formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUtilisateurs((prevUtilisateurs) =>
                prevUtilisateurs.map((item) =>
                    item._id === selectedUtilisateur._id ? response.data : item
                )
            );
            toast.success('Utilisateur mis à jour avec succès !');
        } else {
            // Add new utilisateur
            const response = await axios.post('http://localhost:3000/api/utilisateur', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setUtilisateurs([...utilisateurs, response.data]);
            toast.success('Nouvel utilisateur ajouté avec succès !');
        }
        setModalOpen(false);
    } catch (error) {
        console.error('Erreur lors de la sauvegarde de l\'utilisateur:', error);
        toast.error("Erreur lors de la sauvegarde de l'utilisateur.");
    }
};



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'photoprofil' && files) {
      setFile(files[0]); // Save the file separately
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const renderHeader = () => (
    <div className="table-header">
      <h5 className="mx-0 my-1">Manage Utilisateurs</h5>
      <Button variant="contained" color="primary" onClick={onAdd}>
        Ajouter Un Nouvel Utilisateur
      </Button>
    </div>
  );

  const header = renderHeader();

  const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => {
    return options.rowIndex + 1;
  };

  const imageTemplate = (rowData: Item) => (
    <img
      src={rowData.photoProfil || 'https://res.cloudinary.com/your-cloud-name/image/upload/v0/default-profile.png'} // Provide a default URL if no image is available
      alt="Profile"
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        objectFit: 'cover',
      }}
    />
  );
  

  const actionTemplate = (rowData: Item) => (
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
        Utilisateurs
      </Typography>
      <Typography variant="body1">
        Liste des utilisateurs
      </Typography>

      <Box sx={{ mt: 2, mb: 2 }}>
        <div className="datatable-doc-demo">
          <DataTable
            value={utilisateurs}
            paginator
            showGridlines
            rows={10}
            loading={loading}
            dataKey="_id"
            filters={filters}
            globalFilterFields={['nom', 'prenom', 'email']}
            header={header}
            emptyMessage="Aucun utilisateur trouvé"
            onFilter={(e) => setFilters(e.filters)}
          >
            <Column header="#" body={rowIndexTemplate} />
            <Column header="Image" body={imageTemplate} />
            <Column field="_id" header="Identifiant" sortable />
            <Column field="nom" header="Nom" sortable />
            <Column field="prenom" header="Prénom" sortable />
            <Column field="email" header="Email" sortable />
            <Column header="Actions" body={actionTemplate} />
         
          </DataTable>
        </div>
      </Box>

      {/* Modal for Add/Edit Utilisateur */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>{selectedUtilisateur ? 'Modifier l\'Utilisateur' : 'Ajouter un Nouvel Utilisateur'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            fullWidth
            label="Nom"
            name="nom"
            value={formData.nom}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Prénom"
            name="prenom"
            value={formData.prenom}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Téléphone"
            name="telephone"
            value={formData.telephone}
            onChange={handleChange}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Genre"
            name="genre"
            value={formData.genre}
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
          <TextField
            margin="normal"
            fullWidth
            type="password"
            label="Mot de Passe"
            name="motdepasse"
            value={formData.motdepasse}
            onChange={handleChange}
          />
          <input
            type="file"
            onChange={handleFileChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="primary">
            Annuler
          </Button>
          <Button onClick={handleSave} color="primary">
            {selectedUtilisateur ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Utilisateur;
