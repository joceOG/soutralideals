import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, MenuItem } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface Item {
    _id?: string;
    nomcategorie: string;
    imagecategorie?: string; // Optional field
    groupe: { 
        _id: string;
        nomgroupe: string;
    };
}

const Categorie: React.FC = () => {
    const [categorie, setCategorie] = useState<Item[]>([]);
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
    const [file, setFile] = useState<File | null>(null); // Separate state for file input

    useEffect(() => {
        const fetchData = async () => {
            try {
                const categorieResponse = await axios.get('http://localhost:3000/api/categorie');
                setCategorie(categorieResponse.data);

                const groupesResponse = await axios.get('http://localhost:3000/api/groupe');
                setGroupes(groupesResponse.data);
            } catch (error) {
                console.error('Erreur lors de la récupération des données:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFilters({
            ...filters,
            'global': { value, matchMode: 'contains' }
        });
        setGlobalFilter(value);
    };

    const onDelete = async (rowData: Item) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
            try {
                await axios.delete(`http://localhost:3000/api/categorie/${rowData._id}`);
                setCategorie(categorie.filter(item => item._id !== rowData._id));
                toast.success('Catégorie supprimée avec succès !');
            } catch (error) {
                toast.error('Erreur lors de la suppression de la catégorie.');
                console.error('Erreur lors de la suppression de la catégorie:', error);
            }
        }
    };

    const onEdit = (rowData: Item) => {
        setSelectedCategory(rowData);
        setFormData({
            nomcategorie: rowData.nomcategorie,
            imagecategorie: rowData.imagecategorie,
            groupe: rowData.groupe,
        });
        setFile(null); // Reset file state when editing a category
        setModalOpen(true);
    };

    const onAdd = () => {
        setSelectedCategory(null);
        setFormData({
            nomcategorie: '',
            imagecategorie: '',
            groupe: { _id: '', nomgroupe: '' },
        });
        setFile(null); // Reset file state when adding a new category
        setModalOpen(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]); // Save file in the state
        }
    };

    const handleSave = async () => {
        if (!formData.groupe?._id) {
            toast.error('Groupe is not selected.');
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append('nomcategorie', formData.nomcategorie || '');
        formDataToSend.append('groupe', formData.groupe._id); // Pass only the _id as a string

        if (file) {
            formDataToSend.append('imagecategorie', file);
        }

        try {
            if (selectedCategory) {
                // Update existing category
                const response = await axios.put(`http://localhost:3000/api/categorie/${selectedCategory._id}`, formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setCategorie((prevCategorie) =>
                    prevCategorie.map((item) =>
                        item._id === selectedCategory._id ? response.data : item
                    )
                );
                toast.success('Catégorie mise à jour avec succès !');
            } else {
                // Add new category
                const response = await axios.post('http://localhost:3000/api/categorie', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setCategorie((prevCategorie) => [...prevCategorie, response.data]);
                toast.success('Nouvelle catégorie ajoutée avec succès !');
            }
            setModalOpen(false);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la catégorie:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Erreur response:', error.response.data);
                toast.error(`Erreur lors de la sauvegarde de la catégorie: ${error.response.data.error}`);
            } else {
                toast.error('Erreur lors de la sauvegarde de la catégorie.');
            }
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

    const renderHeader = () => (
        <div className="table-header">
            <h5 className="mx-0 my-1">Manage Categories</h5>
            <Button variant="contained" color="primary" onClick={onAdd}>
                Ajouter Une Nouvelle Catégorie
            </Button>
        </div>
    );

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

    const imageTemplate = (rowData: Item) => (
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

    return (
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
                        <Column header="N°" body={rowIndexTemplate} />
                        <Column field="nomcategorie" header="Nom Catégorie" />
                        <Column field="imagecategorie" header="Image Catégorie" body={imageTemplate} />
                        <Column field="groupe.nomgroupe" header="Groupe" />
                        <Column body={actionTemplate} header="Actions" />
                    </DataTable>
                </div>
            </Box>

            <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
                <DialogTitle>{selectedCategory ? 'Editer Catégorie' : 'Ajouter Catégorie'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="nomcategorie"
                        name="nomcategorie"
                        label="Nom Catégorie"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={formData.nomcategorie || ''}
                        onChange={handleChange}
                    />
                    <TextField
                        margin="dense"
                        id="groupe"
                        select
                        label="Groupe"
                        fullWidth
                        variant="standard"
                        value={formData.groupe?._id || ''}
                        onChange={handleGroupeChange}
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
                    <label htmlFor="upload-button">
                        <Button variant="contained" color="primary" component="span">
                            Upload Image
                        </Button>
                    </label>
                    {file && <Typography>Selected file: {file.name}</Typography>}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setModalOpen(false)}>Annuler</Button>
                    <Button onClick={handleSave}>Enregistrer</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default Categorie;
