import React, { useEffect, useState, ForwardedRef } from 'react';
import {
  Box, Typography, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, TextField, Button, Alert, Snackbar,
  InputAdornment, Chip, Divider, alpha, Tooltip, Zoom,
  TablePagination, Card
} from '@mui/material';
import axios from 'axios';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { motion, AnimatePresence } from 'framer-motion';

// Styled components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    padding: '12px 16px',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    border: 'none',
    padding: '12px 16px',
    transition: 'all 0.2s ease-in-out',
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  position: 'relative',
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.02),
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.primary.main, 0.04),
    boxShadow: theme.palette.mode === 'dark'
      ? `inset 0 0 5px ${alpha(theme.palette.primary.main, 0.2)}`
      : `inset 0 0 5px ${alpha(theme.palette.primary.main, 0.1)}`,
    transform: 'translateY(-2px)',
    '& .action-buttons': {
      opacity: 1,
    },
  },
  transition: 'all 0.3s ease',
<<<<<<< HEAD
}));

const SearchBox = styled(Paper)(({ theme }) => ({
  padding: '2px 8px',
  display: 'flex',
  alignItems: 'center',
  width: 300,
  borderRadius: theme.shape.borderRadius * 4,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.white, 0.9),
  boxShadow: theme.palette.mode === 'dark'
    ? `inset 2px 2px 5px ${alpha(theme.palette.common.black, 0.5)}, 
       inset -2px -2px 5px ${alpha(theme.palette.common.white, 0.1)}`
    : `inset 2px 2px 5px ${alpha(theme.palette.common.black, 0.05)}, 
       inset -2px -2px 5px ${alpha(theme.palette.common.white, 0.9)}`,
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? `inset 2px 2px 8px ${alpha(theme.palette.common.black, 0.6)}, 
         inset -2px -2px 8px ${alpha(theme.palette.common.white, 0.15)}`
      : `inset 2px 2px 8px ${alpha(theme.palette.common.black, 0.1)}, 
         inset -2px -2px 8px ${alpha(theme.palette.common.white, 1)}`
  },
  transition: 'all 0.3s ease',
}));

const NeumorphicCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2),
  boxShadow: theme.palette.mode === 'dark'
    ? `5px 5px 10px ${alpha(theme.palette.common.black, 0.5)}, 
       -5px -5px 10px ${alpha(theme.palette.common.white, 0.05)}`
    : `5px 5px 10px ${alpha(theme.palette.common.black, 0.05)}, 
       -5px -5px 10px ${alpha(theme.palette.common.white, 0.8)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? `8px 8px 16px ${alpha(theme.palette.common.black, 0.6)}, 
         -8px -8px 16px ${alpha(theme.palette.common.white, 0.08)}`
      : `8px 8px 16px ${alpha(theme.palette.common.black, 0.08)}, 
         -8px -8px 16px ${alpha(theme.palette.common.white, 1)}`
  },
=======
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
}));

const SearchBox = styled(Paper)(({ theme }) => ({
  padding: '2px 8px',
  display: 'flex',
  alignItems: 'center',
  width: 300,
  borderRadius: theme.shape.borderRadius * 4,
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : alpha(theme.palette.common.white, 0.9),
  boxShadow: theme.palette.mode === 'dark'
    ? `inset 2px 2px 5px ${alpha(theme.palette.common.black, 0.5)}, 
       inset -2px -2px 5px ${alpha(theme.palette.common.white, 0.1)}`
    : `inset 2px 2px 5px ${alpha(theme.palette.common.black, 0.05)}, 
       inset -2px -2px 5px ${alpha(theme.palette.common.white, 0.9)}`,
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? `inset 2px 2px 8px ${alpha(theme.palette.common.black, 0.6)}, 
         inset -2px -2px 8px ${alpha(theme.palette.common.white, 0.15)}`
      : `inset 2px 2px 8px ${alpha(theme.palette.common.black, 0.1)}, 
         inset -2px -2px 8px ${alpha(theme.palette.common.white, 1)}`
  },
  transition: 'all 0.3s ease',
}));

const NeumorphicCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.8) : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(2),
  boxShadow: theme.palette.mode === 'dark'
    ? `5px 5px 10px ${alpha(theme.palette.common.black, 0.5)}, 
       -5px -5px 10px ${alpha(theme.palette.common.white, 0.05)}`
    : `5px 5px 10px ${alpha(theme.palette.common.black, 0.05)}, 
       -5px -5px 10px ${alpha(theme.palette.common.white, 0.8)}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.palette.mode === 'dark'
      ? `8px 8px 16px ${alpha(theme.palette.common.black, 0.6)}, 
         -8px -8px 16px ${alpha(theme.palette.common.white, 0.08)}`
      : `8px 8px 16px ${alpha(theme.palette.common.black, 0.08)}, 
         -8px -8px 16px ${alpha(theme.palette.common.white, 1)}`
  },
}));


// Interface for Item
interface Item {
  _id: string;
  nomgroupe: string;
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  _categoriesCount?: number;
}

type SortOrder = 'asc' | 'desc';

=======
  // Virtuel - sera calculé dynamiquement
<<<<<<< HEAD
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
  _categoriesCount?: number;
}

type SortOrder = 'asc' | 'desc';

<<<<<<< HEAD
// Animations variants
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
  _categoriesCount?: number;
}

// Type pour le tri
type SortOrder = 'asc' | 'desc';

// Animations variants
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { 
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
      type: 'spring' as const,  // cast to literal type to satisfy TS
=======
      type: 'spring', 
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
      type: 'spring' as const,  // cast to literal type to satisfy TS
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
      type: 'spring' as const,  // cast to literal type to satisfy TS
=======
      type: 'spring', 
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
      stiffness: 100,
      damping: 12
    }
  }
};

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
// Main component
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
=======
// Main component
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
const Groupe: React.FC = () => {
  const [groupe, setGroupe] = useState<Item[]>([]);
  const [filteredGroupe, setFilteredGroupe] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [nomgroupe, setNomgroupe] = useState('');
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<'nomgroupe' | '_id'>('nomgroupe');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
=======
  // Search, pagination and sorting states
<<<<<<< HEAD
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortField, setSortField] = useState<'nomgroupe' | '_id'>('nomgroupe');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
<<<<<<< HEAD
  
  // États pour la pagination et le tri déjà définis au-dessus
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  // Sorting states
  const [sortField, setSortField] = useState<'nomgroupe' | '_id'>('nomgroupe');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // États pour la pagination et le tri déjà définis au-dessus
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3000/api/groupe');
        setGroupe(response.data);
        setFilteredGroupe(response.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  
  // Appliquer la recherche, le tri et la pagination
  useEffect(() => {
    // Filter
    let result = [...groupe];
    if (searchQuery) {
      result = result.filter(item => 
        item.nomgroupe.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    result.sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredGroupe(result);
  }, [groupe, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    let result = [...groupe];
    if (searchQuery) {
      result = result.filter(item => 
        item.nomgroupe.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredGroupe(result);
  }, [groupe, searchQuery, sortField, sortOrder]);

  useEffect(() => {
    let result = [...groupe];
    if (searchQuery) {
      result = result.filter(item => 
        item.nomgroupe.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    result.sort((a, b) => {
      const valueA = a[sortField];
      const valueB = b[sortField];
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredGroupe(result);
  }, [groupe, searchQuery, sortField, sortOrder]);

  const handleClickOpen = () => {
    setOpen(true);
    setNomgroupe('');
    setUpdateId(null);
  };

  const handleClickOpenUpdate = (item: Item) => {
    setOpen(true);
    setNomgroupe(item.nomgroupe);
    setUpdateId(item._id);
  };

  const handleClose = () => {
    setOpen(false);
    setNomgroupe('');
    setUpdateId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    try {
      if (updateId) {
        await axios.put(`http://localhost:3000/api/groupe/${updateId}`, { nomgroupe });
        setAlertMessage('Groupe mis à jour avec succès');
      } else {
        await axios.post('http://localhost:3000/api/groupe', { nomgroupe });
        setAlertMessage('Groupe ajouté avec succès');
      }
  
      setOpenSnackbar(true);
      const response = await axios.get('http://localhost:3000/api/groupe');
      setGroupe(response.data);
    } catch (error) {
      console.error('Failed to submit form:', error);
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce groupe ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/groupe/${id}`);
        setAlertMessage('Groupe supprimé avec succès');
        setOpenSnackbar(true);
        setGroupe(groupe.filter((item) => item._id !== id));
      } catch (error) {
        console.error('Failed to delete group:', error);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  // Pagination handlers
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
=======
  // Pagination handlers
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  // Sorting handler
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
=======
  // Sorting handler
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  const handleSort = (field: 'nomgroupe' | '_id') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  const currentGroups = filteredGroupe.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Correct forwardRef with proper typing for Dialog transitions
  const DialogTransition = React.forwardRef<HTMLDivElement, any>((props, ref) => (
    <motion.div
      ref={ref}
      {...props}
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 15 }}
    />
  ));

  const SnackbarTransition = React.forwardRef<HTMLDivElement, any>((props, ref) => (
    <motion.div
      ref={ref}
      {...props}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", damping: 15 }}
    />
  ));

=======
  // Get current rows for pagination
  const currentGroups = filteredGroupe.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
  const currentGroups = filteredGroupe.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Correct forwardRef with proper typing for Dialog transitions
  const DialogTransition = React.forwardRef<HTMLDivElement, any>((props, ref) => (
    <motion.div
      ref={ref}
      {...props}
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", damping: 15 }}
    />
  ));

  const SnackbarTransition = React.forwardRef<HTMLDivElement, any>((props, ref) => (
    <motion.div
      ref={ref}
      {...props}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ type: "spring", damping: 15 }}
    />
  ));

>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h4" component={motion.h4} 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          Groupes
        </Typography>
        
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
        {/* Barre de recherche */}
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
=======
        {/* Barre de recherche */}
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
        <SearchBox>
          <IconButton sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Rechercher un groupe..."
            inputProps={{ 'aria-label': 'rechercher un groupe' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBox>
      </Box>
<<<<<<< HEAD

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <NeumorphicCard>
          <Box mb={2} px={2} display="flex" alignItems="center">
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              Liste des Groupes
            </Typography>
            <Box flexGrow={1} />
            <Chip 
              icon={<FolderIcon />} 
              label={`${filteredGroupe.length} groupe${filteredGroupe.length > 1 ? 's' : ''}`} 
              color="primary" 
              variant="outlined" 
              size="small" 
            />
          </Box>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box p={3} textAlign="center">
              <Typography>Chargement des groupes...</Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 700 }} aria-label="customized table">
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>#</StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('nomgroupe')}>
                          Groupe
                          {sortField === 'nomgroupe' && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.5 }} 
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              style={{ marginLeft: '5px' }}
                            >
                              {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                            </motion.span>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('_id')}>
                          Identifiant
                          {sortField === '_id' && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.5 }} 
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              style={{ marginLeft: '5px' }}
                            >
                              {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                            </motion.span>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>Action</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {currentGroups.map((item, index) => (
                        <motion.tr
                          key={item._id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -10 }}
                          style={{ originX: 0 }}
                        >
                          <StyledTableRow>
                            <StyledTableCell component="th" scope="row">
                              {page * rowsPerPage + index + 1}
                            </StyledTableCell>
                            <StyledTableCell>
                              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                                {item.nomgroupe}
                              </motion.div>
                            </StyledTableCell>
                            <StyledTableCell>{item._id}</StyledTableCell>
                            <StyledTableCell>
                              <Box className="action-buttons" sx={{ opacity: 0, transition: 'opacity 0.3s ease' }}>
                                <Tooltip title="Modifier" TransitionComponent={Zoom} arrow>
                                  <IconButton color="primary" onClick={() => handleClickOpenUpdate(item)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer" TransitionComponent={Zoom} arrow>
                                  <IconButton color="error" onClick={() => handleDelete(item._id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </StyledTableCell>
                          </StyledTableRow>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredGroupe.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </>
          )}
        </NeumorphicCard>
      </motion.div>

      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Fab 
            color="secondary" 
            aria-label="add" 
            onClick={handleClickOpen}
          >
            <AddIcon />
          </Fab>
        </motion.div>
      </Box>

      <AnimatePresence>
        {open && (
          <Dialog
            onClose={handleClose}
            open={open}
            fullWidth
            TransitionComponent={DialogTransition}
          >
            <DialogTitle sx={{ m: 0, p: 2 }}>
              {updateId ? 'Mettre à jour le groupe' : 'Ajouter un groupe'}
              <IconButton
                aria-label="close"
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'grey.500',
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <motion.form 
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TextField
                  label="Nom du Groupe"
                  variant="outlined"
                  name="nomgroupe"
                  value={nomgroupe}
                  onChange={(e) => setNomgroupe(e.target.value)}
                  fullWidth
                  margin="normal"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FolderIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <DialogActions>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="contained" color="secondary">
                      {updateId ? 'Mettre à jour' : 'Enregistrer'}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleClose} variant="outlined" color="primary">
                      Annuler
                    </Button>
                  </motion.div>
                </DialogActions>
              </motion.form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

=======

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <NeumorphicCard>
          <Box mb={2} px={2} display="flex" alignItems="center">
<<<<<<< HEAD
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              Liste des Groupes
            </Typography>
            <Box flexGrow={1} />
            <Chip 
              icon={<FolderIcon />} 
              label={`${filteredGroupe.length} groupe${filteredGroupe.length > 1 ? 's' : ''}`} 
              color="primary" 
              variant="outlined" 
              size="small" 
            />
          </Box>
          <Divider sx={{ mb: 2 }} />

          {loading ? (
            <Box p={3} textAlign="center">
              <Typography>Chargement des groupes...</Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 700 }} aria-label="customized table">
                  <TableHead>
                    <TableRow>
                      <StyledTableCell>#</StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('nomgroupe')}>
                          Groupe
                          {sortField === 'nomgroupe' && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.5 }} 
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              style={{ marginLeft: '5px' }}
                            >
                              {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                            </motion.span>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('_id')}>
                          Identifiant
                          {sortField === '_id' && (
                            <motion.span 
                              initial={{ opacity: 0, scale: 0.5 }} 
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.2 }}
                              style={{ marginLeft: '5px' }}
                            >
                              {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                            </motion.span>
                          )}
                        </Box>
                      </StyledTableCell>
                      <StyledTableCell>Action</StyledTableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {currentGroups.map((item, index) => (
                        <motion.tr
                          key={item._id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -10 }}
                          style={{ originX: 0 }}
                        >
                          <StyledTableRow>
                            <StyledTableCell component="th" scope="row">
                              {page * rowsPerPage + index + 1}
                            </StyledTableCell>
                            <StyledTableCell>
                              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                                {item.nomgroupe}
                              </motion.div>
                            </StyledTableCell>
                            <StyledTableCell>{item._id}</StyledTableCell>
                            <StyledTableCell>
                              <Box className="action-buttons" sx={{ opacity: 0, transition: 'opacity 0.3s ease' }}>
                                <Tooltip title="Modifier" TransitionComponent={Zoom} arrow>
                                  <IconButton color="primary" onClick={() => handleClickOpenUpdate(item)}>
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Supprimer" TransitionComponent={Zoom} arrow>
                                  <IconButton color="error" onClick={() => handleDelete(item._id)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </StyledTableCell>
                          </StyledTableRow>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </TableContainer>

              <TablePagination
                component="div"
                count={filteredGroupe.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
                labelRowsPerPage="Lignes par page:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
              />
            </>
          )}
        </NeumorphicCard>
      </motion.div>

=======
          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
            Liste des Groupes
          </Typography>
          <Box flexGrow={1} />
          <Chip 
            icon={<FolderIcon />} 
            label={`${filteredGroupe.length} groupe${filteredGroupe.length > 1 ? 's' : ''}`} 
            color="primary" 
            variant="outlined" 
            size="small" 
          />
        </Box>
        <Divider sx={{ mb: 2 }} />

        {loading ? (
          <Box p={3} textAlign="center">
            <Typography>Chargement des groupes...</Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} elevation={0}>
              <Table sx={{ minWidth: 700 }} aria-label="customized table">
                <TableHead>
                  <TableRow>
                    <StyledTableCell>#</StyledTableCell>
                    <StyledTableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('nomgroupe')}>
                        Groupe
                        {sortField === 'nomgroupe' && (
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{ marginLeft: '5px' }}
                          >
                            {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                          </motion.span>
                        )}
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('_id')}>
                        Identifiant
                        {sortField === '_id' && (
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }} 
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            style={{ marginLeft: '5px' }}
                          >
                            {sortOrder === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
                          </motion.span>
                        )}
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell>Action</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {currentGroups.map((item, index) => (
                      <motion.tr
                        key={item._id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, y: -10 }}
                        component={StyledTableRow}
                      >
                        <StyledTableCell component="th" scope="row">
                          {page * rowsPerPage + index + 1}
                        </StyledTableCell>
                        <StyledTableCell>
                          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                            {item.nomgroupe}
                          </motion.div>
                        </StyledTableCell>
                        <StyledTableCell>{item._id}</StyledTableCell>
                        <StyledTableCell>
                          <Box className="action-buttons">
                            <Tooltip title="Modifier" TransitionComponent={Zoom} arrow>
                              <IconButton color="primary" onClick={() => handleClickOpenUpdate(item)}>
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Supprimer" TransitionComponent={Zoom} arrow>
                              <IconButton color="error" onClick={() => handleDelete(item._id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </StyledTableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={filteredGroupe.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
            />
          </>
        )}
        </NeumorphicCard>
      </motion.div>

      {/* Floating Action Button to open the modal for adding a new group */}
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Fab 
            color="secondary" 
            aria-label="add" 
            onClick={handleClickOpen}
          >
            <AddIcon />
          </Fab>
        </motion.div>
      </Box>

<<<<<<< HEAD
      <AnimatePresence>
        {open && (
          <Dialog
            onClose={handleClose}
            open={open}
            fullWidth
            TransitionComponent={DialogTransition}
=======
      {/* Modal for adding or updating a group */}
      <AnimatePresence>
        {open && (
          <Dialog 
            onClose={handleClose} 
            open={open} 
            fullWidth
            TransitionComponent={React.forwardRef((props, ref) => (
              <motion.div
                ref={ref}
                {...props}
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 15 }}
              />
            ))}
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
          >
            <DialogTitle sx={{ m: 0, p: 2 }}>
              {updateId ? 'Mettre à jour le groupe' : 'Ajouter un groupe'}
              <IconButton
                aria-label="close"
                onClick={handleClose}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  color: 'grey.500',
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <motion.form 
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <TextField
                  label="Nom du Groupe"
                  variant="outlined"
                  name="nomgroupe"
                  value={nomgroupe}
                  onChange={(e) => setNomgroupe(e.target.value)}
                  fullWidth
                  margin="normal"
                  autoFocus
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FolderIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
                <DialogActions>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button type="submit" variant="contained" color="secondary">
                      {updateId ? 'Mettre à jour' : 'Enregistrer'}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button onClick={handleClose} variant="outlined" color="primary">
                      Annuler
                    </Button>
                  </motion.div>
                </DialogActions>
              </motion.form>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

<<<<<<< HEAD
<<<<<<< HEAD
      {/* Snackbar for success messages */}
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
      {/* Snackbar for success messages */}
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
      <AnimatePresence>
        {openSnackbar && (
          <Snackbar
            open={openSnackbar}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
            TransitionComponent={SnackbarTransition}
=======
            TransitionComponent={React.forwardRef((props, ref) => (
              <motion.div
                ref={ref}
                {...props}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: "spring", damping: 15 }}
              />
            ))}
<<<<<<< HEAD
>>>>>>> 382dd35 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
=======
            TransitionComponent={SnackbarTransition}
>>>>>>> ed23bf8 (Soutrali Dashboard V1)
=======
>>>>>>> 1a1b001 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
>>>>>>> 94cf045 (Résolution conflit sur Categorie.tsx + mise à jour du dashboard et suppression du fichier imagefrombuffer.d.ts)
          >
            <Alert 
              onClose={handleCloseSnackbar} 
              severity="success" 
              sx={{ width: '100%', boxShadow: 3 }}
              variant="filled"
            >
              {alertMessage}
            </Alert>
          </Snackbar>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Groupe;
