import React, { useState } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface IUtilisateur {
  _id?: string;
  nom: string;
  prenom: string;
  datedenaissance: string;
  email: string;
  password?: string;   // ✅ uniformisé
  telephone: string;
  genre: string;
  note?: number;
  photoProfil?: string;
  role: "Client" | "Prestataire" | "Vendeur" | "Freelance"; // ✅ nouveau
}

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const UtilisateurComponent: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<IUtilisateur[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters] = useState<any>({
    global: { value: null, matchMode: 'contains' }
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUtilisateur, setSelectedUtilisateur] = useState<IUtilisateur | null>(null);
const [formData, setFormData] = useState<IUtilisateur>({
  nom: '',
  prenom: '',
  datedenaissance: '',
  email: '',
  password: '',
  telephone: '',
  genre: '',
  note: undefined,
  photoProfil: '',
  role: "Client", // valeur par défaut
});
  const [file, setFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 🔹 Chargement des utilisateurs
  const fetchUtilisateurs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/utilisateur`);
      setUtilisateurs(response.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUtilisateurs();
  }, []);

  const handleOpen = (utilisateur: IUtilisateur | null = null) => {
    setSelectedUtilisateur(utilisateur);
    if (utilisateur) {
      setFormData(utilisateur);
      setFile(null);
    } else {
      setFormData({
        nom: '',
        prenom: '',
        datedenaissance: '',
        email: '',
        password: '',   // ✅ uniformisé
        telephone: '',
        genre: '',
        note: undefined,
        photoProfil: '',
         role: "Client",
      });
      setFile(null);
    }
    setModalOpen(true);
  };

  const handleClose = () => {
    setSelectedUtilisateur(null);
    setFile(null);
    setModalOpen(false);
  };

  const handleDelete = async (utilisateur: IUtilisateur) => {
    if (!utilisateur._id) return;
    if (window.confirm(`Supprimer l'utilisateur ${utilisateur.nom} ${utilisateur.prenom} ?`)) {
      try {
        await axios.delete(`${apiUrl}/utilisateur/${utilisateur._id}`);
        toast.success("Utilisateur supprimé");
        fetchUtilisateurs();
      } catch {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleSave = async () => {
    try {
      const isUpdate = !!selectedUtilisateur?._id;
      const url = isUpdate ? `${apiUrl}/utilisateur/${selectedUtilisateur?._id}` : `${apiUrl}/register`;
      const method = isUpdate ? 'put' : 'post';

      const data = new FormData();
      for (const [key, value] of Object.entries(formData)) {
        if (key === 'password' && !value) continue; // ✅ uniformisé
        if (value !== undefined && value !== null) {
          data.append(key, value.toString());
        }
      }
      if (file) {
        data.append('photoProfil', file);
      }

      await axios({
        method,
        url,
        data,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(isUpdate ? "Utilisateur mis à jour" : "Utilisateur ajouté");
      fetchUtilisateurs();
      handleClose();
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde");
      console.error(error);
    }
  };

  const filteredUtilisateurs = utilisateurs.filter(u =>
    `${u.nom} ${u.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (u.telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const actionBodyTemplate = (rowData: IUtilisateur) => (
    <Box>
      <IconButton color="primary" onClick={() => handleOpen(rowData)}>
        <EditIcon />
      </IconButton>
      <IconButton color="error" onClick={() => handleDelete(rowData)}>
        <DeleteIcon />
      </IconButton>
    </Box>
  );

  const photoBodyTemplate = (rowData: IUtilisateur) =>
    rowData.photoProfil ? (
      <img
        src={rowData.photoProfil}
        alt={`${rowData.nom} ${rowData.prenom}`}
        style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }}
      />
    ) : (
      <span style={{ color: '#999' }}>Aucune</span>
    );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : Number(value)) : value
    }));
  };

  return (
    <Box m={2}>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Gestion des Utilisateurs</Typography>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Recherche..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          }}
          sx={{ width: 300 }}
        />
        <Button variant="contained" onClick={() => handleOpen(null)}>Ajouter Utilisateur</Button>
      </Box>

      <DataTable
        value={filteredUtilisateurs}
        paginator
        rows={10}
        loading={loading}
        dataKey="_id"
        emptyMessage="Aucun utilisateur trouvé"
        filters={filters}
        globalFilterFields={['nom', 'prenom', 'email', 'telephone']}
      >
        <Column field="_id" header="Identifiant" sortable />
        <Column field="nom" header="Nom" sortable />
        <Column field="prenom" header="Prénom" sortable />
        <Column field="role" header="Rôle" sortable />
        <Column field="datedenaissance" header="Date de naissance" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="telephone" header="Téléphone" sortable />
        <Column field="genre" header="Genre" sortable />
        <Column field="note" header="Note" sortable />
        <Column header="Photo" body={photoBodyTemplate} />
        <Column header="Actions" body={actionBodyTemplate} />
      </DataTable>

      <Dialog open={modalOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedUtilisateur?._id ? "Modifier Utilisateur" : "Ajouter Utilisateur"}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Nom"
            name="nom"
            fullWidth
            value={formData.nom}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Prénom"
            name="prenom"
            fullWidth
            value={formData.prenom}
            onChange={handleChange}
          />
            <InputLabel id="role-label">Rôle</InputLabel>
            <Select
              labelId="role-label"
              name="role"
              value={formData.role}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as IUtilisateur['role'] }))}
              fullWidth
            >
              <MenuItem value="Client">Client</MenuItem>
              <MenuItem value="Prestataire">Prestataire</MenuItem>
              <MenuItem value="Vendeur">Vendeur</MenuItem>
              <MenuItem value="Freelance">Freelance</MenuItem>
            </Select>
          <TextField
            margin="dense"
            label="Date de naissance"
            type="date"
            name="datedenaissance"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={formData.datedenaissance}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Email"
            name="email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleChange}
          />
          {!selectedUtilisateur?._id && (
            <TextField
              margin="dense"
              label="Mot de passe"
              name="password"   // ✅ uniformisé
              type="password"
              fullWidth
              value={formData.password || ''}
              onChange={handleChange}
            />
          )}
          <TextField
            margin="dense"
            label="Téléphone"
            name="telephone"
            fullWidth
            value={formData.telephone}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Genre"
            name="genre"
            fullWidth
            value={formData.genre}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            label="Note"
            name="note"
            type="number"
            fullWidth
            value={formData.note ?? ''}
            onChange={handleChange}
          />

          <Box mt={2}>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {selectedUtilisateur?._id ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UtilisateurComponent;
