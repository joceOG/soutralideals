import React, { useEffect, useState } from 'react';
import { Box, Typography, Fab } from '@mui/material';
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

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Groupes
      </Typography>
      <Typography variant="body1">
        Liste des Groupes
      </Typography>

      <Box sx={{ mt: 2, mb: 2 }}>
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
                    {/* Add actions here */}
                  </StyledTableCell>
                </StyledTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
      
      <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1200 }}>
        <Fab color="secondary" aria-label="add">
          <AddIcon />
        </Fab>
      </Box>
    </div>
  );
};

export default Groupe;