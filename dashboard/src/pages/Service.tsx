import React, { useEffect, useState } from 'react';
import { Box, Fab, IconButton, Typography } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import AddIcon from '@mui/icons-material/Add';



interface Item {
  _id: string;
  nomcategorie: string;
  imagecategorie: { 
    type:Buffer ,
    data: []
  };
  groupe: { 
    _id:string ,
    nomgroupe:string 
  };
}

const Service: React.FC = () => {

  
  const [service, setService] = useState<Item[]>([]);
  const [nomservice, setnomservice] = useState('');
  const [categorie, setcategorie] = useState('');
  const [imageservice, setImageService] = useState<File | null>(null);
  const [visible, setVisible] = useState(false);
 

const [globalFilter, setGlobalFilter] = useState<string | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [filters, setFilters] = useState<DataTableFilterMeta>({
  'global': { value: null, matchMode: 'contains' }
});


  useEffect(() => {
    // Effect hook pour récupérer les données de l'API
    const fetchData = async () => {
      let data = '';
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'http://localhost:3000/api/service',
      headers: { },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      setService(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
  
    };
  
    fetchData();
    setLoading(false);
  }, []);    


if (!service) return null;

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

const renderHeader = () => {
  return (
      <div className="table-header">
          <h5 className="mx-0 my-1">Manage Services</h5>
          <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText type="search" value={globalFilter ?? ''} onChange={onGlobalFilterChange} placeholder="Global Search" />
          </span>
      </div>
  );
};

const header = renderHeader();

const rowIndexTemplate = (rowData: Item, options: ColumnBodyOptions) => {
  return options.rowIndex + 1;
};


const actionTemplate = (rowData: Item) => {
  return (
      <React.Fragment>
            <IconButton 
            className='mr-2'
      aria-label="delete" 
      color="primary" 
      size="large" 
      onClick={() => onEdit(rowData)}
    >
      <DeleteIcon />
    </IconButton>

    <IconButton 
      className='mr-2'
      aria-label="delete" 
      color="primary" 
      size="large" 
      onClick={() => onDelete(rowData)}
    >
      <EditIcon />
    </IconButton>
    
      </React.Fragment>
  );
};

const onEdit = (rowData: Item) => {
  // Handle edit action
  console.log('Edit service:', rowData);
};

const onDelete = (rowData: Item) => {
  // Handle delete action
  console.log('Delete service:', rowData);
};

const handleClickOpen = () => {
  console.log('FAB clicked'); // Debugging log
  setVisible(true);
};

const handleClose = () => {
  setVisible(false);
  setcategorie('');
  setnomservice('');
  setImageService(null);
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
  formData.append('categorie', categorie);
  if (imageservice) {
    formData.append('image', imageservice as File);
  }

  try {
    await axios.post('api.artisandubienetre.co/api/service', formData);
    // Optionally, you can redirect or perform any other action after successful submission.
  } catch (error) {
    console.error(error);
  }
  handleClose();
};

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Services
      </Typography>
      <Typography variant="body1">
       Liste des services
      </Typography>

      <Box  sx={{ mt: 2, mb: 2 }}>

      <div className="datatable-doc-demo">
            <DataTable value={service} paginator showGridlines rows={10} loading={loading} dataKey="_id"
                filters={filters} globalFilterFields={['groupe.nomgroupe', 'nomcategorie', '_id' ]} header={header}
                emptyMessage="Aucune catégorie trouvée" onFilter={(e) => setFilters(e.filters)}>
                <Column header="#" body={rowIndexTemplate} />
                <Column field="groupe.nomgroupe" header="Groupe" sortable />
                <Column field="nomcategorie" header="Catégorie" sortable />
                <Column field="_id" header="Identifiant" sortable />
                <Column header="Actions" body={actionTemplate} />
            </DataTable>
        </div>

    </Box>

    <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <Fab color="secondary" aria-label="add" onClick={handleClickOpen}>
          <AddIcon />
        </Fab>
      </Box>

    <Dialog     header="Service" 
                visible={visible}
                modal
                onHide={() => {if (!visible) return; setVisible(false); }}
         >

                    <div className="flex flex-column px-8 py-5 gap-4" style={{ borderRadius: '12px', backgroundImage: 'radial-gradient(circle at left top, var(--primary-400), var(--primary-700))' }}>
                      
                        <div className="inline-flex flex-column gap-2">
                            <label htmlFor="Nom du service" className="text-primary-50 font-semibold">
                                Nom du service :
                            </label>
                            <InputText id="imageservice" value={nomservice} className="bg-white-alpha-20 border-none p-3 text-primary-50"></InputText>
                        </div>
                        <div className="inline-flex flex-column gap-2">
                            <label className="text-primary-50 font-semibold">
                                Image:
                                <input type="file" onChange={handleImageChange} />
                              </label>
                        </div>
                        <div className="inline-flex flex-column gap-2">
                            <label htmlFor="Catégorie" className="text-primary-50 font-semibold">
                                Catégorie :
                            </label>
                            <InputText id="text"  value={categorie} className="bg-white-alpha-20 border-none p-3 text-primary-50" type="password"></InputText>
                        </div>

                        <div className="flex align-items-center gap-2">
                            <Button label="Sauvegarder" onClick={handleSubmit} text className="p-3 w-full text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10"></Button>
                        </div>
                    </div>
            
          </Dialog>


    </div>
  );
};

export default Service;