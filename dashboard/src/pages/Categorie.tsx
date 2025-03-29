import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { imagefrombuffer } from "imagefrombuffer";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface Item {
    _id: string;
    nomcategorie: string;
    imagecategorie: { 
        type: string,
        data: Uint8Array
    };
    groupe: { 
        _id: string,
        nomgroupe: string 
    };
}

const Categorie: React.FC = () => {
    const [categorie, setCategorie] = useState<Item[]>([]);
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/categories');
                setCategorie(response.data);
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
        setFormData(rowData);
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
        }
        setModalOpen(false);
    };

    const renderHeader = () => (
        <div className="table-header">
            <h5 className="mx-0 my-1">Manage Categories</h5>
            <Button variant="contained" color="primary" onClick={onAdd}>
                Ajouter Un Nouveau Catégorie
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
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

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
                    <TextField
                        autoFocus
                        margin="dense"
                        name="nomcategorie"
                        label="Nom de la catégorie"
                        type="text"
                        fullWidth
                        value={formData.nomcategorie}
                        onChange={handleChange}
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
                        onChange={handleChange}
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
    );
};

export default Categorie;
