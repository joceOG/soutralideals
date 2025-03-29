import React, { useEffect, useState } from 'react';
import { Alert, Box, Fab, IconButton, MenuItem, Select, Snackbar, TextField, Typography } from '@mui/material';
import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import AddIcon from '@mui/icons-material/Add';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface Item {
  _id: string;
  nomservice: string;
  imageservice: string;
  categorie: {
    _id: string;
    nomcategorie: string;
    groupe: {
      _id: string;
      nomgroupe: string;
    };
  };
}

interface Option {
  _id: string;
  label: string;
  value: string;
}

const Service: React.FC = () => {
  const [service, setService] = useState<Item[]>([]);
  const [nomservice, setNomService] = useState('');
  const [imageservice, setImageService] = useState<File | null>(null);
  const [visible, setVisible] = useState(false);
  const [categorie, setCategorie] = useState<Option[]>([]);
  const [groupe, setGroupe] = useState<Option[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);
  const [selectedGroupe, setSelectedGroupe] = useState<string | null>(null);
  const [openSnackbarSuccess, setOpenSnackbarSuccess] = useState(false);
  const [openSnackbarError, setOpenSnackbarError] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // Track if editing
  const [currentService, setCurrentService] = useState<Item | null>(null); // Current service being edited

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/services');
        setService(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/categorie');
        const options = response.data.map((cat: any) => ({
          label: cat.nomcategorie,
          value: cat._id,
        }));
        setCategorie(options);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/groupe');
        const options = response.data.map((grp: any) => ({
          label: grp.nomgroupe,
          value: grp._id,
        }));
        setGroupe(options);
      } catch (error) {
        console.error(error);
      }
    };
    fetchGroups();
  }, []);

  const handleClickOpen = () => {
    setVisible(true);
    setIsEditing(false); // Ensure it's a new service
  };

  const handleClose = () => {
    setVisible(false);
    setNomService('');
    setImageService(null);
    setSelectedCategorie(null);
    setSelectedGroupe(null);
    setCurrentService(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageService(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('nomservice', nomservice);
    if (selectedCategorie) formData.append('categorie', selectedCategorie);
    if (selectedGroupe) formData.append('nomgroupe', selectedGroupe);
    if (imageservice) formData.append('imageservice', imageservice);

    try {
      if (isEditing && currentService) {
        // Update service
        await axios.put(`http://localhost:3000/api/service/${currentService._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Service mis à jour avec succès!');
      } else {
        // Create new service
        await axios.post('http://localhost:3000/api/service', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Service créé avec succès!');
      }

      setOpenSnackbarSuccess(true);
      handleClose();
      const response = await axios.get('http://localhost:3000/api/service');
      setService(response.data);
    } catch (error) {
      console.error(error);
      setOpenSnackbarError(true);
    }
  };

  const onEdit = (rowData: Item) => {
    setVisible(true);
    setIsEditing(true); // Set editing to true
    setCurrentService(rowData);
    setNomService(rowData.nomservice);
    setSelectedCategorie(rowData.categorie._id);
    setSelectedGroupe(rowData.categorie.groupe._id);
    // You may also set the image if required
  };

  const onDelete = async (rowData: Item) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette Service ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/service/${rowData._id}`);
        setService(service.filter((item) => item._id !== rowData._id));
        toast.success('Service supprimé avec succès!');
      } catch (error) {
        console.error(error);
        toast.error('Erreur lors de la suppression du service.');
      }
    }
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Services
      </Typography>
      <Dialog visible={visible} onHide={handleClose} header={isEditing ? "Modifier Service" : "Ajouter Service"}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-column px-8 py-5 gap-4">
            <TextField
              autoFocus
              margin="dense"
              label="Nom du service"
              type="text"
              fullWidth
              variant="standard"
              value={nomservice}
              onChange={(e) => setNomService(e.target.value)}
            />

            <TextField
              margin="dense"
              type="file"
              fullWidth
              variant="standard"
              onChange={handleImageChange}
            />

            <TextField
              select
              label="Catégorie"
              value={selectedCategorie || ''}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              fullWidth
              variant="standard"
            >
              <MenuItem value="" disabled>Select Catégorie</MenuItem>
              {categorie.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Groupe"
              value={selectedGroupe || ''}
              onChange={(e) => setSelectedGroupe(e.target.value)}
              fullWidth
              variant="standard"
            >
              <MenuItem value="" disabled>Select Groupe</MenuItem>
              {groupe.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Button label={isEditing ? "Mettre à jour" : "Enregistrer"} type="submit" className="p-button-success" />
          </div> 
        </form>
      </Dialog>
      <Box sx={{ mt: 2, mb: 2 }}>
        <div className="datatable-doc-demo">
          <DataTable value={service} paginator rows={10} dataKey="_id" emptyMessage="Aucun service trouvé">
            <Column field="_id" header="ID" sortable />

            <Column header="Image" body={(rowData) => (
              <img src={rowData.imageservice} alt="service" style={{ width: '40px', height: '40px',borderRadius:'50%' }} />
            )} />
            <Column field="nomservice" header="Service" sortable />
            <Column field="categorie.nomcategorie" header="Catégorie" sortable />
            <Column field="categorie.groupe.nomgroupe" header="Groupe" sortable />
       
            <Column header="Actions" body={(rowData) => (
              <>
                <IconButton color="primary" onClick={() => onEdit(rowData)}>
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={() => onDelete(rowData)}>
                  <DeleteIcon />
                </IconButton>
              </>
            )} />
          </DataTable>
        </div>
      </Box>
      <Fab color="primary" aria-label="add" onClick={handleClickOpen}>
        <AddIcon />
      </Fab>
      <ToastContainer />
      <Snackbar
        open={openSnackbarSuccess}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbarSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setOpenSnackbarSuccess(false)}>
          Service ajouté avec succès!
        </Alert>
      </Snackbar>
      <Snackbar
        open={openSnackbarError}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbarError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setOpenSnackbarError(false)}>
          Une erreur s'est produite lors de l'ajout du service.
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Service;
