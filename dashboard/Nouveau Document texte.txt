import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

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
  photoArticle?: string; // Assuming you have an image URL or base64 string
  categorie?: string;    // Assuming you have a category for the article
}

const Article: React.FC = () => {
  const [articles, setArticles] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [newArticle, setNewArticle] = useState<Item>({
    _id: '',
    nomArticle: '',
    prixArticle: '',
    quantiteArticle: 0,
    photoArticle: '',
    categorie: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/articles', { mode: 'cors' });
        const data = await response.json();
        console.log({ data });
        setArticles(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewArticle({ ...newArticle, [name]: value });
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/article', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newArticle),
      });

      if (response.ok) {
        const createdArticle = await response.json();
        setArticles([...articles, createdArticle]);
        handleClose();
      } else {
        console.error('Failed to create article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
    }
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
                  <StyledTableCell>{item.categorie || 'N/A'}</StyledTableCell>
                  <StyledTableCell>
                    {/* Add action buttons like edit, delete, etc. */}
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Modal for adding a new article */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Ajouter Un Nouveau Article</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            name="nomArticle"
            label="Nom Article"
            type="text"
            fullWidth
            variant="outlined"
            value={newArticle.nomArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="prixArticle"
            label="Prix Article"
            type="text"
            fullWidth
            variant="outlined"
            value={newArticle.prixArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="quantiteArticle"
            label="Quantité Article"
            type="number"
            fullWidth
            variant="outlined"
            value={newArticle.quantiteArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="photoArticle"
            label="Photo Article"
            type="text"
            fullWidth
            variant="outlined"
            value={newArticle.photoArticle}
            onChange={handleInputChange}
          />
          <TextField
            margin="dense"
            name="categorie"
            label="Catégorie"
            type="text"
            fullWidth
            variant="outlined"
            value={newArticle.categorie}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="secondary">
            Annuler
          </Button>
          <Button onClick={handleSubmit} color="primary">
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Article;
