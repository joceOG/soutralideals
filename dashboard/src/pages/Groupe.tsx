import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Fab, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, TextField, Button, Alert, Snackbar
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
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

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

// Interface for Item
interface Item {
  _id: string;
  nomgroupe: string;
}

// Main component
const Groupe: React.FC = () => {
  const [groupe, setGroupe] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [nomgroupe, setNomgroupe] = useState('');
  const [updateId, setUpdateId] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/groupe');
        setGroupe(response.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

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
      console.error('Failed to submit form:', error);  // Log error for debugging
      if (axios.isAxiosError(error)) {
        // Handle specific axios error details
        console.error('Axios Error:', error.response?.data || error.message);
      } else {
        // Handle general error
        console.error('General Error:');
      }
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

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Groupes
      </Typography>
      <Typography variant="body1">
        Liste des Groupes
      </Typography>

      <Box sx={{ mt: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleClickOpen}>
          Ajouter Un Nouveau Group
        </Button>
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 700 }} aria-label="customized table">
            <TableHead>
              <TableRow>
                <StyledTableCell>#</StyledTableCell>
                <StyledTableCell>Groupe</StyledTableCell>
                <StyledTableCell>Identifiant</StyledTableCell>
                <StyledTableCell>Action</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupe.map((item, index) => (
                <StyledTableRow key={item._id}>
                  <StyledTableCell component="th" scope="row">
                    {index + 1}
                  </StyledTableCell>
                  <StyledTableCell>{item.nomgroupe}</StyledTableCell>
                  <StyledTableCell>{item._id}</StyledTableCell>
                  <StyledTableCell>
                    <IconButton color="primary" onClick={() => handleClickOpenUpdate(item)}>
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

      {/* Floating Action Button to open the modal for adding a new group */}
      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <Fab color="secondary" aria-label="add" onClick={handleClickOpen}>
          <AddIcon />
        </Fab>
      </Box>

      {/* Modal for adding or updating a group */}
      <Dialog onClose={handleClose} open={open} fullWidth>
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {updateId ? 'Mettre à jour le groupe' : 'Ajouter un groupe'}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <TextField
              label="Nom du Groupe"
              variant="outlined"
              name="nomgroupe"
              value={nomgroupe}
              onChange={(e) => setNomgroupe(e.target.value)}
              fullWidth
              margin="normal"
            />
            <DialogActions>
              <Button type="submit" variant="contained" color="secondary">
                {updateId ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
              <Button onClick={handleClose} variant="outlined" color="primary">
                Annuler
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>

      {/* Snackbar for success messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {alertMessage}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Groupe;
