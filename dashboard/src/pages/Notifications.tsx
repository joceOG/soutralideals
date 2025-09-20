import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem, Chip, Card, CardContent,
  Avatar, Badge, FormControlLabel, Checkbox
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import PushIcon from '@mui/icons-material/PhoneAndroid';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT
interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  photoProfil?: string;
}

interface INotification {
  _id?: string;
  destinataire: IUtilisateur;
  expediteur?: IUtilisateur;
  titre: string;
  message: string;
  type: string;
  sousType?: string;
  referenceId?: string;
  referenceType?: string;
  statut: string;
  priorite: string;
  dateLue?: string;
  dateArchivage?: string;
  envoiEmail: boolean;
  envoiPush: boolean;
  envoiSMS: boolean;
  donnees?: any;
  urlAction?: string;
  dateExpiration?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface INotificationStats {
  statsParStatut: Array<{
    _id: string;
    count: number;
  }>;
  statsParType: Array<{
    _id: string;
    count: number;
  }>;
  total: number;
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const NotificationsComponent: React.FC = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<INotification | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statutFilter, setStatutFilter] = useState<string>('');
  const [stats, setStats] = useState<INotificationStats | null>(null);

  const [formData, setFormData] = useState<Partial<INotification>>({
    titre: '',
    message: '',
    type: 'SYSTEME',
    priorite: 'NORMALE',
    envoiEmail: false,
    envoiPush: true,
    envoiSMS: false
  });

  const [bulkData, setBulkData] = useState({
    destinataires: [] as string[],
    titre: '',
    message: '',
    type: 'SYSTEME',
    priorite: 'NORMALE'
  });

  const typeOptions = [
    'COMMANDE', 'PRESTATION', 'PAIEMENT', 'VERIFICATION', 
    'MESSAGE', 'SYSTEME', 'PROMOTION', 'RAPPEL'
  ];

  const statutOptions = [
    'NON_LUE', 'LUE', 'ARCHIVEE'
  ];

  const prioriteOptions = [
    'BASSE', 'NORMALE', 'HAUTE', 'CRITIQUE'
  ];

  // 🔹 CHARGEMENT DES NOTIFICATIONS
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/notifications`);
      setNotifications(response.data.notifications || response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des notifications");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 CHARGEMENT DES STATISTIQUES
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${apiUrl}/notifications/stats`);
      setStats(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  // 🔹 GESTION DES MODALES
  const handleOpen = (notification: INotification | null = null) => {
    setSelectedNotification(notification);
    if (notification) {
      setFormData(notification);
    } else {
      setFormData({
        titre: '',
        message: '',
        type: 'SYSTEME',
        priorite: 'NORMALE',
        envoiEmail: false,
        envoiPush: true,
        envoiSMS: false
      });
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedNotification(null);
    setModalOpen(false);
    setDetailModalOpen(false);
    setBulkModalOpen(false);
  };

  const handleDetail = (notification: INotification) => {
    setSelectedNotification(notification);
    setDetailModalOpen(true);
  };

  // 🔹 ACTIONS SUR LES NOTIFICATIONS
  const handleMarkAsRead = async (notification: INotification) => {
    if (!notification._id) return;
    try {
      await axios.patch(`${apiUrl}/notification/${notification._id}/read`);
      toast.success("Notification marquée comme lue");
      fetchNotifications();
      fetchStats();
    } catch {
      toast.error("Erreur lors du marquage");
    }
  };

  const handleArchive = async (notification: INotification) => {
    if (!notification._id) return;
    try {
      await axios.patch(`${apiUrl}/notification/${notification._id}/archive`);
      toast.success("Notification archivée");
      fetchNotifications();
      fetchStats();
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleDelete = async (notification: INotification) => {
    if (!notification._id) return;
    if (window.confirm(`Supprimer la notification "${notification.titre}" ?`)) {
      try {
        await axios.delete(`${apiUrl}/notification/${notification._id}`);
        toast.success("Notification supprimée");
        fetchNotifications();
        fetchStats();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  // 🔹 ENVOI EN MASSE
  const handleBulkSend = async () => {
    try {
      await axios.post(`${apiUrl}/notifications/bulk`, bulkData);
      toast.success("Notifications envoyées en masse");
      fetchNotifications();
      fetchStats();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de l'envoi en masse");
      console.error(error);
    }
  };

  // 🔹 FILTRAGE
  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = 
      notif.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notif.destinataire.nom.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || notif.type === typeFilter;
    const matchesStatut = !statutFilter || notif.statut === statutFilter;
    
    return matchesSearch && matchesType && matchesStatut;
  });

  // 🔹 TEMPLATES COLONNES
  const avatarBodyTemplate = (rowData: INotification) => (
    <Box display="flex" alignItems="center" gap={1}>
      <Avatar src={rowData.destinataire.photoProfil} sx={{ width: 32, height: 32 }}>
        {rowData.destinataire.nom.charAt(0)}
      </Avatar>
      <Typography variant="body2">
        {rowData.destinataire.nom} {rowData.destinataire.prenom}
      </Typography>
    </Box>
  );

  const typeBodyTemplate = (rowData: INotification) => {
    const getTypeColor = (type: string) => {
      switch (type) {
        case 'COMMANDE': return 'primary';
        case 'PAIEMENT': return 'success';
        case 'VERIFICATION': return 'warning';
        case 'SYSTEME': return 'info';
        case 'CRITIQUE': return 'error';
        default: return 'default';
      }
    };

    return (
      <Chip 
        label={rowData.type} 
        color={getTypeColor(rowData.type) as any}
        size="small"
      />
    );
  };

  const statutBodyTemplate = (rowData: INotification) => {
    const getStatutColor = (statut: string) => {
      switch (statut) {
        case 'NON_LUE': return 'error';
        case 'LUE': return 'success';
        case 'ARCHIVEE': return 'default';
        default: return 'default';
      }
    };

    return (
      <Chip 
        label={rowData.statut} 
        color={getStatutColor(rowData.statut) as any}
        size="small"
      />
    );
  };

  const prioriteBodyTemplate = (rowData: INotification) => (
    <Box display="flex" alignItems="center" gap={0.5}>
      {rowData.priorite === 'CRITIQUE' && <PriorityHighIcon color="error" fontSize="small" />}
      <Typography variant="body2" color={rowData.priorite === 'CRITIQUE' ? 'error' : 'textPrimary'}>
        {rowData.priorite}
      </Typography>
    </Box>
  );

  const envoiBodyTemplate = (rowData: INotification) => (
    <Box display="flex" gap={0.5}>
      {rowData.envoiEmail && <EmailIcon fontSize="small" color="primary" />}
      {rowData.envoiPush && <PushIcon fontSize="small" color="secondary" />}
      {rowData.envoiSMS && <SmsIcon fontSize="small" color="success" />}
    </Box>
  );

  const dateBodyTemplate = (rowData: INotification) => (
    rowData.createdAt ? new Date(rowData.createdAt).toLocaleDateString('fr-FR') : '-'
  );

  const actionBodyTemplate = (rowData: INotification) => (
    <Box>
      <IconButton color="info" onClick={() => handleDetail(rowData)}>
        <VisibilityIcon />
      </IconButton>
      {rowData.statut === 'NON_LUE' && (
        <IconButton color="primary" onClick={() => handleMarkAsRead(rowData)}>
          <NotificationsIcon />
        </IconButton>
      )}
      <IconButton color="warning" onClick={() => handleArchive(rowData)}>
        <ArchiveIcon />
      </IconButton>
      <IconButton color="error" onClick={() => handleDelete(rowData)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <Box m={2}>
      <ToastContainer />
      
      {/* 📊 HEADER AVEC STATISTIQUES */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Gestion des Notifications
        </Typography>
        
        {stats && (
          <Box display="flex" gap={2} mb={2}>
            <Card sx={{ minWidth: 150 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" color="primary">
                  {stats.total}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Total Notifications
                </Typography>
              </CardContent>
            </Card>
            
            {stats.statsParStatut.map(stat => (
              <Card key={stat._id} sx={{ minWidth: 120 }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="h6" color="secondary">
                    {stat.count}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {stat._id}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* 🔍 FILTRES ET ACTIONS */}
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
            label="Type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {typeOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            variant="outlined"
            size="small"
            label="Statut"
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value)}
            sx={{ width: 150 }}
          >
            <MenuItem value="">Tous</MenuItem>
            {statutOptions.map(option => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </TextField>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button variant="outlined" onClick={() => setBulkModalOpen(true)}>
            Envoi en masse
          </Button>
          <Button variant="contained" onClick={() => handleOpen(null)}>
            Nouvelle Notification
          </Button>
        </Box>
      </Box>

      {/* 📊 TABLEAU PRINCIPAL */}
      <DataTable
        value={filteredNotifications}
        paginator
        rows={15}
        loading={loading}
        dataKey="_id"
        emptyMessage="Aucune notification trouvée"
      >
        <Column 
          header="Destinataire" 
          body={avatarBodyTemplate}
          style={{ width: '200px' }}
        />
        <Column field="titre" header="Titre" sortable style={{ width: '200px' }} />
        <Column field="message" header="Message" style={{ width: '300px' }} />
        <Column 
          header="Type" 
          body={typeBodyTemplate} 
          sortable 
          sortField="type"
          style={{ width: '120px' }}
        />
        <Column 
          header="Statut" 
          body={statutBodyTemplate} 
          sortable 
          sortField="statut"
          style={{ width: '100px' }}
        />
        <Column 
          header="Priorité" 
          body={prioriteBodyTemplate} 
          sortable 
          sortField="priorite"
          style={{ width: '100px' }}
        />
        <Column 
          header="Canaux" 
          body={envoiBodyTemplate}
          style={{ width: '100px' }}
        />
        <Column 
          header="Date" 
          body={dateBodyTemplate} 
          sortable 
          sortField="createdAt"
          style={{ width: '120px' }}
        />
        <Column header="Actions" body={actionBodyTemplate} style={{ width: '150px' }} />
      </DataTable>

      {/* 📝 MODAL CRÉATION/ÉDITION */}
      <Dialog open={modalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedNotification?._id ? "Modifier Notification" : "Nouvelle Notification"}
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Titre"
              name="titre"
              fullWidth
              value={formData.titre || ''}
              onChange={handleChange}
            />
            
            <TextField
              label="Message"
              name="message"
              fullWidth
              multiline
              rows={3}
              value={formData.message || ''}
              onChange={handleChange}
            />
            
            <Box display="flex" gap={2}>
              <TextField
                select
                label="Type"
                name="type"
                value={formData.type || 'SYSTEME'}
                onChange={handleChange}
                sx={{ flex: 1 }}
              >
                {typeOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
              
              <TextField
                select
                label="Priorité"
                name="priorite"
                value={formData.priorite || 'NORMALE'}
                onChange={handleChange}
                sx={{ flex: 1 }}
              >
                {prioriteOptions.map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </TextField>
            </Box>

            <Box display="flex" gap={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="envoiEmail"
                    checked={formData.envoiEmail || false}
                    onChange={(e) => handleChange({
                      target: { name: e.target.name, value: e.target.checked }
                    } as any)}
                  />
                }
                label="Envoi Email"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="envoiPush"
                    checked={formData.envoiPush || false}
                    onChange={(e) => handleChange({
                      target: { name: e.target.name, value: e.target.checked }
                    } as any)}
                  />
                }
                label="Envoi Push"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="envoiSMS"
                    checked={formData.envoiSMS || false}
                    onChange={(e) => handleChange({
                      target: { name: e.target.name, value: e.target.checked }
                    } as any)}
                  />
                }
                label="Envoi SMS"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={() => {}}>
            {selectedNotification?._id ? "Enregistrer" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 👁️ MODAL DÉTAIL */}
      <Dialog open={detailModalOpen} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Détail de la Notification</DialogTitle>
        <DialogContent>
          {selectedNotification && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedNotification.titre}
              </Typography>
              <Typography paragraph>
                {selectedNotification.message}
              </Typography>
              <Typography><strong>Type:</strong> {selectedNotification.type}</Typography>
              <Typography><strong>Statut:</strong> {selectedNotification.statut}</Typography>
              <Typography><strong>Priorité:</strong> {selectedNotification.priorite}</Typography>
              <Typography><strong>Destinataire:</strong> {selectedNotification.destinataire.nom} {selectedNotification.destinataire.prenom}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* 📤 MODAL ENVOI EN MASSE */}
      <Dialog open={bulkModalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Envoi en Masse</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Titre"
              value={bulkData.titre}
              onChange={e => setBulkData(prev => ({ ...prev, titre: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Message"
              value={bulkData.message}
              onChange={e => setBulkData(prev => ({ ...prev, message: e.target.value }))}
              fullWidth
              multiline
              rows={3}
            />
            <TextField
              select
              label="Type"
              value={bulkData.type}
              onChange={e => setBulkData(prev => ({ ...prev, type: e.target.value }))}
              fullWidth
            >
              {typeOptions.map(option => (
                <MenuItem key={option} value={option}>{option}</MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleBulkSend}>
            Envoyer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotificationsComponent;

