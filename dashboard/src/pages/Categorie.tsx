import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';


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

const Categorie: React.FC = () => {

  const [categorie, setCategorie] = useState<Item[]>([]);

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
      url: 'http://localhost:3000/api/categorie',
      headers: { },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      setCategorie(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
  
    };
  
    fetchData();
    setLoading(false);
  }, []);    


if (!categorie) return null;

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
          <h5 className="mx-0 my-1">Manage Customers</h5>
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
  console.log('Edit customer:', rowData);
};

const onDelete = (rowData: Item) => {
  // Handle delete action
  console.log('Delete customer:', rowData);
};

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Categorie
      </Typography>
      <Typography variant="body1">
       Liste des catégories
      </Typography>

      <Box  sx={{ mt: 2, mb: 2 }}>

      <div className="datatable-doc-demo">
            <DataTable value={categorie} paginator showGridlines rows={10} loading={loading} dataKey="_id"
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

    </div>
  );
};

export default Categorie;