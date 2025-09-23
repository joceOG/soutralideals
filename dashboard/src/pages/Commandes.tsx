import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IInfoCommande {
  addresse: string;
  ville: string;
  telephone: string;
  codePostal: string;
  pays: string;
}

interface IArticleCommande {
  nom: string;
  quantité: number;
  image: string;
  prix: number;
}

interface IPaiementInfo {
  id?: string;
  status?: string;
}

interface ICommande {
  _id?: string;
  infoCommande: IInfoCommande;
  articles: IArticleCommande[];
  paiementInfo?: IPaiementInfo;
  datePaie?: string;
  prixArticles: number;
  prixLivraison: number;
  prixTotal: number;
  statusCommande: string;
  dateLivraison?: string;
  dateCreation?: string;
}

interface ICommandeStats {
  statsParStatus: Array<{
    _id: string;
    count: number;
    totalRevenu: number;
  }>;
  totalCommandes: number;
  revenueTotal: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const CommandesComponent: React.FC = () => {
  const [commandes, setCommandes] = useState<ICommande[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedCommande, setSelectedCommande] = useState<ICommande | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [stats, setStats] = useState<ICommandeStats | null>(null);

  const [formData, setFormData] = useState<ICommande>({
    infoCommande: {
      addresse: '',
      ville: '',
      telephone: '',
      codePostal: '',
      pays: 'Côte d\'Ivoire'
    },
    articles: [],
    prixArticles: 0,
    prixLivraison: 0,
    prixTotal: 0,
    statusCommande: 'En cours'
  });

  const statusOptions = [
    'En cours',
    'Confirmée',
    'En préparation',
    'Expédiée',
    'Livrée',
    'Annulée'
  ];

  // 🔹 CHARGEMENT DES COMMANDES
  const fetchCommandes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/commandes`);
      setCommandes(response.data.commandes || response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des commandes");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/commandes/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchCommandes();
    fetchStats();
  }, []);

  // 🔹 GESTION DES MODALES
  const handleOpen = (commande: ICommande | null = null) => {
    setSelectedCommande(commande);
    if (commande) {
      setFormData(commande);
    } else {
      setFormData({
        infoCommande: {
          addresse: '',
          ville: '',
          telephone: '',
          codePostal: '',
          pays: 'Côte d\'Ivoire'
        },
        articles: [],
        prixArticles: 0,
        prixLivraison: 0,
        prixTotal: 0,
        statusCommande: 'En cours'
      });
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedCommande(null);
    setModalOpen(false);
    setDetailModalOpen(false);
  };

  const handleDetail = (commande: ICommande) => {
    setSelectedCommande(commande);
    setDetailModalOpen(true);
  };

  // 🔹 SUPPRESSION
  const handleDelete = async (commande: ICommande) => {
    if (!commande._id) return;
    if (window.confirm(`Supprimer la commande ${commande._id} ?`)) {
      try {
        await axios.delete(`${apiUrl}/commande/${commande._id}`);
        toast.success("Commande supprimée");
        fetchCommandes();
        fetchStats();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  // 🔹 SAUVEGARDE
  const handleSave = async () => {
    try {
      const isUpdate = !!selectedCommande?._id;
      const url = isUpdate ? `${apiUrl}/commande/${selectedCommande?._id}` : `${apiUrl}/commande`;
      const method = isUpdate ? 'put' : 'post';

      await axios({
        method,
        url,
        data: formData,
        headers: { 'Content-Type': 'application/json' }
      });

      toast.success(isUpdate ? "Commande mise à jour" : "Commande créée");
      fetchCommandes();
      fetchStats();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    }
  };

  // 🔹 FILTRAGE
  const filteredCommandes = commandes.filter(commande => {
    const matchesSearch = 
      commande._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.infoCommande.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commande.statusCommande.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || commande.statusCommande === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // 🔹 TEMPLATES COLONNES
  const statusBodyTemplate = (rowData: ICommande) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Livrée': return 'success';
        case 'Annulée': return 'error';
        case 'En cours': return 'warning';
        case 'Expédiée': return 'info';
        default: return 'default';
      }
    };

    return (
      <Chip 
        label={rowData.statusCommande} 
        color={getStatusColor(rowData.statusCommande) as any}
        size="small"
      />
    );
  };

  const priceBodyTemplate = (rowData: ICommande) => (
    <Typography variant="body2" fontWeight="bold">
      {rowData.prixTotal.toLocaleString()} F
    </Typography>
  );

  const dateBodyTemplate = (rowData: ICommande) => (
    rowData.dateCreation ? new Date(rowData.dateCreation).toLocaleDateString('fr-FR') : '-'
  );

  const actionBodyTemplate = (rowData: ICommande) => (
    <Box>
      <IconButton color="info" onClick={() => handleDetail(rowData)}>
        <VisibilityIcon />
      </IconButton>
      <IconButton color="primary" onClick={() => handleOpen(rowData)}>
        <EditIcon />
      </IconButton>
      <IconButton color="error" onClick={() => handleDelete(rowData)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('infoCommande.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        infoCommande: {
          ...prev.infoCommande,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: ['prixArticles', 'prixLivraison', 'prixTotal'].includes(name) 
          ? Number(value) || 0 
          : value
      }));
    }
  };

  return (
    <Box m={2}>
      <ToastContainer />
      
      {/* 📊 HEADER AVEC STATISTIQUES */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Gestion des Commandes
        </Typography>
        
        {stats && (
          <Box display="flex" gap={2} mb={2}>
            <Box p={2} bgcolor="primary.light" borderRadius={2} minWidth={150}>
              <Typography variant="h6" color="white">
                {stats.totalCommandes}
              </Typography>
              <Typography variant="body2" color="white">
                Total Commandes
              </Typography>
            </Box>
            <Box p={2} bgcolor="success.light" borderRadius={2} minWidth={150}>
              <Typography variant="h6" color="white">
                {stats.revenueTotal.toLocaleString()} F
              </Typography>
              <Typography variant="body2" color="white">
                Chiffre d'Affaires
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* 🔍 FILTRES ET RECHERCHE */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" gap={2}>
          <TextField
            variant="outlined"
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ width: 300 }}
          />
          
          <TextField
            select
            variant="outlined"
            size="small"
            label="Statut"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {statusOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </Box>
        
        <Button variant="contained" onClick={() => handleOpen(null)}>
          Nouvelle Commande
        </Button>
      </Box>

      {/* 📊 TABLEAU PRINCIPAL */}
      <DataTable
        value={filteredCommandes}
        paginator
        rows={10}
        loading={loading}
        dataKey="_id"
        emptyMessage="Aucune commande trouvée"
      >
        <Column field="_id" header="ID" sortable style={{ width: '100px' }} />
        <Column field="infoCommande.ville" header="Ville" sortable />
        <Column field="infoCommande.telephone" header="Téléphone" />
        <Column 
          header="Statut" 
          body={statusBodyTemplate} 
          sortable 
          sortField="statusCommande"
        />
        <Column 
          header="Prix Total" 
          body={priceBodyTemplate} 
          sortable 
          sortField="prixTotal"
        />
        <Column 
          header="Date Création" 
          body={dateBodyTemplate} 
          sortable 
          sortField="dateCreation"
        />
        <Column header="Actions" body={actionBodyTemplate} />
      </DataTable>

      {/* 📝 MODAL ÉDITION */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCommande?._id ? "Modifier Commande" : "Nouvelle Commande"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {/* Informations de livraison */}
            <Typography variant="h6" gutterBottom>
              Informations de livraison
            </Typography>
            
            <TextField
              label="Adresse"
              name="infoCommande.addresse"
              fullWidth
              value={formData.infoCommande.addresse}
              onChange={handleChange}
            />
            
            <Box display="flex" gap={2}>
              <TextField
                label="Ville"
                name="infoCommande.ville"
                value={formData.infoCommande.ville}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Code Postal"
                name="infoCommande.codePostal"
                value={formData.infoCommande.codePostal}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>
            
            <Box display="flex" gap={2}>
              <TextField
                label="Téléphone"
                name="infoCommande.telephone"
                value={formData.infoCommande.telephone}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Pays"
                name="infoCommande.pays"
                value={formData.infoCommande.pays}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>

            {/* Informations financières */}
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Informations financières
            </Typography>
            
            <Box display="flex" gap={2}>
              <TextField
                label="Prix Articles"
                name="prixArticles"
                type="number"
                value={formData.prixArticles}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Prix Livraison"
                name="prixLivraison"
                type="number"
                value={formData.prixLivraison}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Prix Total"
                name="prixTotal"
                type="number"
                value={formData.prixTotal}
                onChange={handleChange}
                sx={{ flex: 1 }}
              />
            </Box>

            <TextField
              select
              label="Statut"
              name="statusCommande"
              value={formData.statusCommande}
              onChange={handleChange}
              fullWidth
            >
              {statusOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {selectedCommande?._id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 👁️ MODAL DÉTAIL */}
      <Dialog open={detailModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Détail de la Commande</DialogTitle>
        <DialogContent>
          {selectedCommande && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Informations générales
              </Typography>
              <Typography><strong>ID:</strong> {selectedCommande._id}</Typography>
              <Typography><strong>Statut:</strong> {selectedCommande.statusCommande}</Typography>
              <Typography><strong>Prix Total:</strong> {selectedCommande.prixTotal} F</Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Adresse de livraison
              </Typography>
              <Typography>{selectedCommande.infoCommande.addresse}</Typography>
              <Typography>{selectedCommande.infoCommande.ville}, {selectedCommande.infoCommande.codePostal}</Typography>
              <Typography>{selectedCommande.infoCommande.pays}</Typography>
              <Typography><strong>Tél:</strong> {selectedCommande.infoCommande.telephone}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CommandesComponent;

