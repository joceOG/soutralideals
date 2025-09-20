import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, TextField, InputAdornment, IconButton,
  MenuItem, Grid, Card, CardContent, Chip, Avatar, Tabs, Tab,
  Stepper, Step, StepLabel, FormControlLabel, Checkbox,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import StorefrontIcon from '@mui/icons-material/Storefront';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BusinessIcon from '@mui/icons-material/Business';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PaymentIcon from '@mui/icons-material/Payment';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import { DataTable, DataTableFilterMeta } from 'primereact/datatable';
import { Column, ColumnBodyOptions } from 'primereact/column';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ✅ INTERFACES TYPESCRIPT MODERNISÉES (sdealsapp standard)
export interface IUtilisateur {
  _id: string;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  photoProfil?: string;
}

export interface IVendeurData {
  _id?: string;
  utilisateur: IUtilisateur;
  
  // 🏪 Informations boutique (sdealsapp)
  shopName: string;
  shopDescription: string;
  shopLogo?: string;
  businessType: string;
  businessCategories: string[];
  
  // ⭐ Système de notation
  rating: number;
  completedOrders: number;
  isTopRated: boolean;
  isFeatured: boolean;
  isNew: boolean;
  responseTime: number;
  
  // 💰 Statistiques business
  totalEarnings: number;
  totalSales: number;
  currentOrders: number;
  customerSatisfaction: number;
  returnRate: number;
  
  // 🚚 Livraison & logistique
  deliveryZones: string[];
  shippingMethods: string[];
  deliveryTimes: {
    standard: string;
    express: string;
  };
  
  // 💳 Paiements & commission
  paymentMethods: string[];
  commissionRate: number;
  payoutFrequency: string;
  
  // 📦 Produits & inventaire
  productCategories: string[];
  totalProducts: number;
  activeProducts: number;
  averageProductPrice: number;
  
  // 🏢 Informations légales
  businessRegistrationNumber?: string;
  businessAddress: {
    street?: string;
    city: string;
    postalCode?: string;
    country: string;
  };
  businessPhone?: string;
  businessEmail?: string;
  
  // 📊 Politiques
  returnPolicy: string;
  warrantyInfo?: string;
  minimumOrderAmount: number;
  maxOrdersPerDay: number;
  
  // 🔐 Vérification
  verificationLevel: string;
  verificationDocuments: {
    cni1?: string;
    cni2?: string;
    selfie?: string;
    businessLicense?: string;
    taxDocument?: string;
    isVerified: boolean;
  };
  identityVerified: boolean;
  businessVerified: boolean;
  
  // 📈 Activité & performance
  lastActive: string;
  joinedDate: string;
  profileViews: number;
  conversionRate: number;
  
  // ⚙️ Statut compte
  accountStatus: string;
  subscriptionType: string;
  premiumFeatures: string[];
  
  // 🌐 Réseaux sociaux & marketing
  socialMedia: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    website?: string;
  };
  
  preferredContactMethod: string;
  tags: string[];
  notes?: string;
  
  // ✅ Timestamps
  createdAt?: string;
  updatedAt?: string;
}

const VendeurComponent: React.FC = () => {
  const [vendeurs, setVendeurs] = useState<IVendeurData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<DataTableFilterMeta>({ global: { value: null, matchMode: 'contains' } });
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedVendeur, setSelectedVendeur] = useState<IVendeurData | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [tabValue, setTabValue] = useState(0);

  // ✅ ÉTAT FORMULAIRE MODERNE (sdealsapp)
  const [formData, setFormData] = useState<IVendeurData>({
    utilisateur: {} as IUtilisateur,
    
    // 🏪 Informations boutique
    shopName: '',
    shopDescription: '',
    shopLogo: '',
    businessType: 'Particulier',
    businessCategories: [],
    
    // ⭐ Système de notation (initialisé)
    rating: 0,
    completedOrders: 0,
    isTopRated: false,
    isFeatured: false,
    isNew: true,
    responseTime: 24,
    
    // 💰 Statistiques business (initialisées)
    totalEarnings: 0,
    totalSales: 0,
    currentOrders: 0,
    customerSatisfaction: 0,
    returnRate: 0,
    
    // 🚚 Livraison & logistique
    deliveryZones: [],
    shippingMethods: ['Standard'],
    deliveryTimes: {
      standard: '3-5 jours',
      express: '1-2 jours'
    },
    
    // 💳 Paiements
    paymentMethods: ['Mobile Money'],
    commissionRate: 5,
    payoutFrequency: 'Mensuelle',
    
    // 📦 Produits
    productCategories: [],
    totalProducts: 0,
    activeProducts: 0,
    averageProductPrice: 0,
    
    // 🏢 Informations légales
    businessRegistrationNumber: '',
    businessAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Cameroun'
    },
    businessPhone: '',
    businessEmail: '',
    
    // 📊 Politiques
    returnPolicy: 'Retour accepté sous 14 jours',
    warrantyInfo: '',
    minimumOrderAmount: 0,
    maxOrdersPerDay: 50,
    
    // 🔐 Vérification
    verificationLevel: 'Basic',
    verificationDocuments: {
      cni1: '',
      cni2: '',
      selfie: '',
      businessLicense: '',
      taxDocument: '',
      isVerified: false
    },
    identityVerified: false,
    businessVerified: false,
    
    // 📈 Activité
    lastActive: new Date().toISOString(),
    joinedDate: new Date().toISOString(),
    profileViews: 0,
    conversionRate: 0,
    
    // ⚙️ Statut compte
    accountStatus: 'Pending',
    subscriptionType: 'Free',
    premiumFeatures: [],
    
    // 🌐 Réseaux sociaux
    socialMedia: {
      facebook: '',
      instagram: '',
      whatsapp: '',
      website: ''
    },
    
    preferredContactMethod: 'Email',
    tags: [],
    notes: ''
  });

  // ✅ GESTION FICHIERS MODERNE
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null);
  const [cniFile, setCniFile] = useState<File | null>(null);
  const [cni2File, setCni2File] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [businessLicenseFile, setBusinessLicenseFile] = useState<File | null>(null);
  const [taxDocumentFile, setTaxDocumentFile] = useState<File | null>(null);

  const [utilisateurs, setUtilisateurs] = useState<IUtilisateur[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [loadingUtilisateurs, setLoadingUtilisateurs] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  // ✅ CONSTANTES SDEALSAPP
  const businessTypes = ['Particulier', 'Entreprise', 'Auto-entrepreneur'];
  const businessCategories = [
    'Mode', 'Électronique', 'Beauté', 'Maison', 'Informatique', 
    'Sports & Loisirs', 'Santé', 'Alimentation', 'Artisanat', 
    'Livres', 'Jouets', 'Animaux', 'Automobile'
  ];
  const shippingMethodOptions = ['Standard', 'Express', 'Same-Day', 'Pickup'];
  const paymentMethodOptions = ['Mobile Money', 'Carte Bancaire', 'Virement', 'Espèces'];
  const payoutFrequencyOptions = ['Hebdomadaire', 'Mensuelle'];
  const contactMethodOptions = ['Email', 'Phone', 'WhatsApp'];
  const accountStatusOptions = ['Active', 'Suspended', 'Pending', 'Banned'];
  const subscriptionTypeOptions = ['Free', 'Premium', 'Pro'];
  const verificationLevelOptions = ['Basic', 'Verified', 'Premium'];

  const formSteps = [
    'Informations de base',
    'Boutique & Produits', 
    'Livraison & Paiement',
    'Vérification & Documents'
  ];

  // useCallback pour stabiliser la fonction et éviter warning react-hooks/exhaustive-deps
  const fetchVendeurs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/vendeur`);
      setVendeurs(response.data);
    } catch {
      toast.error("Erreur lors du chargement des vendeurs");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchVendeurs();
  }, [apiUrl, fetchVendeurs]);

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

  const onDelete = async (rowData: IVendeurData) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce vendeur ?')) {
      try {
        await axios.delete(`${apiUrl}/vendeur/${rowData._id}`);
        setVendeurs(vendeurs.filter(item => item._id !== rowData._id));
        toast.success('Vendeur supprimé avec succès !');
      } catch {
        toast.error('Erreur lors de la suppression du vendeur.');
      }
    }
  };

  const onEdit = (rowData: IVendeurData) => {
    setSelectedVendeur(rowData);
    setFormData(rowData);
    // ✅ RÉINITIALISER TOUS LES FICHIERS
    setShopLogoFile(null);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setBusinessLicenseFile(null);
    setTaxDocumentFile(null);
    setModalOpen(true);
  };

  const onAdd = () => {
    setSelectedVendeur(null);
    setFormData({
      utilisateur: {} as IUtilisateur,
      
      // 🏪 Informations boutique
      shopName: '',
      shopDescription: '',
      shopLogo: '',
      businessType: 'Particulier',
      businessCategories: [],
      
      // ⭐ Système de notation (initialisé)
      rating: 0,
      completedOrders: 0,
      isTopRated: false,
      isFeatured: false,
      isNew: true,
      responseTime: 24,
      
      // 💰 Statistiques business (initialisées)
      totalEarnings: 0,
      totalSales: 0,
      currentOrders: 0,
      customerSatisfaction: 0,
      returnRate: 0,
      
      // 🚚 Livraison & logistique
      deliveryZones: [],
      shippingMethods: ['Standard'],
      deliveryTimes: {
        standard: '3-5 jours',
        express: '1-2 jours'
      },
      
      // 💳 Paiements
      paymentMethods: ['Mobile Money'],
      commissionRate: 5,
      payoutFrequency: 'Mensuelle',
      
      // 📦 Produits
      productCategories: [],
      totalProducts: 0,
      activeProducts: 0,
      averageProductPrice: 0,
      
      // 🏢 Informations légales
      businessRegistrationNumber: '',
      businessAddress: {
        street: '',
        city: '',
        postalCode: '',
        country: 'Cameroun'
      },
      businessPhone: '',
      businessEmail: '',
      
      // 📊 Politiques
      returnPolicy: 'Retour accepté sous 14 jours',
      warrantyInfo: '',
      minimumOrderAmount: 0,
      maxOrdersPerDay: 50,
      
      // 🔐 Vérification
      verificationLevel: 'Basic',
      verificationDocuments: {
        cni1: '',
        cni2: '',
        selfie: '',
        businessLicense: '',
        taxDocument: '',
        isVerified: false
      },
      identityVerified: false,
      businessVerified: false,
      
      // 📈 Activité
      lastActive: new Date().toISOString(),
      joinedDate: new Date().toISOString(),
      profileViews: 0,
      conversionRate: 0,
      
      // ⚙️ Statut compte
      accountStatus: 'Pending',
      subscriptionType: 'Free',
      premiumFeatures: [],
      
      // 🌐 Réseaux sociaux
      socialMedia: {
        facebook: '',
        instagram: '',
        whatsapp: '',
        website: ''
      },
      
      preferredContactMethod: 'Email',
      tags: [],
      notes: ''
    });
    // ✅ RÉINITIALISER TOUS LES FICHIERS
    setShopLogoFile(null);
    setCniFile(null);
    setCni2File(null);
    setSelfieFile(null);
    setBusinessLicenseFile(null);
    setTaxDocumentFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cni' | 'cni2' | 'selfie' | 'shopLogo' | 'businessLicense' | 'taxDocument') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      switch (type) {
        case 'cni': setCniFile(file); break;
        case 'cni2': setCni2File(file); break;
        case 'selfie': setSelfieFile(file); break;
        case 'shopLogo': setShopLogoFile(file); break;
        case 'businessLicense': setBusinessLicenseFile(file); break;
        case 'taxDocument': setTaxDocumentFile(file); break;
      }
    }
  };

  const handleSave = async () => {
    // ✅ VALIDATION MODERNE
    if (!formData.utilisateur || !formData.utilisateur._id) {
      toast.error("Veuillez sélectionner un utilisateur avant de sauvegarder.");
      return;
    }
    if (!formData.shopName.trim()) {
      toast.error("Le nom de la boutique est requis.");
      return;
    }
    if (!formData.shopDescription.trim()) {
      toast.error("La description de la boutique est requise.");
      return;
    }
    if (!formData.businessType) {
      toast.error("Le type de business est requis.");
      return;
    }
    if (formData.businessCategories.length === 0) {
      toast.error("Au moins une catégorie de produit est requise.");
      return;
    }

    try {
      const isUpdate = Boolean(selectedVendeur?._id);
      const url = isUpdate ? `${apiUrl}/vendeur/${selectedVendeur?._id}` : `${apiUrl}/vendeur`;
      const method = isUpdate ? 'put' : 'post';

      const form = new FormData();
      
      // ✅ CHAMPS OBLIGATOIRES
      form.append('utilisateur', formData.utilisateur._id);
      form.append('shopName', formData.shopName);
      form.append('shopDescription', formData.shopDescription);
      form.append('businessType', formData.businessType);
      
      // ✅ CHAMPS ARRAYS (JSON stringify)
      form.append('businessCategories', JSON.stringify(formData.businessCategories));
      form.append('deliveryZones', JSON.stringify(formData.deliveryZones));
      form.append('shippingMethods', JSON.stringify(formData.shippingMethods));
      form.append('paymentMethods', JSON.stringify(formData.paymentMethods));
      form.append('productCategories', JSON.stringify(formData.productCategories));
      form.append('tags', JSON.stringify(formData.tags));
      
      // ✅ CHAMPS OBJETS (JSON stringify)
      form.append('businessAddress', JSON.stringify(formData.businessAddress));
      form.append('socialMedia', JSON.stringify(formData.socialMedia));
      
      // ✅ CHAMPS SIMPLES
      form.append('businessPhone', formData.businessPhone || '');
      form.append('businessEmail', formData.businessEmail || '');
      form.append('businessRegistrationNumber', formData.businessRegistrationNumber || '');
      form.append('returnPolicy', formData.returnPolicy);
      form.append('warrantyInfo', formData.warrantyInfo || '');
      form.append('minimumOrderAmount', formData.minimumOrderAmount.toString());
      form.append('maxOrdersPerDay', formData.maxOrdersPerDay.toString());
      form.append('commissionRate', formData.commissionRate.toString());
      form.append('payoutFrequency', formData.payoutFrequency);
      form.append('preferredContactMethod', formData.preferredContactMethod);
      form.append('notes', formData.notes || '');
      
      // ✅ UPLOAD FICHIERS MODERNISÉ
      if (shopLogoFile) form.append('shopLogo', shopLogoFile);
      if (cniFile) form.append('cni1', cniFile);
      if (cni2File) form.append('cni2', cni2File);
      if (selfieFile) form.append('selfie', selfieFile);
      if (businessLicenseFile) form.append('businessLicense', businessLicenseFile);
      if (taxDocumentFile) form.append('taxDocument', taxDocumentFile);

      const response = await axios({ method, url, data: form, headers: { 'Content-Type': 'multipart/form-data' } });
      console.log('Réponse après ajout/modif:', response.data);

      await fetchVendeurs();
      toast.success(isUpdate ? 'Vendeur mis à jour avec succès !' : 'Nouveau vendeur ajouté avec succès !');
      setModalOpen(false);
    } catch (error: any) {
      console.error(error.response?.data || error);
      toast.error('Erreur lors de la sauvegarde du vendeur.');
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleImageClick = (url: string) => {
    setZoomImage(url);
  };

  const imageTemplate = (field: 'cni1' | 'cni2' | 'selfie' | 'businessLicense' | 'taxDocument') => (rowData: IVendeurData) => {
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
    ) : (
      <span style={{ color: '#888' }}>Aucune</span>
    );
  };

  const rowIndexTemplate = (rowData: IVendeurData, options: ColumnBodyOptions) => options.rowIndex + 1;

  const utilisateurNameTemplate = (rowData: IVendeurData) => `${rowData.utilisateur?.nom || ''} ${rowData.utilisateur?.prenom || ''}`;

  const actionTemplate = (rowData: IVendeurData) => (
    <>
      <IconButton color="error" onClick={() => onDelete(rowData)}><DeleteIcon /></IconButton>
      <IconButton color="primary" onClick={() => onEdit(rowData)}><EditIcon /></IconButton>
    </>
  );

  return (
    <div>
      <ToastContainer />
      <Typography variant="h4" gutterBottom>Vendeurs</Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <DataTable
          value={vendeurs}
          paginator
          showGridlines
          rows={10}
          loading={loading}
          dataKey="_id"
          filters={filters}
          globalFilterFields={['shopName', 'shopDescription', 'businessType', 'notes']}
          header={<div style={{ display: 'flex', justifyContent: 'space-between' }}><h5>Gestion des Vendeurs</h5><Button variant="contained" onClick={onAdd}>Ajouter</Button></div>}
          emptyMessage="Aucun vendeur trouvé"
          onFilter={(e) => setFilters(e.filters)}
        >
          <Column header="#" body={rowIndexTemplate} />
          
          <Column header="Boutique" body={(rowData) => (
            <Box display="flex" alignItems="center" gap={1}>
              {rowData.shopLogo && (
                <Avatar src={rowData.shopLogo} sx={{ width: 40, height: 40 }}>
                  <StorefrontIcon />
                </Avatar>
              )}
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {rowData.shopName || 'Boutique sans nom'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {rowData.businessType}
                </Typography>
              </Box>
            </Box>
          )} sortable />
          
          <Column header="Propriétaire" body={utilisateurNameTemplate} sortable />
          
          <Column header="Catégories" body={(rowData) => (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {rowData.businessCategories?.slice(0, 2).map((cat: string, idx: number) => (
                <Chip key={idx} label={cat} size="small" variant="outlined" />
              ))}
              {rowData.businessCategories?.length > 2 && (
                <Chip label={`+${rowData.businessCategories.length - 2}`} size="small" />
              )}
            </Box>
          )} />
          
          <Column header="Localisation" body={(rowData) => (
            <Typography variant="body2">
              {rowData.businessAddress?.city || rowData.deliveryZones?.[0] || 'Non défini'}
            </Typography>
          )} sortable />
          
          <Column header="Rating" body={(rowData) => (
            <Box display="flex" alignItems="center" gap={0.5}>
              <StarIcon color={rowData.rating >= 4 ? 'warning' : 'disabled'} fontSize="small" />
              <Typography variant="body2">
                {rowData.rating?.toFixed(1) || '0.0'}
              </Typography>
              {rowData.isTopRated && <Chip label="👑" size="small" />}
              {rowData.isFeatured && <Chip label="⭐" size="small" />}
            </Box>
          )} sortable />
          
          <Column header="Commandes" body={(rowData) => (
            <Typography variant="body2" fontWeight="bold">
              {rowData.completedOrders || 0}
            </Typography>
          )} sortable />
          
          <Column header="Statut" body={(rowData) => (
            <Chip 
              label={rowData.accountStatus} 
              color={
                rowData.accountStatus === 'Active' ? 'success' :
                rowData.accountStatus === 'Pending' ? 'warning' :
                rowData.accountStatus === 'Suspended' ? 'error' : 'default'
              }
              size="small" 
            />
          )} sortable />
          
          <Column header="Vérification" body={(rowData) => (
            <Box display="flex" gap={0.5}>
              {rowData.verificationDocuments?.cni1 && <Chip label="🆔" size="small" />}
              {rowData.verificationDocuments?.businessLicense && <Chip label="📄" size="small" />}
              {rowData.verificationDocuments?.isVerified && <VerifiedIcon color="success" fontSize="small" />}
            </Box>
          )} />
          
          <Column header="Actions" body={actionTemplate} />
        </DataTable>
      </Box>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedVendeur ? 'Modifier le Vendeur' : 'Ajouter un Nouveau Vendeur'}</DialogTitle>
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

          {/* ✅ INFORMATIONS BOUTIQUE MODERNES */}
          <TextField 
            margin="normal" 
            fullWidth 
            label="Nom de la boutique" 
            name="shopName" 
            value={formData.shopName} 
            onChange={handleChange} 
            required 
          />
          <TextField 
            margin="normal" 
            fullWidth 
            multiline 
            rows={3}
            label="Description de la boutique" 
            name="shopDescription" 
            value={formData.shopDescription} 
            onChange={handleChange} 
            required 
          />
          
          <TextField
            select
            margin="normal"
            fullWidth
            label="Type de business"
            name="businessType"
            value={formData.businessType}
            onChange={handleChange}
            required
          >
            {businessTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </TextField>

          <Autocomplete
            multiple
            options={businessCategories}
            value={formData.businessCategories}
            onChange={(_, newValue) => setFormData(prev => ({ ...prev, businessCategories: newValue }))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip variant="outlined" label={option} {...getTagProps({ index })} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Catégories de produits" placeholder="Sélectionner catégories" margin="normal" fullWidth />
            )}
          />

          <TextField 
            margin="normal" 
            fullWidth 
            label="Ville principale" 
            name="city" 
            value={formData.businessAddress.city} 
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              businessAddress: { ...prev.businessAddress, city: e.target.value }
            }))} 
          />
          <TextField 
            margin="normal" 
            fullWidth 
            label="Notes administratives" 
            name="notes" 
            value={formData.notes || ''} 
            onChange={handleChange} 
          />

          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography>CNI 1</Typography>
            <input type="file" onChange={(e) => handleFileChange(e, 'cni')} accept="image/*" />
          </Box>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography>CNI 2</Typography>
            <input type="file" onChange={(e) => handleFileChange(e, 'cni2')} accept="image/*" />
          </Box>
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography>Selfie</Typography>
            <input type="file" onChange={(e) => handleFileChange(e, 'selfie')} accept="image/*" />
          </Box>

          {/* ✅ UPLOAD LOGO BOUTIQUE */}
          <Box sx={{ mt: 2, mb: 1, p: 2, border: '1px dashed #ddd', borderRadius: 2 }}>
            <Typography variant="subtitle1" gutterBottom>🏪 Logo Boutique</Typography>
            <input type="file" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setShopLogoFile(e.target.files[0]);
              }
            }} accept="image/*" />
            {formData.shopLogo && (
              <Box sx={{ mt: 1 }}>
                <img src={formData.shopLogo} alt="Logo" width={60} height={60} style={{borderRadius: '8px', objectFit: 'cover'}} />
              </Box>
            )}
          </Box>

          {/* ✅ DOCUMENTS LÉGAUX */}
          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography>📄 Licence Commerciale</Typography>
            <input type="file" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setBusinessLicenseFile(e.target.files[0]);
              }
            }} accept="image/*,application/pdf" />
            {formData.verificationDocuments?.businessLicense && (
              <img src={formData.verificationDocuments.businessLicense} alt="Licence" width={40} height={40} style={{marginLeft: 8, objectFit: 'cover', borderRadius: 4}} />
            )}
          </Box>

          <Box sx={{ mt: 1, mb: 1 }}>
            <Typography>🧾 Document Fiscal</Typography>
            <input type="file" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setTaxDocumentFile(e.target.files[0]);
              }
            }} accept="image/*,application/pdf" />
            {formData.verificationDocuments?.taxDocument && (
              <img src={formData.verificationDocuments.taxDocument} alt="Fiscal" width={40} height={40} style={{marginLeft: 8, objectFit: 'cover', borderRadius: 4}} />
            )}
          </Box>

          {/* ✅ VÉRIFICATION MODERNE */}
          <Box sx={{ mt: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.verificationDocuments?.isVerified || false}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    verificationDocuments: {
                      ...prev.verificationDocuments,
                      isVerified: e.target.checked
                    }
                  }))}
                />
              }
              label="Documents vérifiés"
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isTopRated}
                  onChange={(e) => setFormData(prev => ({ ...prev, isTopRated: e.target.checked }))}
                />
              }
              label="Top Rated (👑)"
            />
          </Box>

          <Box sx={{ mt: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                />
              }
              label="Featured (⭐)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Annuler</Button>
          <Button onClick={handleSave}>{selectedVendeur ? 'Enregistrer' : 'Ajouter'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Sélectionner un utilisateur</DialogTitle>
        <DialogContent>
          <TextField fullWidth margin="normal" label="Rechercher" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
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

export default VendeurComponent;
