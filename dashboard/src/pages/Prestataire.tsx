import React, { useEffect, useState } from 'react';
import { Box, IconButton, Typography, Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField } from '@mui/material';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ModalInfo from './ModalInfo';

export interface IPrestataireData {
  _id?: string;
  idUtilisateur: string;
  cni1: { data: string }; // CNI 1 with data buffer
  cni2: { data: string }; // CNI 2 with data buffer
  selfie: string; // Selfie URL or base64 string
  verifier: boolean;
  idservice: string;
  nomservice: string;
  prixmoyen: number;
  localisation: string;
  note: string;
}

const PrestataireComponent: React.FC = () => {
  const [prestataires, setPrestataires] = useState<IPrestataireData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({
    'global': { value: null, matchMode: 'contains' }
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedPrestataire, setSelectedPrestataire] = useState<IPrestataireData | null>(null);
  const [formData, setFormData] = useState<IPrestataireData>({
    idUtilisateur: '',
    cni1: { data: '' },
    cni2: { data: '' },
    selfie: '',
    verifier: false,
    idservice: '',
    nomservice: '',
    prixmoyen: 0,
    localisation: '',
    note: ''
  });
  const [cni1File, setCni1File] = useState<File | null>(null);
  const [cni2File, setCni2File] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState<boolean>(false);
  const [modalCniData, setModalCniData] = useState<any>(null); // State to store CNI data

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/prestataire');
        setPrestataires(response.data);
      } catch (error) {
        console.log(error);
        toast.error("Erreur lors du chargement des prestataires");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const onDelete = async (rowData: IPrestataireData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce prestataire ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/prestataire/${rowData._id}`);
        setPrestataires(prestataires.filter(item => item._id !== rowData._id));
        toast.success('Prestataire supprimé avec succès !');
      } catch (error) {
        toast.error('Erreur lors de la suppression du prestataire.');
        console.error('Erreur:', error);
      }
    }
  };

  const onEdit = (rowData: IPrestataireData) => {
    setSelectedPrestataire(rowData);
    setFormData(rowData);
    setCni1File(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedPrestataire(null);
    setFormData({
      idUtilisateur: '',
      cni1: { data: '' },
      cni2: { data: '' },
      selfie: '',
      verifier: false,
      idservice: '',
      nomservice: '',
      prixmoyen: 0,
      localisation: '',
      note: ''
    });
    setCni1File(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni1' | 'cni2' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'cni1') {
        setCni1File(e.target.files[0]);
      } else if (type === 'cni2') {
        setCni2File(e.target.files[0]);
      } else {
        setSelfieFile(e.target.files[0]);
      }
    }
  };

  const handleSave = async () => {
    try {
      const isUpdate = Boolean(selectedPrestataire?._id);
      const url = isUpdate
        ? `http://localhost:3000/api/prestataire/${selectedPrestataire?._id}`
        : 'http://localhost:3000/api/prestataire';
      const method = isUpdate ? 'put' : 'post';
      const formDataToSend = new FormData();
      formDataToSend.append('idUtilisateur', formData.idUtilisateur);
      formDataToSend.append('nomservice', formData.nomservice);
      formDataToSend.append('prixmoyen', formData.prixmoyen.toString());
      formDataToSend.append('localisation', formData.localisation);
      formDataToSend.append('note', formData.note);
      formDataToSend.append('verifier', formData.verifier.toString());

      if (cni1File) formDataToSend.append('cni1', cni1File);
      if (cni2File) formDataToSend.append('cni2', cni2File);
      if (selfieFile) formDataToSend.append('selfie', selfieFile);

      const response = await axios({
        method,
        url,
        data: formDataToSend,
      });

      if (isUpdate) {
        setPrestataires((prev) =>
          prev.map((item) =>
            item._id === selectedPrestataire?._id ? response.data : item
          )
        );
        toast.success('Prestataire mis à jour avec succès !');
      } else {
        setPrestataires((prev) => [...prev, response.data]);
        toast.success('Nouveau prestataire ajouté avec succès !');
      }

      setModalOpen(false);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error('Erreur lors de la sauvegarde du prestataire.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const renderHeader = () => (
    <div className="table-header">
      <h5 className="mx-0 my-1">Gestion des Prestataires</h5>
      <Button variant="contained" color="primary" onClick={onAdd}>
        Ajouter un Nouveau Prestataire
      </Button>
    </div>
  );

  const rowIndexTemplate = (rowData: IPrestataireData, options: ColumnBodyOptions) => {
    return options.rowIndex + 1;
  };

  const verificationTemplate = (rowData: IPrestataireData) => (
    <span>{rowData.verifier ? '✅ Vérifié' : '❌ Non vérifié'}</span>
  );

  const actionTemplate = (rowData: IPrestataireData) => (
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
      <IconButton
        className='mr-2'
        aria-label="info"
        color="default"
        size="large"
        onClick={() => {
          setModalCniData({ cni1: rowData.cni1, cni2: rowData.cni2, selfie: rowData.selfie });
          setInfoModalOpen(true);
        }}
      >
        <AddIcon />
      </IconButton>
    </React.Fragment>
  );

  return (
    <>
      <ToastContainer />
      <DataTable value={prestataires} paginator rows={10} filters={filters} header={renderHeader()}>
        <Column field="index" header="#" body={rowIndexTemplate} />
        <Column field="idservice" header="Service" />
        <Column field="localisation" header="Localisation" />
        <Column field="prixmoyen" header="Prix moyen" />
        <Column field="note" header="Note" />
        <Column header="Vérification" body={verificationTemplate} />
        <Column header="Actions" body={actionTemplate} />
      </DataTable>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>{selectedPrestataire ? 'Modifier Prestataire' : 'Ajouter Prestataire'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nom du Service"
            name="nomservice"
            value={formData.nomservice}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            label="Prix moyen"
            name="prixmoyen"
            type="number"
            value={formData.prixmoyen}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            label="Localisation"
            name="localisation"
            value={formData.localisation}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            label="Note"
            name="note"
            value={formData.note}
            onChange={handleChange}
          />
          <TextField
            fullWidth
            label="Utilisateur ID"
            name="idUtilisateur"
            value={formData.idUtilisateur}
            onChange={handleChange}
          />

          <div>
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cni1')} />
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'cni2')} />
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal for displaying CNI Data */}
      <ModalInfo open={infoModalOpen} onClose={() => setInfoModalOpen(false)} modalData={modalCniData} />
    </>
  );
};

export default PrestataireComponent;
