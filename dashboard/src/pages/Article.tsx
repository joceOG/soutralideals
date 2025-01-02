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
  Alert,
} from '@mui/material';
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
import { styled } from '@mui/material/styles';

// Styled components
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
  const [selectedCategorie, setSelectedCategorie] = useState<string>('');
  const [newArticle, setNewArticle] = useState<Omit<Item, 'photoArticle'>>({
    _id: '',
    nomArticle: '',
    prixArticle: '',
    quantiteArticle: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Omit<Item, 'photoArticle'>>({
    _id: '',
    nomArticle: '',
    prixArticle: '',
    quantiteArticle: 0,
  });

  // Fetch articles and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const articleResponse = await axios.get('http://localhost:3000/api/articles');
        setArticles(articleResponse.data);

        const categorieResponse = await axios.get('http://localhost:3000/api/categorie');
        const options = categorieResponse.data.map((cat: any) => ({
          label: cat.nomcategorie,
          value: cat._id,
        }));
        setCategorie(options);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleClickOpen = () => setOpen(true);

  const handleClose = () => {
    setOpen(false);
    setIsEditMode(false);
    setNewArticle({ _id: '', nomArticle: '', prixArticle: '', quantiteArticle: 0 });
    setSelectedFile(null);
    setSelectedCategorie('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const articleData = isEditMode ? currentArticle : newArticle;
    const updatedData = { ...articleData, [name]: value };

    if (isEditMode) setCurrentArticle(updatedData);
    else setNewArticle(updatedData);
  };

  const handleSubmit = async () => {
    const articleData = isEditMode ? currentArticle : newArticle;
    const formData = new FormData();

    formData.append('nomArticle', articleData.nomArticle);
    formData.append('prixArticle', articleData.prixArticle);
    formData.append('quantiteArticle', articleData.quantiteArticle.toString());
    formData.append('categorie', selectedCategorie);

    if (selectedFile) formData.append('photoArticle', selectedFile);


    const url = isEditMode
      ? `http://localhost:3000/api/article/${currentArticle._id}`
      : 'http://localhost:3000/api/article';

    const method = isEditMode ? 'put':'post';

    try {
      const response = await axios({
        method,
        url,
        data: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedArticle = response.data;
      const updatedArticles = isEditMode
        ? articles.map((item) => (item._id === updatedArticle._id ? updatedArticle : item))
        : [...articles, updatedArticle];

      setArticles(updatedArticles);
      setAlertMessage(isEditMode ? 'Article mis à jour avec succès' : 'Article ajouté avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'article:', error);
      setAlertMessage('Erreur lors de la sauvegarde de l\'article');
    } finally {
      setOpenSnackbar(true);
      handleClose();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
      try {
        await axios.delete(`http://localhost:3000/api/article/${id}`);
        setArticles(articles.filter((item) => item._id !== id));
        setAlertMessage('Article supprimé avec succès');
      } catch (error) {
        console.error('Failed to delete article:', error);
        setAlertMessage('Échec de la suppression de l\'article');
      } finally {
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
    setSelectedCategorie(article?.categorie?._id || '');
    setSelectedFile(null);
    setIsEditMode(true);
    setOpen(true);
  };

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Articles
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
                  <StyledTableCell>{index + 1}</StyledTableCell>
                  <StyledTableCell>{item.nomArticle}</StyledTableCell>
                  <StyledTableCell>{item.prixArticle}</StyledTableCell>
                  <StyledTableCell>{item.quantiteArticle}</StyledTableCell>
                  <StyledTableCell>
                    {item.photoArticle ? (
                      <img src={item.photoArticle} alt={item.nomArticle} width={50} />
                    ) : (
                      'No Image'
                    )}
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
            fullWidth
            variant="standard"
            name="nomArticle"
            value={isEditMode ? currentArticle.nomArticle : newArticle.nomArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Prix Article"
            fullWidth
            variant="standard"
            name="prixArticle"
            value={isEditMode ? currentArticle.prixArticle : newArticle.prixArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Quantité Article"
            fullWidth
            variant="standard"
            type="number"
            name="quantiteArticle"
            value={isEditMode ? currentArticle.quantiteArticle : newArticle.quantiteArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            label="Catégorie"
            select
            fullWidth
            value={selectedCategorie}
            onChange={(e) => setSelectedCategorie(e.target.value)}
          >
            {categorie.map((cat) => (
              <MenuItem key={cat.value} value={cat.value}>
                {cat.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            component="label"
            sx={{ mt: 2 }}
          >
            {selectedFile ? 'Changer La Photo' : 'Télécharger Une Photo'}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Annuler
          </Button>
          <Button onClick={handleSubmit} color="primary">
            {isEditMode ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={alertMessage.includes('succès') ? 'success' : 'error'}
        >
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Article;
