import React, { useEffect, useState } from 'react';
import { Alert, Box, Fab, IconButton, MenuItem, Select, SelectChangeEvent,Snackbar,SnackbarCloseReason,Typography } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import AddIcon from '@mui/icons-material/Add';
import { imagefrombuffer } from "imagefrombuffer";
//import { useNavigate } from 'react-router-dom';

interface Item {
  _id: string;
  nomservice: string;
  imageservice: { 
    type:Buffer ,
    data: []
  };
  categorie: { 
    _id:string ,
    nomcategorie:string,
    imagecategorie:string,
    groupe: { 
      _id:string ,
      nomgroupe:string 
    };
  };
}

interface Item2 {
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

interface Option {
  label: string;
  value: string;
}

const Service: React.FC = () => {

  
  const [service, setService] = useState<Item[]>([]);
  //const [count, setCount] = useState(0);
  const [nomservice, setNomService] = useState('');
  const [imageservice, setImageService] = useState<File | null>(null);
  const [visible, setVisible] = useState(false);
  const [categorie, setCategorie] = useState<Item2[]>([]);
  const [optionsCategorie, setOptionsCategorie] = useState<Option[]>([]);
  

  const [loadingSelect, setLoadingSelect] = useState<boolean>(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
 

const [globalFilter, setGlobalFilter] = useState<string | null>(null);
const [loading, setLoading] = useState<boolean>(true);
const [filters, setFilters] = useState<DataTableFilterMeta>({
  'global': { value: null, matchMode: 'contains' }
});

const [open, setOpen] = React.useState(false);
const [open2, setOpen2] = React.useState(false);

/*const navigate = useNavigate();

const actualiserRoute = () => {
    navigate(0); // Actualiser la route actuelle
};*/

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
     // console.log(JSON.stringify(response.data));
      setService(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
  
    };

    fetchData();
    setLoading(false);
  }, []); 
  
   //Récupération de la liste des catégories 
  useEffect(() => {
      let data = '';
      let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'http://localhost:3000/api/categorie',
        headers: { },
        data : data
      };
      
      axios.request(config)
      .then((response) => {
        //console.log(JSON.stringify(response.data));
       
      setCategorie(response.data);
      const options = categorie.map(objet => ({
        label: objet.nomcategorie,
        value:  objet._id,
      }));
     // console.log( "Option ..." + JSON.stringify(options)) ;

        setOptionsCategorie(options);
        setLoadingSelect(false);
      })
      .catch((error) => {
        console.log(error);
        setLoadingSelect(false);
      });
         
  } ) ;

if (!service) return null;
if (!categorie) return null;
if (!optionsCategorie) return null;

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

//Ouverture du Pop Up d'ajout des Serviced
const handleClickOpen = () => {
  console.log('FAB clicked'); // Debugging log
  setVisible(true);   
};

const handleClose = () => {
  setVisible(false);
  var item = {
    _id: '',
    nomcategorie: '',
    }
  setSelectedOption(item.nomcategorie);
  setNomService('');
  setImageService(null);
};

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setImageService(e.target.files[0]);
  }
};

const handleSelectChange = (event: SelectChangeEvent<string>) => {
  setSelectedOption(event.target.value);
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('nomservice', nomservice);
  let categorieObjet = categorie.find(objet => objet.nomcategorie === selectedOption);
  let categorieId = categorieObjet?._id ;
console.log(categorieId) ;
  if ( categorieId) {
    formData.append('categorie', categorieId );
  }
  if (imageservice) {
    formData.append('imageservice', imageservice as File);
  }

  try {
    await axios.post('http://localhost:3000/api/service', formData, { headers: {
      'Content-Type': 'multipart/form-data'
  } });
  setOpen(true);
    // Optionally, you can redirect or perform any other action after successful submission.
  } catch (error) {
    console.log('Réponse du serveur:', error);
    console.error(error);
    setOpen2(true);
  }
  //setCount(count + 1);
  handleClose();
 
};

const imageBodyTemplate = (rowData: Item) => {

  return (

    <div>
    <img   className='imageService' alt="imageservice" src={imagefrombuffer({
      type: rowData.imageservice.type,
      data: rowData.imageservice.data,
    }  )}  /> 
  </div>
  )
};



const handleSnackClose = (
  event?: React.SyntheticEvent | Event,
  reason?: SnackbarCloseReason,
) => {
  if (reason === 'clickaway') {
    return;
  }

  setOpen(false);
  setOpen2(false);
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
                emptyMessage="Aucun service trouvé" onFilter={(e) => setFilters(e.filters)}>
                <Column header="#" body={rowIndexTemplate} />
                <Column field="categorie.groupe.nomgroupe" header="Groupe" sortable />
                <Column field="categorie.nomcategorie" header="Catégorie" sortable />
                <Column field="nomservice" header="Service" sortable />
                <Column header="Image Service" body={imageBodyTemplate} />  
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
                <form onSubmit={handleSubmit}>
                    <div className="flex flex-column px-8 py-5 gap-4" style={{ borderRadius: '12px', backgroundImage: 'radial-gradient(circle at left top, var(--primary-400), var(--primary-700))' }}>
                      
                        <div className="inline-flex flex-column gap-2">
                            <label htmlFor="Nom du service" className="text-primary-50 font-semibold">
                                Nom du service :
                            </label>
                            
                            <InputText id="imageservice" onChange={(e) => setNomService(e.target.value)} value={nomservice} className="bg-white-alpha-20 border-none p-3 text-primary-50"></InputText>
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
                            {loadingSelect ? (
                              <p>Loading...</p>
                            ) : (
                              <div>
                              <Select
                                  labelId="select-label"
                                  value={selectedOption || ''}
                                  onChange={handleSelectChange}
                                  displayEmpty
                                  renderValue={(selected) => selected !== '' ? selected : 'Select an Option'}
                              >
                                  {categorie.map(option => (
                                      <MenuItem key={option._id} value={option.nomcategorie}>
                                          {option.nomcategorie}
                                      </MenuItem>
                                  ))}
                              </Select>
                              </div>
                            )}
                        </div>

                        <div className="flex align-items-center gap-2">
                            <Button label="Sauvegarder" onClick={handleSubmit} text className="p-3 w-full text-primary-50 border-1 border-white-alpha-30 hover:bg-white-alpha-10"></Button>
                        </div>
                    </div>
            
               </form>
          </Dialog>

       <Snackbar open={open} autoHideDuration={2000} onClose={handleSnackClose}>
        <Alert
          onClose={handleSnackClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Utilisateur ajouté avec succès
        </Alert>
      </Snackbar>

      <Snackbar open={open2} autoHideDuration={2000} onClose={handleSnackClose}>
        <Alert
          onClose={handleSnackClose}
          severity="error"
          variant="filled"
          sx={{ width: '100%' }}
        >
          Erreur
        </Alert>
      </Snackbar>

    </div>
  );
};

export default Service;