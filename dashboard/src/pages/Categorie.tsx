

import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
=======
import { styled } from '@mui/material/styles';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, MenuItem, Snackbar, Alert, Fab, alpha, Card } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddIcon from '@mui/icons-material/Add';
import { motion, AnimatePresence } from 'framer-motion';
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface Item {
    _id: string;
    nomcategorie: string;
<<<<<<< HEAD
    imagecategorie: { 
        type: string,
        data: Uint8Array
=======
    imagecategorie?: string | {
        type: string;
        data: Buffer | Uint8Array | any;
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
    };
    groupe: { 
        _id: string,
        nomgroupe: string 
    };
}

<<<<<<< HEAD
=======
// Animation variants pour les conteneurs
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

<<<<<<< HEAD
=======
// Animation variants pour les éléments individuels
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
<<<<<<< HEAD
            type: "spring" as const,
            stiffness: 100,
            damping: 20
=======
            type: "spring",
            stiffness: 100
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
        }
    }
};

<<<<<<< HEAD
=======
// Composant Card neumorphique stylisé
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
const NeumorphicCard = styled(Card)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#0c1a2c' : '#f0f4f8',
    borderRadius: '16px',
    boxShadow: theme.palette.mode === 'dark'
<<<<<<< HEAD
        ? `5px 5px 10px ${alpha('#000000', 0.8)}, -5px -5px 10px ${alpha('#0c1a2c', 0.25)}`
        : `10px 10px 20px ${alpha('#a3b1c6', 0.2)}, -10px -10px 20px ${alpha('#ffffff', 0.8)}`,
=======
        ? `5px 5px 10px ${alpha('#000000', 0.8)}, 
           -5px -5px 10px ${alpha('#0c1a2c', 0.25)}`
        : `10px 10px 20px ${alpha('#a3b1c6', 0.2)}, 
           -10px -10px 20px ${alpha('#ffffff', 0.8)}`,
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
    padding: theme.spacing(2),
    transition: 'transform 0.3s, box-shadow 0.3s',
    '&:hover': {
        transform: 'translateY(-5px)',
        boxShadow: theme.palette.mode === 'dark'
<<<<<<< HEAD
            ? `8px 8px 18px ${alpha('#000000', 0.9)}, -8px -8px 18px ${alpha('#0c1a2c', 0.3)}`
            : `15px 15px 30px ${alpha('#a3b1c6', 0.3)}, -15px -15px 30px ${alpha('#ffffff', 0.9)}`
    }
}));

const MotionTypography = motion(Typography);
const MotionDiv = motion.div;

const Transition = React.forwardRef<HTMLDivElement, PaperProps>((props, ref) => {
    // Exclure les handlers incompatibles comme onAnimationStart avant de passer les props à MotionDiv
    const { style, onAnimationStart, ...other } = props;

    return (
        <MotionDiv
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
                borderRadius: '16px',
                backgroundColor: 'white',
                overflow: 'hidden',
                boxShadow: `0 10px 30px rgba(0,0,0,0.15)`,
                ...style,
            }}
        >
            <Paper {...other} />
        </MotionDiv>
    );
});

const Categorie: React.FC = () => {
    const [categorie, setCategorie] = useState<Item[]>([]);
=======
            ? `8px 8px 18px ${alpha('#000000', 0.9)}, 
               -8px -8px 18px ${alpha('#0c1a2c', 0.3)}`
            : `15px 15px 30px ${alpha('#a3b1c6', 0.3)}, 
               -15px -15px 30px ${alpha('#ffffff', 0.9)}`
    }
}));

const Categorie: React.FC = () => {
    const [categorie, setCategorie] = useState<Item[]>([]);
    const [filteredCategorie, setFilteredCategorie] = useState<Item[]>([]);
    const [groupes, setGroupes] = useState<{ _id: string; nomgroupe: string }[]>([]);
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
    const [globalFilter, setGlobalFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        'global': { value: null, matchMode: 'contains' }
    });
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<Item | null>(null);
    const [formData, setFormData] = useState<Item>({
        _id: '',
        nomcategorie: '',
        imagecategorie: { type: '', data: new Uint8Array() },
        groupe: { _id: '', nomgroupe: '' },
    });
<<<<<<< HEAD
=======
    const [file, setFile] = useState<File | null>(null); 
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)

    useEffect(() => {
        const fetchData = async () => {
            try {
<<<<<<< HEAD
                const response = await axios.get('http://localhost:3000/api/categories');
                setCategorie(response.data);
            } catch (error) {
                console.log(error);
=======
                const categorieResponse = await axios.get('http://localhost:3000/api/categorie');
                setCategorie(categorieResponse.data);
                setFilteredCategorie(categorieResponse.data);

                const groupesResponse = await axios.get('http://localhost:3000/api/groupe');
                setGroupes(groupesResponse.data);
            } catch (error) {
                console.error('Erreur lors de la récupération des données:', error);
                toast.error('Erreur lors du chargement des données');
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);
    
    // Appliquer le filtre global quand il change
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
        let _filters = { ...filters };

        if (_filters['global'] && 'value' in _filters['global']) {
            _filters['global'].value = value;
        } else {
            _filters['global'] = { value, matchMode: 'contains' };
        }

        setFilters(_filters);
        setGlobalFilter(value);
    };
    
    // Fonctions d'aide aux templates et aux actions
    const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => {
        return options.rowIndex + 1;
    };

<<<<<<< HEAD
    const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => options.rowIndex + 1;

    const actionTemplate = (rowData: Item) => (
        <>
=======
    const actionTemplate = (rowData: Item) => (
        <React.Fragment>
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
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
<<<<<<< HEAD
        </>
    );

    const imageTemplate = (rowData: Item) => {
        if (typeof rowData.imagecategorie === 'string') {
=======
        </React.Fragment>
    );

    const imageTemplate = (rowData: Item) => {
        // Vérifier si l'image est au format buffer ou URL
        if (typeof rowData.imagecategorie === 'string') {
            // Format URL
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
            return (
                <img
                    src={rowData.imagecategorie || 'https://res.cloudinary.com/your-cloud-name/image/upload/v0/default-profile.png'}
                    alt="Category"
<<<<<<< HEAD
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                />
            );
        } else if (rowData.imagecategorie && typeof rowData.imagecategorie === 'object' && 'type' in rowData.imagecategorie && 'data' in rowData.imagecategorie) {
            return (
                <img 
                    alt="imagecategorie" 
                    src={`data:${rowData.imagecategorie.type};base64,${Buffer.from(rowData.imagecategorie.data).toString('base64')}`}
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                /> 
            );
        } else {
=======
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                    }}
                />
            );
        } else if (rowData.imagecategorie && typeof rowData.imagecategorie === 'object' && 'type' in rowData.imagecategorie && 'data' in rowData.imagecategorie) {
            // Format buffer
            return (
                <div>
                    <img 
                        className='imageCategorie' 
                        alt="imagecategorie" 
                        src={`data:${rowData.imagecategorie.type};base64,${Buffer.from(rowData.imagecategorie.data).toString('base64')}`}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                        }}
                    /> 
                </div>
            );
        } else {
            // Image par défaut
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
            return (
                <img
                    src={'https://res.cloudinary.com/your-cloud-name/image/upload/v0/default-profile.png'}
                    alt="Category"
<<<<<<< HEAD
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
=======
                    style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                    }}
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
                />
            );
        }
    };

    const onEdit = (rowData: Item) => {
        setSelectedCategory(rowData);
<<<<<<< HEAD
        setFormData(rowData);
=======
        setFormData({
            nomcategorie: rowData.nomcategorie,
            imagecategorie: rowData.imagecategorie,
            groupe: rowData.groupe,
        });
        setFile(null); // Reset file state when editing
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
        setModalOpen(true);
    };

    const onAdd = () => {
        setSelectedCategory(null);
        setFormData({
            _id: '',
            nomcategorie: '',
            imagecategorie: { type: '', data: new Uint8Array() },
            groupe: { _id: '', nomgroupe: '' },
        });
<<<<<<< HEAD
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (selectedCategory) {
            // Edit existing category
            try {
                const response = await axios.put(`http://localhost:3000/api/categorie/${formData._id}`, formData);
                setCategorie(prevCategorie => prevCategorie.map(item => item._id === formData._id ? response.data : item));
                toast.success('Catégorie mise à jour avec succès !');
            } catch (error) {
                toast.error('Erreur lors de la mise à jour de la catégorie.');
                console.error('Erreur lors de la mise à jour de la catégorie:', error);
            }
        } else {
            // Add new category
            try {
                const response = await axios.post('http://localhost:3000/api/categorie', formData);
                setCategorie([...categorie, response.data]);
                toast.success('Nouvelle catégorie ajoutée avec succès !');
            } catch (error) {
                toast.error('Erreur lors de l\'ajout de la catégorie.');
                console.error('Erreur lors de l\'ajout de la catégorie:', error);
            }
=======
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

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };
    
    const showNotification = (message: string) => {
        setAlertMessage(message);
        setOpenSnackbar(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]); 
        }
    };

    const handleSave = async () => {
        // Vérifier que le groupe est sélectionné
        if (!formData.groupe?._id) {
            toast.error('Groupe non sélectionné.');
            return;
        }
    
        // Préparer les données à envoyer
        const formDataToSend = new FormData();
        formDataToSend.append('nomcategorie', formData.nomcategorie || '');
        formDataToSend.append('groupe', formData.groupe._id);  // Passer seulement le _id
    
        // Ajouter l'image si disponible
        if (file) {
            formDataObj.append('imagecategorie', file);
        }
    
        try {
            // Déterminer l'URL et la méthode en fonction de la présence de selectedCategory
            const url = selectedCategory
                ? `http://localhost:3000/api/categorie/${selectedCategory._id}`
                : 'http://localhost:3000/api/categorie';
            const method = selectedCategory ? 'put' : 'post';
    
            // Envoyer la requête avec Axios
            const response = await axios({
                url,
                method,
                data: formDataToSend,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
    
            // Mettre à jour l'état en fonction de l'opération (mise à jour ou ajout)
            setCategorie((prevCategorie) => {
                if (method === 'put' && selectedCategory) {
                    return prevCategorie.map((item) =>
                        item._id === selectedCategory._id ? response.data : item
                    );
                }
                return [...prevCategorie, response.data];
            });
    
            // Afficher un message de succès
            const actionMessage = selectedCategory ? 'Catégorie mise à jour' : 'Nouvelle catégorie ajoutée';
            toast.success(`${actionMessage} avec succès !`);
            setModalOpen(false);  // Fermer le modal
    
        } catch (error) {
<<<<<<< HEAD
            console.error('Erreur lors de l\'enregistrement:', error);
            toast.error('Erreur lors de l\'enregistrement');
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
            console.error('Erreur lors de la sauvegarde de la catégorie:', error);
            
            // Gestion des erreurs en cas de réponse d'Axios ou erreur générique
            const errorMessage = axios.isAxiosError(error) && error.response
                ? error.response.data.error
                : 'Erreur lors de la sauvegarde de la catégorie.';
            
            toast.error(errorMessage);
>>>>>>> 7f93ecd (Connexion effective entre front et back)
        }
        setModalOpen(false);
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

    // Recherche globale
    const renderSearchHeader = () => {
        return (
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
    };

    const renderHeader = () => (
        <div className="table-header">
            <h5 className="mx-0 my-1">Gestion des Catégories</h5>
            <Button variant="contained" color="primary" onClick={onAdd}>
                Ajouter Un Nouveau Catégorie
            </Button>
        </div>
    );

<<<<<<< HEAD
    const header = renderHeader();

    const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => {
        return options.rowIndex + 1;
    };

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

    const imageBodyTemplate = (rowData: Item) => (
        <div>
            <img 
                className='imageCategorie' 
                alt="imagecategorie" 
                src={imagefrombuffer({
                    type: rowData.imagecategorie.type,
                    data: rowData.imagecategorie.data,
                })}  
            /> 
        </div>
=======
    // Combinons les deux headers
    const header = (
        <>
            {renderHeader()}
            {renderSearchHeader()}
        </>
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    return (
<<<<<<< HEAD
        <div>
            <ToastContainer />
            <Typography variant="h4" gutterBottom>
                Categorie
            </Typography>
            <Typography variant="body1">
                Liste des catégories
            </Typography>

            <Box sx={{ mt: 2, mb: 2 }}>
                <div className="datatable-doc-demo">
                    <DataTable 
                        value={categorie} 
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
                        <Column header="#" body={rowIndexTemplate} />
                        <Column field="groupe.nomgroupe" header="Groupe" sortable />
                        <Column field="nomcategorie" header="Catégorie" sortable />
                        <Column header="Image Catégorie" body={imageBodyTemplate} />  
                        <Column field="_id" header="Identifiant" sortable />
                        <Column header="Actions" body={actionTemplate} />
                    </DataTable>
                </div>
            </Box>

            {/* Modal for Add/Edit Category */}
            <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
                <DialogTitle>{selectedCategory ? 'Modifier la Catégorie' : 'Ajouter Une Nouvelle Catégorie'}</DialogTitle>
              
                <DialogContent>
=======
        <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <Box mb={3}>
                <Typography variant="h4" component={motion.h4} variants={itemVariants} gutterBottom>
                    Gestion des Catégories
                </Typography>
                <Typography variant="body1" component={motion.p} variants={itemVariants}>
                    Liste et administration des catégories
                </Typography>
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
            
            {/* Floating Action Button */}
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
                                              -5px -5px 10px ${alpha(theme.palette.common.white, 0.1)}`,
                        }}
                    >
                        <AddIcon />
                    </Fab>
                </motion.div>
            </Box>

            {/* Modal pour ajouter/éditer une catégorie */}
            <AnimatePresence>
                {modalOpen && (
                <Dialog
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    fullWidth
                    maxWidth="sm"
                    PaperComponent={React.forwardRef((props, ref) => (
                        <motion.div
                            ref={ref}
                            {...props}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 20 }}
                            style={{
                                borderRadius: '16px',
                                backgroundColor: 'white',
                                overflow: 'hidden',
                                boxShadow: `0 10px 30px rgba(0,0,0,0.15)`
                            }}
                        />
                    ))}
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
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
                    <TextField
                        autoFocus
                        margin="dense"
                        name="nomcategorie"
                        label="Nom de la catégorie"
                        type="text"
                        fullWidth
<<<<<<< HEAD
                        value={formData.nomcategorie}
                        onChange={handleChange}
                        sx={{ mb: 2 }}
                    />
                    {/* Add other form fields as needed */}
                </DialogContent>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="group"
                        label="Groupe"
                        type="text"
                        fullWidth
                        value={formData.groupe}
=======
                        variant="outlined"
                        value={formData.nomcategorie || ''}
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
                        onChange={handleChange}
                        sx={{ mb: 2 }}
                    />
                    {/* Add other form fields as needed */}
                </DialogContent>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="image"
                          label="Image"
                        type="text"
                        fullWidth
<<<<<<< HEAD
                        value={formData.imagecategorie}
                        onChange={handleChange}
                    />
                    {/* Add other form fields as needed */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)} color="primary">
                        Annuler
                    </Button>
                    <Button onClick={handleSave} color="primary">
                        Sauvegarder
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
=======
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
                                        sx={{ ml: 1 }}
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
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={() => setModalOpen(false)} variant="outlined" color="primary">
                                Annuler
                            </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button onClick={handleSave} variant="contained" color="secondary">
                                {selectedCategory ? 'Mettre à jour' : 'Enregistrer'}
                            </Button>
                        </motion.div>
                    </DialogActions>
                </Dialog>
                )}
            </AnimatePresence>
            
            {/* Toast notifications */}
            <ToastContainer
                position="bottom-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />
        </motion.div>
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
    );
};

export default Categorie;
