import React, { FC, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import FlexLogo from './flexibleImage/FlexLogo'; 
import logo from '../assets/logo.png';
import iconeprestataire from '../assets/iconeprestataire.png';
//import Box from '@mui/material/Box';
import {Row, Col, Grid, Container } from 'rsuite';
import Button, { ButtonProps } from '@mui/material/Button/Button';
import { styled } from '@mui/material/styles';
import SearchField from '../components/SearchField';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import { Box, Stack, Grid } from '@mui/material';
import FlexibleImagePrestataire from './flexibleImage/FlexibleImagePrestataire';
import axios from 'axios';



interface Item {
  nomcategorie: string;
  data: [];
}


const Navbar: FC = () => {
  const [showNavbar, setShowNavbar] = useState<boolean>(false);
  const [anchorE1, setAnchorE1] = useState<HTMLElement | null>(null);
  const [anchorE2, setAnchorE2] = useState<HTMLElement | null>(null);
  const [anchorE3, setAnchorE3] = useState<HTMLElement | null>(null);
  const [anchorE4, setAnchorE4] = useState<HTMLElement | null>(null);

  const handleShowNavbar = (): void => {
    setShowNavbar(!showNavbar);
  };

  const ColorButton = styled(Button)<ButtonProps>(({ theme }) => ({
    height: 30,
    width: 170,
    color: theme.palette.secondary.contrastText,
    borderRadius: 45,
    backgroundColor: theme.palette.secondary.main,
    '&:hover': {
      backgroundColor: theme.palette.primary.main,
    },
  }));

  const handlePopoverOpen1 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE1(event.currentTarget);
  };

  const handlePopoverClose1 = () => {
    setAnchorE1(null);
  };

  const handlePopoverOpen2 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE2(event.currentTarget);
  };

  const handlePopoverClose2 = () => {
    setAnchorE2(null);
  };

  const handlePopoverOpen3 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE3(event.currentTarget);
  };

  const handlePopoverClose3 = () => {
    setAnchorE3(null);
  };

  const handlePopoverOpen4 = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorE4(event.currentTarget);
  };

  const handlePopoverClose4 = () => {
    setAnchorE4(null);
  };

  const open1 = Boolean(anchorE1);
  const open2 = Boolean(anchorE2);
  const open3 = Boolean(anchorE3);
  const open4 = Boolean(anchorE4);

  const navigate = useNavigate();

 function toConnexion( ) {
  navigate('/Connexion');
  }

  function toHome( ) {
    navigate('/');
    }


  const [categories, setCategorie] = useState<Item[]>([]);

useEffect(() => {
  // Effect hook pour récupérer les données de l'API
  const fetchData = async () => {
    let data = '';
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'http://localhost:3000/api/categorieServices',
    headers: { },
    data : data
  };
  
  axios.request(config)
  .then((response) => {
    console.log(JSON.stringify(response.data));
    setCategorie(response.data.categories);
  })
  .catch((error) => {
    console.log(error);
  });

  };

  fetchData();
}, []);

if (!categories) return null;

  return (
    <nav className="navbar">
      <div className="container2">
        <Row className='rowNav'>
        
          <Col  style={{ paddingRight: 20, paddingTop: 46, paddingLeft: 35, paddingBottom: 20, height: 120 }}>
          <a onClick={() => { toHome() }}> 
          <FlexLogo src={logo} alt='Logo' />
          </a>
          </Col>
          <Col  style={{ paddingRight: 20, paddingTop: 50, paddingLeft: 20, paddingBottom: 20, height: 120 }}>
            <ColorButton><b><h6>Déposer une annonce</h6></b></ColorButton>
          </Col>
          <Col  style={{ paddingRight: 20, paddingLeft: 20, paddingTop: 50, paddingBottom: 20, height: 120 }}>
            <SearchField onSearch={(query: string) => console.log('Search ', query)} />
          </Col>
          <Col  style={{ paddingRight: 20, paddingLeft: 20, paddingTop: 30, paddingBottom: 20, height: 120 }}>
          </Col>
          <Col style={{ paddingRight: 20, paddingTop: 50, paddingLeft: 20, paddingBottom: 20, height: 120 }}>
          <a onClick={() => { toConnexion() }}> 
               <ColorButton><b><h6>Se Connecter</h6></b></ColorButton>
               </a>
          </Col>
        </Row>
        <div className="menu-icon" onClick={handleShowNavbar}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
          >
            <MenuIcon />
          </IconButton>
        </div>
      </div>
      <br />
      <div className="container">
        <div className={`nav-elements  ${showNavbar && 'active'}`}>
          <ul>
            <li>
              <NavLink to="/">
                <Typography
                  aria-owns={open1 ? 'mouse-over-popover1' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen1}
                  onMouseLeave={handlePopoverClose1}
                >
                 <h3><b>Nos métiers/services</b> </h3>
                </Typography>
                <Popover
                  id="mouse-over-popover1"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open1}
                  anchorEl={anchorE1}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  PaperProps={{
                    style: { width: '100%' },
                  }}
                  onClose={handlePopoverClose1}
                  disableRestoreFocus
                >  
            <Box>
              

              <Stack direction="row" spacing={2}>
                <div className='popUp'>
                   <div className='popUpIn'>
                        <FlexibleImagePrestataire src={iconeprestataire} alt='Prestataire'  ></FlexibleImagePrestataire>
                    <div className='popInText'>
                       <b>Prestations de Services</b>
                    </div>
                   </div>
                </div>
                <div>
               <Grid container spacing={{ xs: 2, md: 3 }} columns={{ xs: 4, sm: 8, md: 12 }}>
                  {Array.from(categories).map((itemcat ,  index1) => (
                    <Grid xs={2} sm={4} md={4} key={index1}>
                      <div>
                        <b> <h2> { itemcat.nomcategorie } </h2> </b>
                        { (itemcat.data).map( ( data, index ) => (
                        <h4 key={index}>    
                            {data}                    
                        </h4>
                      ))} 
                      </div>
                    </Grid>
                  ))}
                </Grid> 
                </div>
              </Stack>

              </Box>
                  
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Reservations">
                <Typography
                  aria-owns={open2 ? 'mouse-over-popover2' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen2}
                  onMouseLeave={handlePopoverClose2}
                >
                  <h3><b>Freelance/corporate</b> </h3>
                </Typography>
                <Popover
                  id="mouse-over-popover2"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open2}
                  anchorEl={anchorE2}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose2}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Services">
                <Typography
                  aria-owns={open3 ? 'mouse-over-popover3' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen3}
                  onMouseLeave={handlePopoverClose3}
                >
                  <h3> <b>  E-marché </b></h3>
                </Typography>
                <Popover
                  id="mouse-over-popover3"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open3}
                  anchorEl={anchorE3}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose3}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>

            <li>
              <NavLink to="/Apropos">
                <Typography
                  aria-owns={open4 ? 'mouse-over-popover4' : undefined}
                  aria-haspopup="true"
                  onMouseEnter={handlePopoverOpen4}
                  onMouseLeave={handlePopoverClose4}
                >
                  <h3> <b> Autre </b></h3>
                </Typography>
                <Popover
                  id="mouse-over-popover4"
                  sx={{
                    pointerEvents: 'none',
                  }}
                  open={open4}
                  anchorEl={anchorE4}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                  }}
                  onClose={handlePopoverClose4}
                  disableRestoreFocus
                >
                  <Typography sx={{ p: 1 }}>I use Popover.</Typography>
                </Popover>
              </NavLink>
            </li>
          </ul>
        </div>
        <br />
      </div>
    </nav>
  );
};

export default Navbar;
function fetchData() {
  throw new Error('Function not implemented.');
}

