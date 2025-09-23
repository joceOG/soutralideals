import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Grid, FormControl, InputLabel, Select, Alert,
  LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PaymentIcon from '@mui/icons-material/Payment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IPaiement {
  _id?: string;
  numeroTransaction: string;
  referenceExterne?: string;
  payeur: string;
  beneficiaire?: string;
  typeObjet: 'COMMANDE' | 'PRESTATION' | 'ABONNEMENT' | 'COMMISSION' | 'REMBOURSEMENT' | 'AUTRE';
  objetId?: string;
  montantOriginal: number;
  montantFrais: number;
  montantNet: number;
  devise: 'XAF' | 'EUR' | 'USD';
  methodePaiement: string;
  statut: 'INITIE' | 'EN_ATTENTE' | 'EN_COURS' | 'VALIDE' | 'ECHEC' | 'ANNULE' | 'REMBOURSE' | 'LITIGE';
  dateInitiation: string;
  dateValidation?: string;
  description: string;
  fournisseurPaiement: string;
  commissionPlateforme: number;
  tauxCommission: number;
  createdAt?: string;
  updatedAt?: string;
}

interface IStatsPaiements {
  totalPaiements: number;
  montantTotal: number;
  paiementsValides: number;
  paiementsEnEchec: number;
  commissionTotale: number;
  statsParMethode: Array<{
    methode: string;
    count: number;
    montant: number;
  }>;
}

const Paiements: React.FC = () => {
  const [paiements, setPaiements] = useState<IPaiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPaiement, setEditingPaiement] = useState<IPaiement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('TOUS');
  const [filterMethode, setFilterMethode] = useState('TOUS');
  const [stats, setStats] = useState<IStatsPaiements | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // ✅ ÉTAT DU FORMULAIRE
  const [formData, setFormData] = useState<Partial<IPaiement>>({
    payeur: '',
    beneficiaire: '',
    typeObjet: 'COMMANDE',
    objetId: '',
    montantOriginal: 0,
    devise: 'XAF',
    methodePaiement: 'MOBILE_MONEY_MTN',
    description: '',
    fournisseurPaiement: 'MTN_MOMO'
  });

  // ✅ CHARGEMENT DES DONNÉES
  useEffect(() => {
    loadPaiements();
    loadStats();
  }, []);

  const loadPaiements = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/paiements');
      setPaiements(response.data.paiements || response.data);
    } catch (error) {
      console.error('Erreur chargement paiements:', error);
      toast.error('Erreur lors du chargement des paiements');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await axios.get('/api/paiements/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // ✅ GESTION DES PAIEMENTS
  const handleCreatePaiement = async () => {
    try {
      await axios.post('/api/paiement', formData);
      toast.success('Paiement créé avec succès');
      setOpenDialog(false);
      resetForm();
      loadPaiements();
      loadStats();
    } catch (error) {
      console.error('Erreur création paiement:', error);
      toast.error('Erreur lors de la création');
    }
  };

  const handleUpdatePaiement = async () => {
    if (!editingPaiement?._id) return;
    
    try {
      await axios.put(`/api/paiement/${editingPaiement._id}`, formData);
      toast.success('Paiement mis à jour');
      setOpenDialog(false);
      resetForm();
      loadPaiements();
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeletePaiement = async (id: string) => {
    if (!window.confirm('Supprimer ce paiement ?')) return;
    
    try {
      await axios.delete(`/api/paiement/${id}`);
      toast.success('Paiement supprimé');
      loadPaiements();
      loadStats();
    } catch (error) {
      console.error('Erreur suppression:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEditPaiement = (paiement: IPaiement) => {
    setEditingPaiement(paiement);
    setFormData(paiement);
    setOpenDialog(true);
  };

  const handleChangeStatut = async (id: string, nouveauStatut: string) => {
    try {
      await axios.patch(`/api/paiement/${id}/statut`, { statut: nouveauStatut });
      toast.success('Statut mis à jour');
      loadPaiements();
    } catch (error) {
      console.error('Erreur changement statut:', error);
      toast.error('Erreur lors du changement de statut');
    }
  };

  const resetForm = () => {
    setFormData({
      payeur: '',
      beneficiaire: '',
      typeObjet: 'COMMANDE',
      objetId: '',
      montantOriginal: 0,
      devise: 'XAF',
      methodePaiement: 'MOBILE_MONEY_MTN',
      description: '',
      fournisseurPaiement: 'MTN_MOMO'
    });
    setEditingPaiement(null);
  };

  // ✅ FILTRAGE ET RECHERCHE
  const filteredPaiements = paiements.filter(paiement => {
    const matchesSearch = paiement.numeroTransaction.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         paiement.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'TOUS' || paiement.statut === filterStatus;
    const matchesMethode = filterMethode === 'TOUS' || paiement.methodePaiement === filterMethode;
    return matchesSearch && matchesStatus && matchesMethode;
  });

  // ✅ RENDU DES COLONNES
  const renderStatus = (statut: string) => {
    const colors = {
      'INITIE': 'default',
      'EN_ATTENTE': 'warning',
      'EN_COURS': 'info',
      'VALIDE': 'success',
      'ECHEC': 'error',
      'ANNULE': 'default',
      'REMBOURSE': 'info',
      'LITIGE': 'error'
    } as const;
    
    return <Chip label={statut} color={colors[statut as keyof typeof colors]} size="small" />;
  };

  const renderMontant = (montant: number, devise: string) => {
    return `${montant.toLocaleString()} ${devise}`;
  };

  const renderMethodePaiement = (methode: string) => {
    const methodes = {
      'CARTE_VISA': 'Visa',
      'CARTE_MASTERCARD': 'Mastercard',
      'MOBILE_MONEY_MTN': 'MTN Mobile Money',
      'MOBILE_MONEY_ORANGE': 'Orange Money',
      'MOBILE_MONEY_MOOV': 'Moov Money',
      'PAYPAL': 'PayPal',
      'VIREMENT_BANCAIRE': 'Virement',
      'ESPECES': 'Espèces',
      'WALLET_PLATEFORME': 'Wallet Plateforme'
    };
    
    return methodes[methode as keyof typeof methodes] || methode;
  };

  const renderActions = (rowData: IPaiement) => (
    <Box>
      <IconButton onClick={() => handleEditPaiement(rowData)} size="small">
        <EditIcon />
      </IconButton>
      <IconButton onClick={() => handleDeletePaiement(rowData._id!)} size="small">
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const renderStatutActions = (rowData: IPaiement) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {rowData.statut === 'EN_ATTENTE' && (
        <Button
          size="small"
          variant="contained"
          color="success"
          onClick={() => handleChangeStatut(rowData._id!, 'VALIDE')}
        >
          Valider
        </Button>
      )}
      {rowData.statut === 'VALIDE' && (
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={() => handleChangeStatut(rowData._id!, 'REMBOURSE')}
        >
          Rembourser
        </Button>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <ToastContainer />
      
      {/* ✅ EN-TÊTE AVEC STATISTIQUES */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentIcon /> Gestion des Paiements
        </Typography>
        
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.totalPaiements}</Typography>
                  <Typography variant="body2">Total Paiements</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{renderMontant(stats.montantTotal, 'XAF')}</Typography>
                  <Typography variant="body2">Montant Total</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.paiementsValides}</Typography>
                  <Typography variant="body2">Validés</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{stats.paiementsEnEchec}</Typography>
                  <Typography variant="body2">Échecs</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
                <CardContent>
                  <Typography variant="h6">{renderMontant(stats.commissionTotale, 'XAF')}</Typography>
                  <Typography variant="body2">Commissions</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* ✅ ONGLETS */}
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Tous les Paiements" />
          <Tab label="En Attente" />
          <Tab label="Validés" />
          <Tab label="Échecs" />
        </Tabs>
      </Box>

      {/* ✅ BARRE D'OUTILS */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Rechercher par numéro ou description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250 }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Statut</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Statut"
          >
            <MenuItem value="TOUS">Tous</MenuItem>
            <MenuItem value="INITIE">Initiés</MenuItem>
            <MenuItem value="EN_ATTENTE">En attente</MenuItem>
            <MenuItem value="EN_COURS">En cours</MenuItem>
            <MenuItem value="VALIDE">Validés</MenuItem>
            <MenuItem value="ECHEC">Échecs</MenuItem>
            <MenuItem value="ANNULE">Annulés</MenuItem>
            <MenuItem value="REMBOURSE">Remboursés</MenuItem>
            <MenuItem value="LITIGE">En litige</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Méthode</InputLabel>
          <Select
            value={filterMethode}
            onChange={(e) => setFilterMethode(e.target.value)}
            label="Méthode"
          >
            <MenuItem value="TOUS">Toutes</MenuItem>
            <MenuItem value="MOBILE_MONEY_MTN">MTN Mobile Money</MenuItem>
            <MenuItem value="MOBILE_MONEY_ORANGE">Orange Money</MenuItem>
            <MenuItem value="CARTE_VISA">Visa</MenuItem>
            <MenuItem value="CARTE_MASTERCARD">Mastercard</MenuItem>
            <MenuItem value="PAYPAL">PayPal</MenuItem>
            <MenuItem value="VIREMENT_BANCAIRE">Virement</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* ✅ TABLEAU DES PAIEMENTS */}
      {loading ? (
        <LinearProgress />
      ) : (
        <DataTable
          value={filteredPaiements}
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage="Aucun paiement trouvé"
        >
          <Column field="numeroTransaction" header="N° Transaction" sortable />
          <Column 
            field="payeur" 
            header="Payeur" 
            body={(rowData) => rowData.payeur || 'N/A'}
          />
          <Column 
            field="montantNet" 
            header="Montant" 
            body={(rowData) => renderMontant(rowData.montantNet, rowData.devise)}
            sortable 
          />
          <Column 
            field="methodePaiement" 
            header="Méthode" 
            body={(rowData) => renderMethodePaiement(rowData.methodePaiement)}
          />
          <Column 
            field="statut" 
            header="Statut" 
            body={(rowData) => renderStatus(rowData.statut)}
          />
          <Column field="dateInitiation" header="Date" sortable />
          <Column 
            field="commissionPlateforme" 
            header="Commission" 
            body={(rowData) => renderMontant(rowData.commissionPlateforme, 'XAF')}
            sortable 
          />
          <Column header="Actions" body={renderActions} />
          <Column header="Gestion" body={renderStatutActions} />
        </DataTable>
      )}

      {/* ✅ DIALOG CRÉATION/ÉDITION */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPaiement ? 'Modifier le Paiement' : 'Nouveau Paiement'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Payeur (ID Utilisateur)"
                value={formData.payeur}
                onChange={(e) => setFormData({...formData, payeur: e.target.value})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Bénéficiaire (ID Utilisateur)"
                value={formData.beneficiaire}
                onChange={(e) => setFormData({...formData, beneficiaire: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type d'objet</InputLabel>
                <Select
                  value={formData.typeObjet}
                  onChange={(e) => setFormData({...formData, typeObjet: e.target.value as any})}
                  label="Type d'objet"
                >
                  <MenuItem value="COMMANDE">Commande</MenuItem>
                  <MenuItem value="PRESTATION">Prestation</MenuItem>
                  <MenuItem value="ABONNEMENT">Abonnement</MenuItem>
                  <MenuItem value="COMMISSION">Commission</MenuItem>
                  <MenuItem value="REMBOURSEMENT">Remboursement</MenuItem>
                  <MenuItem value="AUTRE">Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ID de l'objet"
                value={formData.objetId}
                onChange={(e) => setFormData({...formData, objetId: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Montant"
                type="number"
                value={formData.montantOriginal}
                onChange={(e) => setFormData({...formData, montantOriginal: Number(e.target.value)})}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Devise</InputLabel>
                <Select
                  value={formData.devise}
                  onChange={(e) => setFormData({...formData, devise: e.target.value as any})}
                  label="Devise"
                >
                  <MenuItem value="XAF">Franc CFA</MenuItem>
                  <MenuItem value="EUR">Euro</MenuItem>
                  <MenuItem value="USD">Dollar</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Méthode de paiement</InputLabel>
                <Select
                  value={formData.methodePaiement}
                  onChange={(e) => setFormData({...formData, methodePaiement: e.target.value})}
                  label="Méthode de paiement"
                >
                  <MenuItem value="MOBILE_MONEY_MTN">MTN Mobile Money</MenuItem>
                  <MenuItem value="MOBILE_MONEY_ORANGE">Orange Money</MenuItem>
                  <MenuItem value="MOBILE_MONEY_MOOV">Moov Money</MenuItem>
                  <MenuItem value="CARTE_VISA">Visa</MenuItem>
                  <MenuItem value="CARTE_MASTERCARD">Mastercard</MenuItem>
                  <MenuItem value="PAYPAL">PayPal</MenuItem>
                  <MenuItem value="VIREMENT_BANCAIRE">Virement</MenuItem>
                  <MenuItem value="ESPECES">Espèces</MenuItem>
                  <MenuItem value="WALLET_PLATEFORME">Wallet Plateforme</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Fournisseur</InputLabel>
                <Select
                  value={formData.fournisseurPaiement}
                  onChange={(e) => setFormData({...formData, fournisseurPaiement: e.target.value})}
                  label="Fournisseur"
                >
                  <MenuItem value="MTN_MOMO">MTN Mobile Money</MenuItem>
                  <MenuItem value="ORANGE_MONEY">Orange Money</MenuItem>
                  <MenuItem value="STRIPE">Stripe</MenuItem>
                  <MenuItem value="PAYPAL">PayPal</MenuItem>
                  <MenuItem value="FLUTTERWAVE">Flutterwave</MenuItem>
                  <MenuItem value="PAYSTACK">Paystack</MenuItem>
                  <MenuItem value="INTERNE">Interne</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button 
            onClick={editingPaiement ? handleUpdatePaiement : handleCreatePaiement}
            variant="contained"
          >
            {editingPaiement ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Paiements;
