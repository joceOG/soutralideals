import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import axios from 'axios';
import { styled } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';



interface Item {
  _id: string;
  nomgroupe: string;
}

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
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

const Groupe: React.FC = () => {

  const [groupe, setGroupe] = useState<Item[]>([]);

  useEffect(() => {
    // Effect hook pour récupérer les données de l'API
    const fetchData = async () => {
      let data = '';
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'http://localhost:3000/api/groupe',
      headers: { },
      data : data
    };
    
    axios.request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
      setGroupe(response.data);
    })
    .catch((error) => {
      console.log(error);
    });
  
    };
  
    fetchData();
  }, []);    


if (!groupe) return null;




  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Groupes
      </Typography>
      <Typography variant="body1">
        Liste des Groupes
      </Typography>

      <Box  sx={{ mt: 2, mb: 2 }}>
      <TableContainer component={Paper}>
      <Table sx={{ minWidth: 700 }} aria-label="customized table">
        <TableHead>
          <TableRow>
            <StyledTableCell>#</StyledTableCell>
            <StyledTableCell > Groupe</StyledTableCell>
            <StyledTableCell > Identifiant</StyledTableCell>
            <StyledTableCell > Action</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
        { groupe.map( (item , index ) => (
            <StyledTableRow key={index}>
              <StyledTableCell component="th" scope="row">
                {index}
              </StyledTableCell>
              <StyledTableCell >{item.nomgroupe}</StyledTableCell>
              <StyledTableCell >{item._id}</StyledTableCell>
              <StyledTableCell >

              </StyledTableCell>
            </StyledTableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </Box>


    </div>
  );
};

export default Groupe;