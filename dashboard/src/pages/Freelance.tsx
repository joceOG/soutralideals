// src/pages/Freelance.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment,
  IconButton, MenuItem
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
}

export interface IService {
  _id: string;
  nomservice: string;
  categorie: {
    _id: string;
    nomcategorie: string;
    groupe: {
      _id: string;
      nomgroupe: string;
    };
  };
}

export interface IFreelanceData {
  _id?: string;
  utilisateur: IUtilisateur;
  
  // ✅ Champs de base (modèle sdealsapp)
  name: string;
  job: string;
  category: string;
  imagePath?: string;
  
  // ✅ Système de notation et performances
  rating: number;
  completedJobs: number;
  isTopRated: boolean;
  isFeatured: boolean;
  isNew: boolean;
  responseTime: number;
  
  // ✅ Compétences et tarification
  skills: string[];
  hourlyRate: number;
  description: string;
  
  // ✅ Informations professionnelles
  experienceLevel: string;
  availabilityStatus: string;
  workingHours: string;
  
  // ✅ Localisation et contact
  location: string;
  phoneNumber?: string;
  
  // ✅ Portfolio et vérification
  portfolioItems?: Array<{
    title: string;
    description: string;
    imageUrl: string;
    projectUrl: string;
  }>;
  
  verificationDocuments: {
  cni1?: string;
  cni2?: string;
  selfie?: string;
    isVerified: boolean;
  };
  
  // ✅ Statistiques business
  totalEarnings: number;
  currentProjects: number;
  clientSatisfaction: number;
  
  // ✅ Préférences
  preferredCategories: string[];
  minimumProjectBudget: number;
  maxProjectsPerMonth: number;
  
  // ✅ Activité et historique
  lastActive: string;
  joinedDate: string;
  profileViews: number;
  
  // ✅ Statut du compte
  accountStatus: string;
  subscriptionType: string;
  
  // ✅ Timestamps
  createdAt?: string;
  updatedAt?: string;
}

const FreelanceComponent: React.FC = () => {
  const [freelances, setFreelances] = useState<IFreelanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFreelance, setSelectedFreelance] = useState<IFreelanceData | null>(null);
  const [formData, setFormData] = useState<IFreelanceData>({
    utilisateur: {} as IUtilisateur,
    
    // ✅ Champs de base (modèle sdealsapp)
    name: '',
    job: '',
    category: '',
    imagePath: '',
    
    // ✅ Système de notation et performances
    rating: 0,
    completedJobs: 0,
    isTopRated: false,
    isFeatured: false,
    isNew: true,
    responseTime: 24,
    
    // ✅ Compétences et tarification
    skills: [],
    hourlyRate: 0,
    description: '',
    
    // ✅ Informations professionnelles
    experienceLevel: 'Débutant',
    availabilityStatus: 'Disponible',
    workingHours: 'Temps partiel',
    
    // ✅ Localisation et contact
    location: '',
    phoneNumber: '',
    
    // ✅ Portfolio et vérification
    portfolioItems: [],
    verificationDocuments: {
      cni1: '',
      cni2: '',
      selfie: '',
      isVerified: false
    },
    
    // ✅ Statistiques business
    totalEarnings: 0,
    currentProjects: 0,
    clientSatisfaction: 0,
    
    // ✅ Préférences
    preferredCategories: [],
    minimumProjectBudget: 0,
    maxProjectsPerMonth: 10,
    
    // ✅ Activité et historique
    lastActive: new Date().toISOString(),
    joinedDate: new Date().toISOString(),
    profileViews: 0,
    
    // ✅ Statut du compte
    accountStatus: 'Pending',
    subscriptionType: 'Free'
  });
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [cni2File, setCni2File] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  const [utilisateurs, setUtilisateurs] = useState<IUtilisateur[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [loadingUtilisateurs, setLoadingUtilisateurs] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL || '';
  const [services, setServices] = useState<IService[]>([]);

  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const fetchFreelances = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/freelance`);
      
      // Vérifier si la réponse est un tableau
      if (Array.isArray(response.data)) {
        setFreelances(response.data);
      } else {
        console.error("Données reçues non valides:", response.data);
        setFreelances([]);
        toast.error("Format de données incorrect reçu du serveur");
      }
    } catch (error) {
      console.error("Erreur API freelance:", error);
      setFreelances([]);
      toast.error("Erreur lors du chargement des freelances");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchFreelances();

    const fetchServices = async () => {
      try {
        const res = await axios.get(`${apiUrl}/service`);
        const filtered = res.data.filter((s: IService) => s.categorie?.groupe?.nomgroupe === 'Métiers');
        setServices(filtered);
      } catch {
        toast.error("Erreur lors du chargement des services");
      }
    };

    fetchServices();
  }, [apiUrl, fetchFreelances]);

  const loadUtilisateurs = async () => {
    try {
      setLoadingUtilisateurs(true);
      const res = await axios.get(`${apiUrl}/utilisateur`);
      setUtilisateurs(res.data);
    } catch {
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoadingUtilisateurs(false);
    }
  };

  const handleOpenUserDialog = () => {
    loadUtilisateurs();
    setUserSearch('');
    setShowUserDialog(true);
  };

  const filteredUtilisateurs = utilisateurs.filter(u => {
    const search = userSearch.toLowerCase();
    return (
      u.nom.toLowerCase().includes(search) ||
      u.prenom.toLowerCase().includes(search) ||
      (u.email?.toLowerCase().includes(search) ?? false)
    );
  });

  const onDelete = async (rowData: IFreelanceData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce freelance ?')) {
      try {
        await axios.delete(`${apiUrl}/freelance/${rowData._id}`);
        setFreelances(freelances.filter(item => item._id !== rowData._id));
        toast.success('Freelance supprimé avec succès !');
      } catch {
        toast.error('Erreur lors de la suppression du freelance.');
      }
    }
  };

  const onEdit = (rowData: IFreelanceData) => {
    setSelectedFreelance(rowData);
    // Pour éviter problème type entre string et string[] dans competences lors édition
    setFormData({
      ...rowData,
      skills: Array.isArray(rowData.skills) ? rowData.skills : [],
    });
    setProfileImageFile(null);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedFreelance(null);
    setFormData({
      utilisateur: {} as IUtilisateur,
      
      // ✅ Champs de base (modèle sdealsapp)
      name: '',
      job: '',
      category: '',
      imagePath: '',
      
      // ✅ Système de notation et performances
      rating: 0,
      completedJobs: 0,
      isTopRated: false,
      isFeatured: false,
      isNew: true,
      responseTime: 24,
      
      // ✅ Compétences et tarification
      skills: [],
      hourlyRate: 0,
      description: '',
      
      // ✅ Informations professionnelles
      experienceLevel: 'Débutant',
      availabilityStatus: 'Disponible',
      workingHours: 'Temps partiel',
      
      // ✅ Localisation et contact
      location: '',
      phoneNumber: '',
      
      // ✅ Portfolio et vérification
      portfolioItems: [],
      verificationDocuments: {
        cni1: '',
        cni2: '',
        selfie: '',
        isVerified: false
      },
      
      // ✅ Statistiques business
      totalEarnings: 0,
      currentProjects: 0,
      clientSatisfaction: 0,
      
      // ✅ Préférences
      preferredCategories: [],
      minimumProjectBudget: 0,
      maxProjectsPerMonth: 10,
      
      // ✅ Activité et historique
      lastActive: new Date().toISOString(),
      joinedDate: new Date().toISOString(),
      profileViews: 0,
      
      // ✅ Statut du compte
      accountStatus: 'Pending',
      subscriptionType: 'Free'
    });
    setProfileImageFile(null);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni' | 'cni2' | 'selfie') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'cni') setCniFile(file);
      else if (type === 'cni2') setCni2File(file);
      else setSelfieFile(file);
    }
  };

  const handleSave = async () => {
    try {
      // ✅ VALIDATION FRONTEND AJOUTÉE
      if (!formData.utilisateur._id) {
        toast.error("Veuillez sélectionner un utilisateur");
        return;
      }
      if (!formData.name.trim()) {
        toast.error("Le nom complet est requis");
        return;
      }
      if (!formData.job.trim()) {
        toast.error("Le métier/titre est requis");
        return;
      }
      if (!formData.category.trim()) {
        toast.error("La catégorie est requise");
        return;
      }
      if (!formData.location.trim()) {
        toast.error("La localisation est requise");
        return;
      }
      if (formData.hourlyRate <= 0) {
        toast.error("Le tarif horaire doit être supérieur à 0");
        return;
      }

      const isUpdate = Boolean(selectedFreelance?._id);
      const url = isUpdate ? `${apiUrl}/freelance/${selectedFreelance?._id}` : `${apiUrl}/freelance`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      form.append('utilisateur', formData.utilisateur._id);
      
      // ✅ Champs du nouveau modèle sdealsapp
      form.append('name', formData.name);
      form.append('job', formData.job);
      form.append('category', formData.category);
      form.append('hourlyRate', formData.hourlyRate.toString());
      form.append('description', formData.description);
      form.append('location', formData.location);
      form.append('phoneNumber', formData.phoneNumber || '');
      form.append('experienceLevel', formData.experienceLevel);
      form.append('availabilityStatus', formData.availabilityStatus);
      form.append('workingHours', formData.workingHours);
      form.append('skills', JSON.stringify(formData.skills));
      form.append('preferredCategories', JSON.stringify(formData.preferredCategories));
      form.append('minimumProjectBudget', formData.minimumProjectBudget.toString());
      form.append('maxProjectsPerMonth', formData.maxProjectsPerMonth.toString());
      form.append('portfolioItems', JSON.stringify(formData.portfolioItems || []));
      
      // ✅ Statistiques (optionnelles pour la création)
      form.append('rating', formData.rating.toString());
      form.append('completedJobs', formData.completedJobs.toString());
      form.append('isTopRated', formData.isTopRated ? 'true' : 'false');
      form.append('isFeatured', formData.isFeatured ? 'true' : 'false');
      form.append('responseTime', formData.responseTime.toString());
      form.append('accountStatus', formData.accountStatus);
      form.append('subscriptionType', formData.subscriptionType);

      // ✅ Upload de tous les fichiers (incluant photo profil)
      if (profileImageFile) form.append('profileImage', profileImageFile);
      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);

      console.log("Formulaire Freelance:", formData.name, formData.job, formData.category);

      await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchFreelances();

      toast.success(isUpdate ? 'Freelance mis à jour avec succès !' : 'Nouveau freelance ajouté avec succès !');
      setModalOpen(false);
    } catch {
      toast.error('Erreur lors de la sauvegarde du freelance.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageClick = (url: string) => setZoomImage(url);

  const imageTemplate = (field: 'cni1' | 'cni2' | 'selfie') => (rowData: IFreelanceData) => {
    const imageUrl = rowData.verificationDocuments?.[field];
    return imageUrl ? (
      <img
        src={imageUrl}
        alt={field}
        width={60}
        height={60}
        style={{ objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }}
        onClick={() => handleImageClick(imageUrl)}
      />
    ) : <span style={{ color: '#888' }}>Aucune</span>;
  };

  const rowIndexTemplate = (rowData: IFreelanceData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IFreelanceData) => `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

  const actionTemplate = (rowData: IFreelanceData) => (
    <>
      <IconButton color="error" onClick={() => onDelete(rowData)}><DeleteIcon /></IconButton>
      <IconButton color="primary" onClick={() => onEdit(rowData)}><EditIcon /></IconButton>
    </>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Freelances</Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable
          value={freelances}
          paginator
          showGridlines
          rows={10}
          loading={loading}
          dataKey="_id"
          filters={filters}
          globalFilterFields={['localisation', 'note', 'titreprofessionnel', 'categorieprincipale']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h5>Gestion des Freelances</h5>
            <Button variant="contained" onClick={onAdd}>Ajouter</Button>
          </div>}
          emptyMessage="Aucun freelance trouvé"
          onFilter={(e) => setFilters(e.filters)}
        >
          <Column header="#" body={rowIndexTemplate} />
          <Column header="Photo" body={(rowData) => (
            rowData.imagePath ? (
              <img src={rowData.imagePath} alt="Profile" width={50} height={50} 
                   style={{borderRadius: '50%', objectFit: 'cover'}} />
            ) : (
              <div style={{width: 50, height: 50, borderRadius: '50%', backgroundColor: '#f0f0f0', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                👤
              </div>
            )
          )} />
          <Column header="Nom" field="name" sortable />
          <Column header="Métier" field="job" sortable />
          <Column header="Catégorie" field="category" sortable />
          <Column header="Note" body={(rowData) => (
            <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
              <span>⭐ {rowData.rating?.toFixed(1) || '0.0'}</span>
              {rowData.isTopRated && <span style={{color: 'gold'}}>👑</span>}
              {rowData.isFeatured && <span style={{color: 'purple'}}>⭐</span>}
            </div>
          )} sortable />
          <Column header="Projets" field="completedJobs" sortable />
          <Column header="Tarif/h" body={(rowData) => `${rowData.hourlyRate || 0} FCFA`} sortable />
          <Column header="Niveau" field="experienceLevel" sortable />
          <Column header="Statut" body={(rowData) => (
            <span style={{
              padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
              backgroundColor: rowData.availabilityStatus === 'Disponible' ? '#e8f5e8' : '#ffe8e8',
              color: rowData.availabilityStatus === 'Disponible' ? '#2e7d32' : '#d32f2f'
            }}>
              {rowData.availabilityStatus || 'Non défini'}
            </span>
          )} />
          <Column header="Compétences" body={(rowData) => (
            <div style={{display: 'flex', gap: 4, flexWrap: 'wrap'}}>
              {rowData.skills?.slice(0, 3).map((skill: string, idx: number) => (
                <span key={idx} style={{
                  padding: '2px 6px', borderRadius: '8px', fontSize: '11px',
                  backgroundColor: '#e3f2fd', color: '#1976d2'
                }}>
                  {skill}
                </span>
              ))}
              {rowData.skills?.length > 3 && <span>+{rowData.skills.length - 3}</span>}
            </div>
          )} />
          <Column header="Localisation" field="location" sortable />
          <Column header="Vérification" body={(rowData) => (
            <div style={{display: 'flex', gap: 4}}>
              {rowData.verificationDocuments?.cni1 && <span title="CNI 1">🆔</span>}
              {rowData.verificationDocuments?.cni2 && <span title="CNI 2">🆔</span>}
              {rowData.verificationDocuments?.selfie && <span title="Selfie">🤳</span>}
              {rowData.verificationDocuments?.isVerified && <span title="Vérifié">✅</span>}
            </div>
          )} />
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedFreelance ? 'Modifier le Freelance' : 'Ajouter un Nouveau Freelance'}</DialogTitle>
        <DialogContent>

          <TextField
            margin="normal"
            fullWidth
            label="Utilisateur"
            value={formData.utilisateur?._id || ''}
            InputProps={{
              readOnly: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleOpenUserDialog}><SearchIcon /></IconButton>
                </InputAdornment>
              )
            }}
          />


          {/* Champs supplémentaires */}
          <TextField margin="normal" fullWidth label="Nom complet" name="name" value={formData.name} onChange={handleChange} required />
          <TextField margin="normal" fullWidth label="Métier/Titre" name="job" value={formData.job} onChange={handleChange} required />
          <TextField margin="normal" fullWidth label="Catégorie" name="category" value={formData.category} onChange={handleChange} required />

          <Autocomplete
            multiple
            freeSolo
            options={[]} // tu peux mettre une liste d'options prédéfinies ici
            value={formData.skills || []}
            onChange={(_, newValue) => setFormData(prev => ({ ...prev, skills: newValue }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Compétences" placeholder="Ajouter une compétence" margin="normal" fullWidth />
            )}
          />

          <TextField margin="normal" fullWidth label="Tarif horaire (FCFA)" name="hourlyRate" type="number" value={formData.hourlyRate} onChange={handleChange} required />
          <TextField margin="normal" fullWidth label="Téléphone" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} />

          <TextField margin="normal" fullWidth label="Localisation" name="location" value={formData.location} onChange={handleChange} required />
          
          {/* ✅ CHAMPS MANQUANTS AJOUTÉS */}
          <TextField
            select
            margin="normal"
            fullWidth
            label="Niveau d'Expérience"
            name="experienceLevel"
            value={formData.experienceLevel}
            onChange={handleChange}
          >
            <MenuItem value="Débutant">Débutant</MenuItem>
            <MenuItem value="Intermédiaire">Intermédiaire</MenuItem>
            <MenuItem value="Expert">Expert</MenuItem>
          </TextField>
          
          <TextField
            select
            margin="normal"
            fullWidth
            label="Statut de Disponibilité"
            name="availabilityStatus"
            value={formData.availabilityStatus}
            onChange={handleChange}
          >
            <MenuItem value="Disponible">Disponible</MenuItem>
            <MenuItem value="Occupé">Occupé</MenuItem>
            <MenuItem value="En pause">En pause</MenuItem>
          </TextField>
          
          <TextField
            select
            margin="normal"
            fullWidth
            label="Type de Travail"
            name="workingHours"
            value={formData.workingHours}
            onChange={handleChange}
          >
            <MenuItem value="Temps plein">Temps plein</MenuItem>
            <MenuItem value="Temps partiel">Temps partiel</MenuItem>
            <MenuItem value="Ponctuel">Ponctuel</MenuItem>
          </TextField>
          <TextField margin="normal" fullWidth multiline rows={3} label="Description du profil" name="description" value={formData.description} onChange={handleChange} />
          <TextField margin="normal" fullWidth label="Budget minimum projet (FCFA)" name="minimumProjectBudget" type="number" value={formData.minimumProjectBudget} onChange={handleChange} />

          {/* ✅ UPLOAD PHOTO DE PROFIL (AJOUTÉ) */}
          <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px dashed #ddd', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📸 Photo de Profil
            </Typography>
            <input type="file" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setProfileImageFile(e.target.files[0]);
              }
            }} accept="image/*" />
            {formData.imagePath && (
              <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="textSecondary">Photo actuelle :</Typography>
                <img src={formData.imagePath} alt="Profile" width={50} height={50} 
                     style={{borderRadius: '50%', objectFit: 'cover'}} />
              </Box>
            )}
          </Box>

          {/* ✅ DOCUMENTS DE VÉRIFICATION (AMÉLIORÉS) */}
          <Box sx={{ mt: 2, mb: 2, p: 2, border: '1px dashed #ddd', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              🆔 Documents de Vérification
            </Typography>
            
            <Box sx={{ mt: 1, mb: 1 }}>
              <Typography>CNI 1 (Recto)</Typography>
              <input type="file" onChange={(e) => handleFileChange(e, 'cni')} accept="image/*" />
              {formData.verificationDocuments?.cni1 && (
                <img src={formData.verificationDocuments.cni1} alt="CNI 1" width={40} height={40} 
                     style={{marginLeft: 8, objectFit: 'cover', borderRadius: 4}} />
              )}
            </Box>
            
            <Box sx={{ mt: 1, mb: 1 }}>
              <Typography>CNI 2 (Verso)</Typography>
              <input type="file" onChange={(e) => handleFileChange(e, 'cni2')} accept="image/*" />
              {formData.verificationDocuments?.cni2 && (
                <img src={formData.verificationDocuments.cni2} alt="CNI 2" width={40} height={40} 
                     style={{marginLeft: 8, objectFit: 'cover', borderRadius: 4}} />
              )}
            </Box>
            
            <Box sx={{ mt: 1, mb: 1 }}>
              <Typography>Selfie avec CNI</Typography>
              <input type="file" onChange={(e) => handleFileChange(e, 'selfie')} accept="image/*" />
              {formData.verificationDocuments?.selfie && (
                <img src={formData.verificationDocuments.selfie} alt="Selfie" width={40} height={40} 
                     style={{marginLeft: 8, objectFit: 'cover', borderRadius: 4}} />
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 2 }}>
            <label>
              <input type="checkbox" name="isVerified" checked={formData.verificationDocuments?.isVerified} onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                verificationDocuments: { 
                  ...prev.verificationDocuments, 
                  isVerified: e.target.checked 
                }
              }))} /> Documents vérifiés
            </label>
          </Box>

          {/* ✅ Contrôles additionnels sdealsapp */}
          <Box sx={{ mt: 2 }}>
            <label>
              <input type="checkbox" name="isTopRated" checked={formData.isTopRated} onChange={handleChange} /> Top Rated (👑)
            </label>
          </Box>

          <Box sx={{ mt: 1 }}>
            <label>
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} /> Featured (⭐)
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave}>{selectedFreelance ? 'Enregistrer' : 'Ajouter'}</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de sélection utilisateur */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sélectionner un utilisateur</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Rechercher"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <DataTable
            value={filteredUtilisateurs}
            paginator
            rows={5}
            loading={loadingUtilisateurs}
            selectionMode="single"
            onRowClick={(e) => {
              const utilisateur = e.data as IUtilisateur;
              setFormData(prev => ({ ...prev, utilisateur }));
              setShowUserDialog(false);
              toast.success(`Utilisateur sélectionné : ${utilisateur.nom} ${utilisateur.prenom}`);
            }}
            dataKey="_id"
          >
            <Column field="nom" header="Nom" />
            <Column field="prenom" header="Prénom" />
            <Column field="email" header="Email" />
            <Column field="telephone" header="Téléphone" />
          </DataTable>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowUserDialog(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog zoom image */}
      <Dialog open={!!zoomImage} onClose={() => setZoomImage(null)} maxWidth="md">
        <DialogTitle>Image</DialogTitle>
        <DialogContent>
          {zoomImage && (
            <img
              src={zoomImage}
              alt="document"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setZoomImage(null)} color="primary">Fermer</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FreelanceComponent;
