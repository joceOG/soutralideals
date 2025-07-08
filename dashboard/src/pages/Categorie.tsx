import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import {
  Box, IconButton, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, MenuItem, Fab, alpha, Card, Paper, PaperProps
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddIcon from '@mui/icons-material/Add';
import { motion, AnimatePresence, MotionProps } from 'framer-motion';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const MotionTypography = motion(Typography);
const MotionDiv = motion.div;

export interface Item {
  _id?: string;
  nomcategorie: string;
  imagecategorie?: string | { type: string; data: Buffer | Uint8Array | any };
  groupe: { _id: string; nomgroupe: string };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100
    } as const
  }
};

const NeumorphicCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? '#0c1a2c' : '#f0f4f8',
  borderRadius: '16px',
  boxShadow: theme.palette.mode === 'dark'
    ? `5px 5px 10px ${alpha('#000000', 0.8)}, -5px -5px 10px ${alpha('#0c1a2c', 0.25)}`
    : `10px 10px 20px ${alpha('#a3b1c6', 0.2)}, -10px -10px 20px ${alpha('#ffffff', 0.8)}`,
  padding: theme.spacing(2),
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.palette.mode === 'dark'
      ? `8px 8px 18px ${alpha('#000000', 0.9)}, -8px -8px 18px ${alpha('#0c1a2c', 0.3)}`
      : `15px 15px 30px ${alpha('#a3b1c6', 0.3)}, -15px -15px 30px ${alpha('#ffffff', 0.9)}`
  }
}));

// Composant Paper animé compatible MUI Dialog
const MotionPaper = React.forwardRef<HTMLDivElement, PaperProps & MotionProps>((props, ref) => {
  const { children, ...rest } = props;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: 'spring', damping: 20 }}
      {...rest}
    >
      <Paper elevation={3}>
        {children}
      </Paper>
    </motion.div>
  );
});

// Cast pour satisfaire le type attendu par Dialog
const MotionPaperForDialog = MotionPaper as React.ComponentType<PaperProps>;

const Categorie: React.FC = () => {
  const [categorie, setCategorie] = useState<Item[]>([]);
  const [filteredCategorie, setFilteredCategorie] = useState<Item[]>([]);
  const [groupes, setGroupes] = useState<{ _id: string; nomgroupe: string }[]>([]);
  const [globalFilter, setGlobalFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    'global': { value: null, matchMode: 'contains' }
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<Item | null>(null);
  const [formData, setFormData] = useState<Partial<Item>>({
    nomcategorie: '',
    imagecategorie: '',
    groupe: { _id: '', nomgroupe: '' },
  });
  const [file, setFile] = useState<File | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categorieResponse = await axios.get('http://localhost:3000/api/categorie');
        setCategorie(categorieResponse.data);
        setFilteredCategorie(categorieResponse.data);

        const groupesResponse = await axios.get('http://localhost:3000/api/groupe');
        setGroupes(groupesResponse.data);
      } catch (error) {
        console.error('Erreur lors de la récupération des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (globalFilter === null || globalFilter === '') {
      setFilteredCategorie(categorie);
    } else {
      const filtered = categorie.filter(item =>
        item.nomcategorie.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.groupe.nomgroupe.toLowerCase().includes(globalFilter.toLowerCase())
      );
      setFilteredCategorie(filtered);
    }
  }, [categorie, globalFilter]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      ...filters,
      'global': { value, matchMode: 'contains' }
    });
    setGlobalFilter(value);
  };

  const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => {
    return options.rowIndex + 1;
  };

  const actionTemplate = (rowData: Item) => (
    <>
      <IconButton
        className='mr-2'
        aria-label="edit"
        color="primary"
        size="large"
        onClick={() => onEdit(rowData)}
      >
        <EditIcon />
      </IconButton>
      <IconButton
        aria-label="delete"
        color="error"
        size="large"
        onClick={() => onDelete(rowData)}
      >
        <DeleteIcon />
      </IconButton>
    </>
  );

  const imageTemplate = (rowData: Item) => {
    if (typeof rowData.imagecategorie === 'string') {
      return (
        <img
          src={rowData.imagecategorie || 'https://res.cloudinary.com/your-cloud-name/image/upload/v0/default-profile.png'}
          alt="Category"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      );
    } else if (rowData.imagecategorie && typeof rowData.imagecategorie === 'object' && 'type' in rowData.imagecategorie && 'data' in rowData.imagecategorie) {
      return (
        <img
          alt="imagecategorie"
          src={`data:${rowData.imagecategorie.type};base64,${Buffer.from(rowData.imagecategorie.data).toString('base64')}`}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      );
    } else {
      return (
        <img
          src={'https://res.cloudinary.com/your-cloud-name/image/upload/v0/default-profile.png'}
          alt="Category"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      );
    }
  };

  const onEdit = (rowData: Item) => {
    setSelectedCategory(rowData);
    setFormData({
      nomcategorie: rowData.nomcategorie,
      imagecategorie: rowData.imagecategorie,
      groupe: rowData.groupe,
    });
    setFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedCategory(null);
    setFormData({
      nomcategorie: '',
      imagecategorie: '',
      groupe: { _id: '', nomgroupe: '' },
    });
    setFile(null);
    setModalOpen(true);
  };

  const onDelete = (rowData: Item) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la catégorie ${rowData.nomcategorie}?`)) {
      deleteCategorie(rowData._id!);
    }
  };

  const deleteCategorie = async (id: string) => {
    try {
      await axios.delete(`http://localhost:3000/api/categorie/${id}`);
      setCategorie(categorie.filter(item => item._id !== id));
      toast.success('Catégorie supprimée avec succès');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!formData.groupe?._id) {
      toast.error('Groupe is not selected.');
      return;
    }

    const formDataObj = new FormData();
    formDataObj.append('nomcategorie', formData.nomcategorie || '');
    formDataObj.append('groupe', JSON.stringify(formData.groupe || {}));
    if (file) {
      formDataObj.append('imagecategorie', file);
    }

    try {
      if (selectedCategory) {
        await axios.put(`http://localhost:3000/api/categorie/${selectedCategory._id}`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Catégorie mise à jour avec succès');
      } else {
        await axios.post('http://localhost:3000/api/categorie', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Catégorie créée avec succès');
      }

      const response = await axios.get('http://localhost:3000/api/categorie');
      setCategorie(response.data);
      setFilteredCategorie(response.data);

      setModalOpen(false);
      setSelectedCategory(null);
      setFormData({
        nomcategorie: '',
        imagecategorie: '',
        groupe: { _id: '', nomgroupe: '' },
      });
      setFile(null);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleGroupeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedGroupe = groupes.find(groupe => groupe._id === e.target.value);
    if (selectedGroupe) {
      setFormData({
        ...formData,
        groupe: { _id: selectedGroupe._id, nomgroupe: selectedGroupe.nomgroupe },
      });
    }
  };

  const renderSearchHeader = () => (
    <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
      <TextField
        variant="outlined"
        size="small"
        placeholder="Rechercher..."
        value={globalFilter || ''}
        onChange={onGlobalFilterChange}
        InputProps={{
          startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />,
        }}
        sx={{ width: 300 }}
      />
    </Box>
  );

  const renderHeader = () => (
    <div className="table-header">
      <h5 className="mx-0 my-1">Gestion des Catégories</h5>
      <Button variant="contained" color="primary" onClick={onAdd}>
        Ajouter Une Nouvelle Catégorie
      </Button>
    </div>
  );

  const header = (
    <>
      {renderHeader()}
      {renderSearchHeader()}
    </>
  );

  return (
    <MotionDiv initial="hidden" animate="visible" variants={containerVariants}>
      <Box mb={3}>
        <MotionTypography variant="h4" variants={itemVariants} gutterBottom>
          Gestion des Catégories
        </MotionTypography>
        <MotionTypography variant="body1" variants={itemVariants}>
          Liste et administration des catégories
        </MotionTypography>
      </Box>

      <Box sx={{ mt: 2, mb: 2 }}>
        <motion.div variants={itemVariants}>
          <NeumorphicCard>
            <DataTable
              value={filteredCategorie}
              paginator
              showGridlines
              rows={10}
              loading={loading}
              dataKey="_id"
              filters={filters}
              globalFilterFields={['groupe.nomgroupe', 'nomcategorie', '_id']}
              header={header}
              emptyMessage="Aucune catégorie trouvée"
              onFilter={(e) => setFilters(e.filters)}
            >
              <Column header="N°" body={rowIndexTemplate} />
              <Column field="nomcategorie" header="Nom Catégorie" />
              <Column field="imagecategorie" header="Image Catégorie" body={imageTemplate} />
              <Column field="groupe.nomgroupe" header="Groupe" />
              <Column body={actionTemplate} header="Actions" />
            </DataTable>
          </NeumorphicCard>
        </motion.div>
      </Box>

      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Fab
            color="secondary"
            aria-label="add"
            onClick={onAdd}
            sx={{
              boxShadow: theme => `5px 5px 10px ${alpha(theme.palette.common.black, 0.3)},
                                   -5px -5px 10px ${alpha(theme.palette.common.white, 0.1)}`
            }}
          >
            <AddIcon />
          </Fab>
        </motion.div>
      </Box>

      <AnimatePresence>
        {modalOpen && (
          <Dialog
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            fullWidth
            maxWidth="sm"
            PaperComponent={MotionPaperForDialog}  // <-- Correct usage here
          >
            <DialogTitle sx={{ m: 0, p: 2 }}>
              {selectedCategory ? 'Modifier la catégorie' : 'Ajouter une nouvelle catégorie'}
              <IconButton
                aria-label="close"
                onClick={() => setModalOpen(false)}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'grey.500',
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <motion.form
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TextField
                  autoFocus
                  margin="dense"
                  id="nomcategorie"
                  name="nomcategorie"
                  label="Nom Catégorie"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.nomcategorie || ''}
                  onChange={handleChange}
                  sx={{ mb: 2 }}
                />
                <TextField
                  margin="dense"
                  id="groupe"
                  select
                  label="Groupe"
                  fullWidth
                  variant="outlined"
                  value={formData.groupe?._id || ''}
                  onChange={handleGroupeChange}
                  sx={{ mb: 2 }}
                >
                  {groupes.map((groupe) => (
                    <MenuItem key={groupe._id} value={groupe._id}>
                      {groupe.nomgroupe}
                    </MenuItem>
                  ))}
                </TextField>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="upload-button"
                  type="file"
                  onChange={handleFileChange}
                />
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: theme => alpha(theme.palette.background.paper, 0.8),
                  boxShadow: theme => `inset 2px 2px 5px ${alpha(theme.palette.mode === 'dark' ? '#000000' : '#a3b1c6', 0.5)},
                                      inset -2px -2px 5px ${alpha(theme.palette.mode === 'dark' ? '#0c1a2c' : '#FFFFFF', 0.5)}`
                }}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <label htmlFor="upload-button">
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        mt: 1
                      }}>
                        <Typography variant="body2" color="textSecondary">
                          {file.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => setFile(null)}
                          aria-label="remove image"
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </motion.div>
                  )}
                </Box>
              </motion.form>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setModalOpen(false)} color="primary">
                Annuler
              </Button>
              <Button onClick={handleSave} color="primary" variant="contained">
                Enregistrer
              </Button>
            </DialogActions>
          </Dialog>
        )}
      </AnimatePresence>

      <ToastContainer position="top-right" autoClose={3000} />
    </MotionDiv>
  );
};

export default Categorie;
