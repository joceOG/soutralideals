import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  IconButton, 
  MenuItem, 
  Snackbar, 
  Alert 
} from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

// Styled components for table cells and rows
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

// Interface for Item
interface Item {
  _id: string; 
  nomArticle: string;
  prixArticle: string;
  quantiteArticle: number;
  photoArticle?: string;
  categorie?: {
    _id: string;
    nomcategorie: string;
  };
}

interface Option {
  _id: string;
  label: string;
  value: string;
}

const Article: React.FC = () => {
  const [articles, setArticles] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [categorie, setCategorie] = useState<Option[]>([]);
  const [selectedCategorie, setSelectedCategorie] = useState<string | ''>('');
  const [newArticle, setNewArticle] = useState<Omit<Item, 'photoArticle' | 'categorie'>>({
    _id: '',
    nomArticle: '',
    prixArticle: '',
    quantiteArticle: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Omit<Item, 'photoArticle' | 'categorie'>>({
    _id: '',
    nomArticle: '',
    prixArticle: '',
    quantiteArticle: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/articles', { 
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setArticles(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/categorie');
        const options = response.data.map((cat: any) => ({
          label: cat.nomcategorie,
          value: cat._id,
        }));
        setCategorie(options);
      } catch (error) {
        console.error(error);
      }
    };
    fetchCategories();
  }, []);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setIsEditMode(false);
    setNewArticle({ _id: '', nomArticle: '', prixArticle: '', quantiteArticle: 0 });
    setSelectedFile(null);
    setSelectedCategorie('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isEditMode) {
      setCurrentArticle({ ...currentArticle, [name]: value });
    } else {
      setNewArticle({ ...newArticle, [name]: value });
    }
  };

  const handleSubmit = async () => {
    const formData = new FormData();
    const articleData = isEditMode ? currentArticle : newArticle;

    formData.append('nomArticle', articleData.nomArticle);
    formData.append('prixArticle', articleData.prixArticle);
    formData.append('quantiteArticle', articleData.quantiteArticle.toString());
    formData.append('categorie', selectedCategorie || '');

    if (selectedFile) {
      formData.append('photoArticle', selectedFile);
    }

    try {
      let response;
      if (isEditMode) {
        response = await axios.put(`http://localhost:3000/api/article/${currentArticle._id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('Service mis à jour avec succès!');
      } else {
        response = await axios.post('http://localhost:3000/api/article', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('Service créé avec succès!');
      }

      if (response.status === 200 || response.status === 201) {
        const updatedArticle = response.data;
        if (isEditMode) {
          setArticles(articles.map(item => item._id === updatedArticle._id ? updatedArticle : item));
        } else {
          setArticles([...articles, updatedArticle]);
        }
        handleClose();
        setAlertMessage(isEditMode ? 'Article mis à jour avec succès' : 'Article ajouté avec succès');
        setOpenSnackbar(true);
      } else {
        setAlertMessage('Échec de l\'ajout de l\'article');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Error saving article:', error);
      setAlertMessage('Erreur lors de la sauvegarde de l\'article');
      setOpenSnackbar(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/article/${id}`);
        setAlertMessage('Article supprimé avec succès');
        setOpenSnackbar(true);
        setArticles(articles.filter((item: { _id: string; }) => item._id !== id));
      } catch (error) {
        console.error('Failed to delete article:', error);
        setAlertMessage('Échec de la suppression de l\'article');
        setOpenSnackbar(true);
      }
    }
  };

  const handleEdit = (article: Item) => {
    setCurrentArticle({
      _id: article._id,
      nomArticle: article.nomArticle,
      prixArticle: article.prixArticle,
      quantiteArticle: article.quantiteArticle,
    });
    setSelectedCategorie(article.categorie?._id || '');
    setSelectedFile(null);
    setIsEditMode(true);
    setOpen(true); // Open the modal
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Articles
      </Typography>
      <Typography variant="body1">
        Liste des Articles
      </Typography>
      <Box sx={{ mt: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleClickOpen}>
          Ajouter Un Nouveau Article
        </Button>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>#</StyledTableCell>
                <StyledTableCell>Nom Article</StyledTableCell>
                <StyledTableCell>Prix Article</StyledTableCell>
                <StyledTableCell>Quantité Article</StyledTableCell>
                <StyledTableCell>Photo Article</StyledTableCell>
                <StyledTableCell>Catégorie</StyledTableCell>
                <StyledTableCell>Action</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articles.map((item, index) => (
                <StyledTableRow key={item._id}>
                  <StyledTableCell component="th" scope="row">
                    {index + 1}
                  </StyledTableCell>
                  <StyledTableCell>{item.nomArticle}</StyledTableCell>
                  <StyledTableCell>{item.prixArticle}</StyledTableCell>
                  <StyledTableCell>{item.quantiteArticle}</StyledTableCell>
                  <StyledTableCell>
                    {item.photoArticle ? <img src={item.photoArticle} alt={item.nomArticle} width={50} /> : 'No Image'}
                  </StyledTableCell>
                  <StyledTableCell>{item.categorie?.nomcategorie || 'N/A'}</StyledTableCell>
                  <StyledTableCell>
                    <IconButton color="primary" onClick={() => handleEdit(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(item._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{isEditMode ? 'Modifier Article' : 'Ajouter Un Nouveau Article'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom Article"
            type="text"
            fullWidth
            variant="standard"
            name="nomArticle"
            value={isEditMode ? currentArticle.nomArticle : newArticle.nomArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Prix Article"
            type="text"
            fullWidth
            variant="standard"
            name="prixArticle"
            value={isEditMode ? currentArticle.prixArticle : newArticle.prixArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Quantité Article"
            type="number"
            fullWidth
            variant="standard"
            name="quantiteArticle"
            value={isEditMode ? currentArticle.quantiteArticle : newArticle.quantiteArticle}
            onChange={handleInputChange}
          />
          <TextField
            select
            label="Catégorie"
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
            fullWidth
            margin="dense"
          >
            {categorie.map((cat) => (
              <MenuItem key={cat._id} value={cat._id}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            component="label"
            sx={{ mt: 2 }}
          >
            Upload File
            <input
              type="file"
              hidden
              onChange={(e) => setSelectedFile(e.target.files![0])}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Annuler</Button>
          <Button onClick={handleSubmit} color="primary">
            {isEditMode ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Article;
