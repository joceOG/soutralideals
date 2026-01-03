import React, { useEffect, useState } from 'react';
import {
  Alert, Box, IconButton, MenuItem, Snackbar, TextField,
  Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Close';
import { alpha } from '@mui/material/styles';
import axios from 'axios';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';

interface Item {
  _id: string;
  nomservice: string;
  imageservice: string;
  prixmoyen?: number;
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
  _id?: string;
  label: string;
  value: string;
  groupeId?: string; // Ajout de l'ID du groupe pour le filtrage
}

const Service: React.FC = () => {
  const [service, setService] = useState<Item[]>([]);
  const [nomservice, setNomService] = useState('');
  const [prixMoyen, setPrixMoyen] = useState<number | ''>('');
  const [imageservice, setImageService] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [categorie, setCategorie] = useState<Option[]>([]);
  const [groupe, setGroupe] = useState<Option[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string | null>(null);
  const [selectedGroupe, setSelectedGroupe] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentService, setCurrentService] = useState<Item | null>(null);
  const [openSnackbarSuccess, setOpenSnackbarSuccess] = useState(false);
  const [openSnackbarError, setOpenSnackbarError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${apiUrl}/service`);
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
        const response = await axios.get(`${apiUrl}/categorie`);
        // On garde toutes les catégories mais on stocke leur groupeId
        const options = response.data.map((cat: any) => ({
          label: cat.nomcategorie,
          value: cat._id,
          // Gérer le cas où groupe est peuplé (objet) ou non (string ID)
          groupeId: typeof cat.groupe === 'object' ? cat.groupe?._id : cat.groupe
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
        const response = await axios.get(`${apiUrl}/groupe`);
        // Filtrer pour exclure le groupe 'E-marché'
        const filteredGroups = response.data.filter((grp: any) =>
          !grp.nomgroupe.toLowerCase().includes('marché') &&
          !grp.nomgroupe.toLowerCase().includes('e-marché')
        );

        const options = filteredGroups.map((grp: any) => ({
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
    setOpen(true);
    setIsEditing(false);
    resetForm();
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNomService('');
    setPrixMoyen('');
    setImageService(null);
    setFile(null);
    setSelectedCategorie(null);
    setSelectedGroupe(null);
    setCurrentService(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageService(e.target.files[0]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formData = new FormData();
    formData.append('nomservice', nomservice);
    if (selectedCategorie) formData.append('categorie', selectedCategorie);
    if (prixMoyen !== '') formData.append('prixmoyen', prixMoyen.toString());
    if (imageservice) formData.append('imageservice', imageservice);

    try {
      if (isEditing && currentService) {
        await axios.put(`${apiUrl}/service/${currentService._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Service mis à jour avec succès!');
      } else {
        await axios.post(`${apiUrl}/service`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Service créé avec succès!');
      }

      setOpenSnackbarSuccess(true);
      handleClose();
      const response = await axios.get(`${apiUrl}/service`);
      setService(response.data);
    } catch (error) {
      console.error(error);
      setOpenSnackbarError(true);
    }
  };

  const onEdit = (rowData: Item) => {
    setOpen(true);
    setIsEditing(true);
    setCurrentService(rowData);
    setNomService(rowData.nomservice);
    setPrixMoyen(rowData.prixmoyen || '');
    setSelectedCategorie(rowData.categorie?._id || null);
    setSelectedGroupe(rowData.categorie?.groupe?._id || null);
  };

  const onDelete = async (rowData: Item) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        await axios.delete(`${apiUrl}/service/${rowData._id}`);
        setService(service.filter((item) => item._id !== rowData._id));
        toast.success('Service supprimé avec succès!');
      } catch (error) {
        console.error(error);
        toast.error('Erreur lors de la suppression du service.');
      }
    }
  };

  const filteredServices = service.filter((item) =>
    item.nomservice.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categorie?.nomcategorie?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.categorie?.groupe?.nomgroupe?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <Typography variant="h4" gutterBottom>Services</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleClickOpen}>
          Ajouter un nouveau service
        </Button>
        <TextField
          label="Rechercher"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton onClick={() => setSearchTerm('')} size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {isEditing ? "Modifier le service" : "Ajouter un nouveau service"}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit}
          >
            <TextField
              autoFocus
              margin="dense"
              label="Nom du service"
              type="text"
              fullWidth
              variant="outlined"
              value={nomservice}
              onChange={(e) => setNomService(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Prix moyen"
              type="number"
              fullWidth
              variant="outlined"
              value={prixMoyen}
              onChange={(e) => setPrixMoyen(Number(e.target.value) || '')}
              sx={{ mb: 2 }}
            />
            <TextField
              select
              label="Groupe"
              value={selectedGroupe || ''}
              onChange={(e) => setSelectedGroupe(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            >
              <MenuItem value="" disabled>Sélectionner Groupe</MenuItem>
              {groupe.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Catégorie"
              value={selectedCategorie || ''}
              onChange={(e) => setSelectedCategorie(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
              disabled={!selectedGroupe} // Désactiver si aucun groupe choisi
            >
              <MenuItem value="" disabled>Sélectionner Catégorie</MenuItem>
              {categorie
                // Filtrer les catégories qui appartiennent au groupe sélectionné
                .filter(option => !selectedGroupe || option.groupeId === selectedGroupe)
                .map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
            </TextField>

            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="upload-service-image"
              type="file"
              onChange={(e) => {
                handleImageChange(e);
                if (e.target.files?.[0]) setFile(e.target.files[0]);
              }}
            />
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mt: 2,
                p: 2,
                borderRadius: 2,
                bgcolor: theme => alpha(theme.palette.background.paper, 0.8),
                boxShadow: theme => `inset 2px 2px 5px ${alpha(theme.palette.mode === 'dark' ? '#000000' : '#a3b1c6', 0.5)},
                                  inset -2px -2px 5px ${alpha(theme.palette.mode === 'dark' ? '#0c1a2c' : '#FFFFFF', 0.5)}`
              }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <label htmlFor="upload-service-image">
                  <Button
                    variant="contained"
                    color="secondary"
                    component="span"
                    startIcon={<PhotoCameraIcon />}
                    sx={{ mb: 2 }}
                  >
                    {file ? 'Changer l\'image' : 'Sélectionner une image'}
                  </Button>
                </label>
              </motion.div>

              {file && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body2" color="textSecondary">{file.name}</Typography>
                    <IconButton size="small" onClick={() => setFile(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </motion.div>
              )}
            </Box>
          </motion.form>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} color="primary">Annuler</Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {isEditing ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable value={filteredServices || []} paginator rows={10} dataKey="_id" emptyMessage="Aucun service trouvé">
          <Column field="_id" header="ID" sortable />
          <Column
            header="Image"
            body={(rowData) => (
              <img
                src={rowData.imageservice}
                alt="service"
                style={{ width: '40px', height: '40px', borderRadius: '50%' }}
              />
            )}
          />
          <Column field="nomservice" header="Service" sortable />
          <Column field="prixmoyen" header="Prix Moyen (€)" sortable />
          <Column header="Catégorie" sortable body={(rowData: Item) => rowData.categorie?.nomcategorie || 'Non défini'} />
          <Column header="Groupe" sortable body={(rowData: Item) => rowData.categorie?.groupe?.nomgroupe || 'Non défini'} />
          <Column
            header="Actions"
            body={(rowData) => (
              <>
                <IconButton color="primary" onClick={() => onEdit(rowData)}>
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={() => onDelete(rowData)}>
                  <DeleteIcon />
                </IconButton>
              </>
            )}
          />
        </DataTable>
      </Box>

      <ToastContainer />

      <Snackbar open={openSnackbarSuccess} autoHideDuration={3000} onClose={() => setOpenSnackbarSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setOpenSnackbarSuccess(false)}>Service ajouté avec succès!</Alert>
      </Snackbar>
      <Snackbar open={openSnackbarError} autoHideDuration={3000} onClose={() => setOpenSnackbarError(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setOpenSnackbarError(false)}>Une erreur s'est produite.</Alert>
      </Snackbar>
    </div>
  );
};

export default Service;
